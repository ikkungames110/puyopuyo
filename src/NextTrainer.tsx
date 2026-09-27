import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Undo2,
  Play,
  Pause,
  Eye,
  Lightbulb,
} from 'lucide-react';
import Board from './Board';
import Puyo from './Puyo';
import { SourceLinks } from './Simulator';
import {
  actionLabel,
  COLORS,
  drop,
  fits,
  landing,
  move,
  spawn,
  type Action,
  type Pair,
} from './engine';
import type { SequenceDrill } from './content';
import {
  evaluate,
  isSplit,
  replayFrames,
  witnessTurns,
  type Evaluation,
  type Frame,
  type Turn,
} from './sequence';
function PairView({ pair }: { pair: Pair }) {
  return (
    <span className="queue-pair" aria-label={`${COLORS[pair[0]]}・${COLORS[pair[1]]}`}>
      <Puyo color={pair[1]} />
      <Puyo color={pair[0]} />
    </span>
  );
}
export default function NextTrainer({
  drill: d,
  onAttempt,
  onBest,
  onNext,
}: {
  drill: SequenceDrill;
  onAttempt: (correct: boolean, seconds: number) => void;
  onBest: (n: number) => void;
  onNext: () => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]),
    [piece, setPiece] = useState(() => spawn(d.queue[0])),
    [inputs, setInputs] = useState(0);
  const [hint, setHint] = useState(false),
    [report, setReport] = useState<Evaluation | null>(null);
  const [review, setReview] = useState<{
    example: boolean;
    frames: Frame[];
    index: number;
    playing: boolean;
  } | null>(null);
  const started = useRef(Date.now());
  const board = turns.at(-1)?.result.board ?? d.board;
  const ready = turns.length === d.queue.length;
  const canMove = !ready && !report && !review && fits(board, piece);
  const reference = useMemo(() => {
    const ts = witnessTurns(d);
    return { turns: ts, report: evaluate(d, ts) };
  }, [d]);
  function act(a: Action) {
    if (!canMove) return;
    const next = move(board, piece, a);
    if (next !== piece) {
      setPiece(next);
      setInputs((n) => n + 1);
    }
  }
  function place() {
    if (!canMove) return;
    const result = drop(board, piece);
    if (!result) return;
    const target = landing(board, piece);
    setTurns([
      ...turns,
      {
        before: board,
        pair: d.queue[turns.length],
        target,
        result,
        inputs,
        split: isSplit(target),
      },
    ]);
    setInputs(0);
    if (turns.length + 1 < d.queue.length) setPiece(spawn(d.queue[turns.length + 1]));
  }
  function reset() {
    setTurns([]);
    setPiece(spawn(d.queue[0]));
    setInputs(0);
    setReport(null);
    setReview(null);
    started.current = Date.now();
  }
  function undo() {
    if (!turns.length) return;
    const prev = turns.slice(0, -1);
    setTurns(prev);
    setPiece(spawn(d.queue[prev.length]));
    setInputs(0);
    setReport(null);
    setReview(null);
  }
  function answer() {
    if (!ready || report) return;
    const result = evaluate(d, turns);
    setReport(result);
    onAttempt(result.correct, Math.round((Date.now() - started.current) / 1000));
    onBest(result.probe?.result.chains ?? 0);
  }
  function show(example: boolean) {
    const ts = example ? reference.turns : turns;
    const r = example ? reference.report : report;
    if (!r) return;
    setReview({ example, frames: replayFrames(d.board, ts, r), index: 0, playing: false });
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.altKey ||
        e.metaKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      const a: Record<string, Action> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'down',
        x: 'cw',
        X: 'cw',
        ArrowUp: 'cw',
        z: 'ccw',
        Z: 'ccw',
      };
      if (e.code === 'Space') {
        if (canMove) {
          e.preventDefault();
          if (!e.repeat) place();
        }
      } else if (a[e.key] && canMove) {
        e.preventDefault();
        act(a[e.key]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  useEffect(() => {
    if (!review?.playing) return;
    const timer = window.setTimeout(
      () =>
        setReview((r) =>
          r
            ? {
                ...r,
                index: Math.min(r.index + 1, r.frames.length - 1),
                playing: r.index + 1 < r.frames.length - 1,
              }
            : null,
        ),
      650,
    );
    return () => window.clearTimeout(timer);
  }, [review]);
  const frame = review?.frames[review.index];
  const shownTurns = review?.example ? reference.turns : turns;
  const shownReport = review?.example ? reference.report : report;
  return (
    <section className="next-trainer">
      <div className="next-field-panel">
        <div className="next-field-heading">
          <span className="pill">
            {review
              ? review.example
                ? '解答例'
                : '自分の回答'
              : `${Math.min(turns.length + 1, d.queue.length)} / ${d.queue.length} 手目`}
          </span>
          <span>{d.topic}</span>
        </div>
        <div className="next-field-with-queue">
          <Board
            board={frame?.board ?? board}
            piece={canMove ? piece : null}
            highlight={frame?.highlight}
          />
          <aside className="next-queue" aria-label="配ぷよと確認ツモ">
            {d.queue.map((p, i) => (
              <div
                key={i}
                className={`queue-slot ${i === turns.length && !review ? 'current' : ''} ${i < turns.length ? 'placed' : ''}`}
              >
                <span>{i === 0 ? 'CURRENT' : `NEXT ${i}`}</span>
                <PairView pair={p} />
                <small>
                  {i + 1}手目{i < turns.length ? ' ✓' : ''}
                </small>
              </div>
            ))}
            <div className="queue-slot probe">
              <span>接続確認</span>
              <PairView pair={d.probe} />
              <small>自動で検証</small>
            </div>
          </aside>
        </div>
        <div className="next-controls">
          <button aria-label="左へ移動" disabled={!canMove} onClick={() => act('left')}>
            <ArrowLeft />
          </button>
          <button aria-label="左回転" disabled={!canMove} onClick={() => act('ccw')}>
            <RotateCcw />
          </button>
          <button aria-label="右回転" disabled={!canMove} onClick={() => act('cw')}>
            <RotateCw />
          </button>
          <button aria-label="右へ移動" disabled={!canMove} onClick={() => act('right')}>
            <ArrowRight />
          </button>
          <button className="primary place-button" disabled={!canMove} onClick={place}>
            <ArrowDown size={18} />
            ここに置く
          </button>
        </div>
        <div className="next-utility">
          <button className="text-link" disabled={!turns.length} onClick={undo}>
            <Undo2 size={16} />
            1手戻す
          </button>
          <button className="text-link" onClick={reset}>
            <RotateCcw size={16} />
            最初から
          </button>
        </div>
        <p className="key-hint">← → 移動 / Z X 回転 / Space 確定</p>
        {!ready && !fits(board, piece) && !review && (
          <p role="status">次のツモを出せません。1手戻して配置を変更してください。</p>
        )}
        {review && (
          <div className="next-replay">
            <strong>{frame?.label}</strong>
            <input
              type="range"
              aria-label="再生する手順"
              min="0"
              max={review.frames.length - 1}
              value={review.index}
              onChange={(e) =>
                setReview({ ...review, index: Number(e.target.value), playing: false })
              }
            />
            <div>
              <button
                className="secondary"
                disabled={!review.index}
                onClick={() => setReview({ ...review, index: review.index - 1, playing: false })}
              >
                前へ
              </button>
              <button
                className="secondary"
                onClick={() =>
                  setReview({
                    ...review,
                    index: review.index === review.frames.length - 1 ? 0 : review.index,
                    playing: !review.playing,
                  })
                }
              >
                {review.playing ? <Pause size={15} /> : <Play size={15} />}自動再生
              </button>
              <button
                className="secondary"
                disabled={review.index === review.frames.length - 1}
                onClick={() => setReview({ ...review, index: review.index + 1, playing: false })}
              >
                次へ
              </button>
            </div>
            <button className="text-link" onClick={() => setReview(null)}>
              回答盤面に戻る
            </button>
          </div>
        )}
      </div>
      <div className="next-task-panel">
        <div className="task-tags">
          <span>次の一手</span>
          <span>{d.level}</span>
          {d.noSplit && <span>ちぎり0回</span>}
          {d.attack && <span>本線温存</span>}
        </div>
        <h2>{d.title}</h2>
        <p className="next-objective">{d.description}</p>
        <div className="next-rules">
          <strong>{d.attack ? '短い攻撃 ＋ 本線の残し' : '構築 → 発火の接続を確認'}</strong>
          <p>
            {d.attack
              ? `最後の手以外では消さずに組んでください。攻撃後の盤面を確認ツモで検証します。`
              : `構築用の${d.queue.length}手を置いてください。確認ツモはその後の仮想ツモで、最も長くつながる置き方を自動で調べます。`}
          </p>
          <small>条件を満たす別解も正解。最善の対戦手順を一意に決める問題ではありません。</small>
        </div>
        <button
          className="primary check-answer"
          disabled={!ready || !!report || !!review}
          onClick={answer}
        >
          答え合わせする
          <ArrowRight size={18} />
        </button>
        {!ready && (
          <p className="next-remaining">構築用ツモ：あと{d.queue.length - turns.length}手</p>
        )}
        <div className="next-help">
          <button className="text-link" onClick={() => setHint(!hint)}>
            <Lightbulb size={17} />
            考えるヒント
          </button>
          <button className="text-link" onClick={() => show(true)}>
            <Eye size={17} />
            解答例を見る
          </button>
        </div>
        {hint && <p className="next-hint">{d.hint}</p>}
        {report && (
          <div
            className={`next-feedback ${report.correct ? 'correct' : 'incorrect'}`}
            role="status"
          >
            <h3>{report.correct ? '正解：接続条件を達成' : '配置を見直してみよう'}</h3>
            <p>
              接続検証 {report.probe?.result.chains ?? 0} / {d.minChains}連鎖 · ちぎり
              {report.splitCount}回 · {report.inputs}入力
            </p>
            {!!report.reasons.length && (
              <ul>
                {report.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
            <button className="secondary" onClick={() => show(false)}>
              自分の回答を再生
            </button>
            <button className="secondary" onClick={() => show(true)}>
              解答例と比較
            </button>
            <button className="primary" onClick={onNext}>
              次の問題
              <ArrowRight size={16} />
            </button>
          </div>
        )}
        {(report || review?.example) && (
          <div className="next-explanation">
            <h3>{review?.example ? '解答例の手順' : 'この問題の着眼点'}</h3>
            <p>{d.explanation}</p>
            {review?.example && <p>{d.solutionNote}</p>}
            <ol>
              {shownTurns.map((t, i) => (
                <li key={i}>
                  <strong>{i + 1}手目</strong>{' '}
                  {t.target.map((c) => `${COLORS[c.color]}：${c.x + 1}列${c.y + 1}段`).join(' / ')}
                  <small>
                    {t.split ? 'ちぎりあり' : 'ちぎりなし'}
                    {review?.example
                      ? ` · 入力例 ${d.witness[i].map((a) => actionLabel[a]).join(' ') || '移動なし'} → 確定`
                      : ''}
                  </small>
                </li>
              ))}
            </ol>
            {shownReport?.probe && (
              <div className="chain-color-log">
                <strong>接続検証の消去順</strong>
                <p>
                  {shownReport.probe.result.steps
                    .map(
                      (s, i) =>
                        `${i + 1}: ${[...new Set(s.removed.filter((c) => c.color !== 6).map((c) => COLORS[c.color]))].join('＋')}`,
                    )
                    .join(' → ') || '消去なし'}
                </p>
                <small>1手ごとの配置と各連鎖の盤面は、再生スライダーで確認できます。</small>
              </div>
            )}
          </div>
        )}
        <details className="next-attribution">
          <summary>出典と問題化の内容</summary>
          <p>
            {d.origin}
            を参照し、接続に必要なぷよを抜いて配ぷよと手順を設定した派生課題です。催促問題は元の形から部分発火の条件を設定しています。判定条件と解説は本サイトで作成しました。
          </p>
        </details>
        <SourceLinks ids={d.sources} />
      </div>
    </section>
  );
}

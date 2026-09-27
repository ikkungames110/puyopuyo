import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  RotateCw,
  Undo2,
  RefreshCw,
  Play,
  Lightbulb,
  Check,
  X,
  ChevronRight,
  Pencil,
  Download,
  Upload,
  Pause,
  ArrowDown,
  Eye,
} from 'lucide-react';
import Board from './Board';
import Puyo from './Puyo';
import {
  cloneBoard,
  emptyBoard,
  staircase,
  spawn,
  cells,
  fits,
  move,
  landing,
  drop,
  resolve,
  gravity,
  placements,
  gameOver,
  randomPairs,
  actionLabel,
  COLORS,
  type Board as BoardType,
  type Piece,
  type Pair,
  type Action,
  type Resolution,
  type Color,
} from './engine';
import { sources, isCorrect, type PlacementDrill } from './content';
export function SourceLinks({ ids }: { ids: string[] }) {
  return (
    <div className="source-links">
      {ids.map((id) => {
        const s = sources.find((s) => s.id === id)!;
        return (
          <a href={s.url} target="_blank" rel="noreferrer" key={id}>
            {s.author} ↗
          </a>
        );
      })}
    </div>
  );
}
type Snapshot = { board: BoardType; index: number; score: number; last: Resolution | null };
export default function Simulator({
  drill,
  onAttempt,
  onBest,
  onNext,
}: {
  drill?: PlacementDrill;
  onAttempt: (correct: boolean, seconds: number) => void;
  onBest: (chain: number) => void;
  onNext?: () => void;
}) {
  const [board, setBoard] = useState<BoardType>(() => cloneBoard(drill?.board ?? emptyBoard()));
  const [queue, setQueue] = useState<Pair[]>(() =>
    drill ? [drill.pair, ...randomPairs()] : randomPairs(),
  );
  const [index, setIndex] = useState(0);
  const [piece, setPiece] = useState<Piece | null>(() => spawn(drill?.pair ?? [1, 3]));
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [score, setScore] = useState(0);
  const [last, setLast] = useState<Resolution | null>(null);
  const [busy, setBusy] = useState(false);
  const [chainLabel, setChainLabel] = useState(0);
  const [highlight, setHighlight] = useState<ReturnType<typeof cells>>([]);
  const [inputs, setInputs] = useState<Action[]>([]);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    example: boolean;
    inputs: number;
  } | null>(null);
  const [hint, setHint] = useState(false);
  const [auto, setAuto] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [editing, setEditing] = useState(false);
  const [brush, setBrush] = useState<Color>(1);
  const [preview, setPreview] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [transfer, setTransfer] = useState(false);
  const [json, setJson] = useState('');
  const generation = useRef(0),
    busyRef = useRef(false),
    started = useRef(Date.now());
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setPiece(spawn(queue[0]));
    return () => {
      generation.current++;
    };
  }, []); // queue is fixed for this mounted exercise
  function reset(newBoard = drill?.board ?? emptyBoard(), newQueue = queue) {
    generation.current++;
    busyRef.current = false;
    setBusy(false);
    setBoard(cloneBoard(newBoard));
    setQueue(newQueue);
    setIndex(0);
    setPiece(fits(newBoard, spawn(newQueue[0])) ? spawn(newQueue[0]) : null);
    setHistory([]);
    setScore(0);
    setLast(null);
    setHighlight([]);
    setChainLabel(0);
    setInputs([]);
    setFeedback(null);
    setPreview(null);
    setNotice('');
    setAuto(false);
    setEditing(false);
    started.current = Date.now();
  }
  async function animate(result: Resolution, done: () => void) {
    const token = ++generation.current;
    busyRef.current = true;
    setBusy(true);
    setPiece(null);
    setPreview(null);
    for (let i = 0; i < result.steps.length; i++) {
      if (generation.current !== token) return;
      setBoard(result.steps[i].before);
      setHighlight(result.steps[i].removed);
      setChainLabel(i + 1);
      await new Promise((r) => setTimeout(r, speed));
      if (generation.current !== token) return;
      setBoard(result.steps[i].after);
      setHighlight([]);
      await new Promise((r) => setTimeout(r, speed / 3));
    }
    if (generation.current !== token) return;
    setBoard(result.board);
    setLast(result);
    setBusy(false);
    busyRef.current = false;
    setHighlight([]);
    setChainLabel(0);
    done();
  }
  function commit(p = piece, example = false, inputPath = inputs) {
    if (!p || busyRef.current || editing || (feedback && !example)) return;
    const target = landing(board, p),
      result = drop(board, p);
    if (!result) return;
    setHistory((h) => [...h, { board: cloneBoard(board), index, score, last }]);
    setAuto(drill ? false : auto);
    void animate(result, () => {
      setScore(score + result.score);
      onBest(result.chains);
      if (drill) {
        const correct = isCorrect(drill, result, target, inputPath.length);
        setFeedback({ correct, example, inputs: inputPath.length });
        if (!example) onAttempt(correct, Math.round((Date.now() - started.current) / 1000));
      } else {
        const nextIndex = index + 1;
        const nextQueue = nextIndex + 2 >= queue.length ? [...queue, ...randomPairs()] : queue;
        setQueue(nextQueue);
        setIndex(nextIndex);
        setInputs([]);
        const next = spawn(nextQueue[nextIndex]);
        if (gameOver(result.board) || !fits(result.board, next)) {
          setPiece(null);
          setAuto(false);
          setNotice('ゲームオーバー。1手戻して考え直すか、リセットで再開できます。');
        } else setPiece(next);
      }
    });
  }
  function act(action: Action) {
    if (!piece || busyRef.current || editing || feedback || preview !== null) return;
    const next = move(board, piece, action);
    const nextInputs = [...inputs, action];
    setInputs(nextInputs);
    if (action === 'down' && next === piece) commit(piece, false, nextInputs);
    else setPiece(next);
  }
  function playEditedBoard() {
    if (busyRef.current || drill) return;
    const before = gravity(board);
    setHistory((h) => [...h, { board: cloneBoard(before), index, score, last }]);
    setEditing(false);
    setAuto(false);
    setNotice('');
    const result = resolve(before);
    void animate(result, () => {
      setScore(score + result.score);
      onBest(result.chains);
      setPiece(fits(result.board, spawn(queue[index])) ? spawn(queue[index]) : null);
    });
  }
  function undo() {
    if (!history.length || busyRef.current) return;
    const h = history[history.length - 1];
    generation.current++;
    setBoard(h.board);
    setIndex(h.index);
    setScore(h.score);
    setLast(h.last);
    setPiece(spawn(queue[h.index]));
    setHistory(history.slice(0, -1));
    setInputs([]);
    setFeedback(null);
    setPreview(null);
    setNotice('');
    setAuto(false);
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches('input,textarea,select') ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey
      )
        return;
      const map: Record<string, Action> = {
        ArrowLeft: 'left',
        ArrowRight: 'right',
        ArrowDown: 'down',
        z: 'ccw',
        Z: 'ccw',
        x: 'cw',
        X: 'cw',
        ArrowUp: 'cw',
      };
      if (map[e.key]) {
        e.preventDefault();
        if (!e.repeat || ['ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.key)) act(map[e.key]);
      }
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (preview === null) commit();
      }
      if ((e.key === 'u' || e.key === 'U') && !e.repeat) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
  useEffect(() => {
    if (!auto || busy || editing || !piece || feedback || preview !== null) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const next = move(board, piece, 'down');
      if (next === piece) commit();
      else setPiece(next);
    }, 600);
    return () => clearInterval(timer);
  });
  const solutions = useMemo(
    () =>
      drill
        ? placements(drill.board, drill.pair)
            .filter((p) => isCorrect(drill, p.result, p.target, p.path.length))
            .sort((a, b) => a.path.length - b.path.length)
        : [],
    [drill],
  );
  function example() {
    const solution = solutions[0];
    if (!solution || busyRef.current) return;
    reset();
    setInputs(solution.path);
    setPiece(solution.piece);
    // Run from the original puzzle even when the previous attempt changed the board.
    void animate(solution.result, () => {
      setFeedback({ correct: true, example: true, inputs: solution.path.length });
      setScore(solution.result.score);
    });
  }
  function exportBoard() {
    const payload = JSON.stringify(
      { version: 1, board, queue: queue.slice(index, index + 50) },
      null,
      2,
    );
    setJson(payload);
    setTransfer(true);
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'puyo-lab-board.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function importBoard(value: string) {
    try {
      const v = JSON.parse(value);
      const colorOK = (c: unknown) => Number.isInteger(c) && Number(c) >= 0 && Number(c) <= 6;
      if (
        v.version !== 1 ||
        !Array.isArray(v.board) ||
        v.board.length !== 13 ||
        !v.board.every((r: unknown[]) => Array.isArray(r) && r.length === 6 && r.every(colorOK)) ||
        !Array.isArray(v.queue) ||
        !v.queue.length ||
        v.queue.length > 1000 ||
        !v.queue.every(
          (r: unknown[]) =>
            Array.isArray(r) &&
            r.length === 2 &&
            r.every((c) => colorOK(c) && Number(c) > 0 && Number(c) < 6),
        )
      )
        throw Error();
      reset(gravity(v.board), v.queue);
      setTransfer(false);
      setNotice('盤面と配ぷよを読み込みました。空中のぷよには重力を適用しました。');
    } catch {
      setNotice('読み込めません。書き出した形式のJSON（13行×6列、色0〜6）を指定してください。');
    }
  }
  const viewed = preview !== null ? last?.steps[preview] : null;
  return (
    <div className="practice-layout" ref={inputRef}>
      <section className="play-card">
        <div className="play-toolbar">
          <span className="live-dot" />
          <strong>{drill ? '考えて、置いてみよう' : 'フリーシミュレーター'}</strong>
          <span className="toolbar-tag">
            {editing ? '盤面編集' : auto ? '自動落下 ON' : 'じっくりモード'}
          </span>
        </div>
        <div className="field-area">
          <div className="field-side left-side">
            <span className="micro-label">{drill ? 'MISSION' : 'SCORE'}</span>
            <strong className="side-number">
              {drill
                ? (drill.goal.chains ??
                  (drill.goal.allClear ? 'ALL' : (drill.goal.maxInputs ?? '2')))
                : score.toLocaleString()}
            </strong>
            <span className="side-caption">
              {drill
                ? drill.goal.chains
                  ? '連鎖をつなごう'
                  : drill.goal.allClear
                    ? '全消しをねらおう'
                    : drill.goal.maxInputs !== undefined
                      ? '入力以内'
                      : '色を同時消し'
                : '消去得点'}
            </span>
            <div className="side-divider" />
            <span className="micro-label">INPUTS</span>
            <strong className="input-number">{inputs.length.toString().padStart(2, '0')}</strong>
            <div className="input-path">
              {inputs.map((a, i) => (
                <span key={i}>{actionLabel[a]}</span>
              ))}
            </div>
            {!drill && <span className="side-caption">{index + 1} 手目</span>}
          </div>
          <div className="board-container">
            <Board
              board={viewed?.before ?? board}
              piece={viewed || editing ? null : piece}
              highlight={viewed?.removed ?? highlight}
              target={drill?.goal.target}
              onPaint={
                editing
                  ? (x, y) => {
                      setBoard((b) => {
                        const n = cloneBoard(b);
                        n[y][x] = brush;
                        return n;
                      });
                    }
                  : undefined
              }
            />
            {chainLabel > 0 && (
              <div className="chain-burst" aria-live="polite">
                {chainLabel}
                <small>れんさ！</small>
              </div>
            )}
          </div>
          <div className="field-side next-side">
            <span className="micro-label">{drill ? 'CURRENT' : 'NEXT'}</span>
            {(drill ? [drill.pair] : queue.slice(index + 1, index + 3)).map((pair, i) => (
              <div className={`next-pair next-${i}`} key={i}>
                <Puyo color={pair[1]} />
                <Puyo color={pair[0]} />
              </div>
            ))}
            <div className="field-flower">✳</div>
            <span className="side-caption">
              ひとつずつ、
              <br />
              つなげよう。
            </span>
          </div>
        </div>
        <div className="game-controls">
          <button
            aria-label="左へ移動"
            onClick={() => act('left')}
            disabled={busy || editing || !!feedback}
          >
            <ArrowLeft />
          </button>
          <button
            aria-label="右へ移動"
            onClick={() => act('right')}
            disabled={busy || editing || !!feedback}
          >
            <ArrowRight />
          </button>
          <span />
          <button
            aria-label="左回転"
            onClick={() => act('ccw')}
            disabled={busy || editing || !!feedback}
          >
            <RotateCcw />
            <kbd>Z</kbd>
          </button>
          <button
            aria-label="右回転"
            onClick={() => act('cw')}
            disabled={busy || editing || !!feedback}
          >
            <RotateCw />
            <kbd>X</kbd>
          </button>
          <button
            className="drop-button"
            onClick={() => commit()}
            disabled={busy || editing || !!feedback || !piece || preview !== null}
          >
            <ArrowDown />
            {drill ? 'ここに置く' : '落とす'}
            <kbd>SPACE</kbd>
          </button>
        </div>
        <div className="board-bottom">
          <span>← → 移動　Z / X 回転　↓ 落下</span>
          <div>
            <button onClick={undo} disabled={!history.length || busy}>
              <Undo2 size={15} />
              1手戻す
            </button>
            <button onClick={() => reset()}>
              <RefreshCw size={14} />
              リセット
            </button>
          </div>
        </div>
        {notice && (
          <p role="status" className="inline-notice">
            {notice}
          </p>
        )}
        {!drill && (
          <div className="sandbox-tools">
            <button onClick={playEditedBoard} disabled={busy}>
              <Play size={16} />
              盤面の連鎖を再生
            </button>
            <button
              className={auto ? 'selected' : ''}
              disabled={editing || busy || !piece}
              onClick={() => setAuto(!auto)}
            >
              {auto ? <Pause size={16} /> : <Play size={16} />}自動落下
            </button>
            <button
              className={editing ? 'selected' : ''}
              disabled={busy}
              onClick={() => {
                if (editing) {
                  const settled = gravity(board);
                  setBoard(settled);
                  setPiece(fits(settled, spawn(queue[index])) ? spawn(queue[index]) : null);
                }
                setEditing(!editing);
                setAuto(false);
                setPreview(null);
              }}
            >
              <Pencil size={16} />
              {editing ? '編集を完了' : '盤面を編集'}
            </button>
            <button onClick={exportBoard} disabled={busy}>
              <Download size={16} />
              保存
            </button>
            <button onClick={() => fileInput.current?.click()} disabled={busy}>
              <Upload size={16} />
              読込
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) importBoard(await file.text());
                e.target.value = '';
              }}
            />
          </div>
        )}
        {editing && (
          <div className="palette">
            {Array.from({ length: 7 }, (_, c) => (
              <button
                key={c}
                className={brush === c ? 'selected' : ''}
                onClick={() => setBrush(c as Color)}
                aria-label={`${COLORS[c]}で編集`}
              >
                {c ? <Puyo color={c as Color} /> : <X />}
              </button>
            ))}
            <small>マスをクリックして描画。完了時に落下します。</small>
          </div>
        )}
        {transfer && (
          <div className="transfer">
            <label>
              盤面データ
              <textarea value={json} onChange={(e) => setJson(e.target.value)} />
            </label>
            <button className="secondary" onClick={() => importBoard(json)}>
              このデータを読み込む
            </button>
            <button onClick={() => setTransfer(false)}>閉じる</button>
          </div>
        )}
      </section>
      <aside className="coach-column">
        {drill ? (
          <>
            <section className="task-card">
              <div className="eyebrow">
                <span className="number-chip">Q</span> TODAY'S CHALLENGE
              </div>
              <div className="task-tags">
                <span>{drill.category}</span>
                <span className="level">{drill.level}</span>
              </div>
              <h2>{drill.title}</h2>
              <p>{drill.description}</p>
              <div className="goal-box">
                <Check size={17} />
                <span>
                  {drill.goal.allClear
                    ? '盤面のぷよをすべて消す'
                    : drill.goal.target
                      ? `指定の位置・向きに${drill.goal.maxInputs}入力以内で配置`
                      : drill.goal.colorsOnSecond
                        ? '2連鎖以上 ＋ 2連鎖目に2色同時消し'
                        : drill.goal.chains
                          ? `${drill.goal.chains}連鎖以上でクリア`
                          : `消去得点 ${drill.goal.minScore}点以上`}
                </span>
              </div>
              <button className="hint-button" onClick={() => setHint(!hint)}>
                <Lightbulb size={17} />
                {hint ? 'ヒントを閉じる' : 'ヒントをみる'}
                <ChevronRight size={16} />
              </button>
              {hint && <p className="hint-text">{drill.hint}</p>}
              <div className="task-note">
                時間制限はありません。
                <br />
                着地点の薄いぷよを見ながら考えよう。
              </div>
            </section>
            {feedback && (
              <section
                className={`feedback-card ${feedback.correct ? 'correct' : 'incorrect'}`}
                aria-live="polite"
              >
                <div className="feedback-title">
                  {feedback.example ? <Eye /> : feedback.correct ? <Check /> : <RefreshCw />}
                  <h3>
                    {feedback.example
                      ? '正解例をチェック'
                      : feedback.correct
                        ? 'クリア！ その調子。'
                        : 'もう一度、考えてみよう。'}
                  </h3>
                </div>
                <p>
                  {last?.chains ?? 0}連鎖 · {last?.score ?? 0}点 · {feedback.inputs}入力
                </p>
                {!feedback.correct && (
                  <p>
                    今回の配置は達成条件に届きませんでした。消えたあとの盤面と、発火点を確認してみよう。
                  </p>
                )}
                <p>{drill.explanation}</p>
                {solutions[0] && (
                  <div className="solution-path">
                    最短の正解例：
                    {solutions[0].path.map((a) => actionLabel[a]).join(' ') || '移動なし'} → Space
                  </div>
                )}
                <div className="feedback-actions">
                  <button className="secondary" onClick={() => reset()}>
                    もう一度
                  </button>
                  <button className="primary" onClick={onNext}>
                    次の問題
                    <ArrowRight size={16} />
                  </button>
                </div>
                <SourceLinks ids={drill.sources} />
              </section>
            )}
            <button className="answer-button" disabled={busy} onClick={example}>
              <Play size={16} />
              正解例を再生する<span>学習記録には加算されません</span>
            </button>
          </>
        ) : (
          <>
            <section className="task-card">
              <div className="eyebrow">
                <span className="number-chip">∞</span> YOUR PLAYGROUND
              </div>
              <h2>何度でも、試そう。</h2>
              <p>自分のペースで連鎖を組む場所。盤面を編集して、気になる形を再現できます。</p>
              <label className="setting-label">
                連鎖の再生速度
                <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
                  <option value={350}>はやい</option>
                  <option value={700}>ふつう</option>
                  <option value={1200}>ゆっくり</option>
                </select>
              </label>
              <div className="preset-list">
                <button onClick={() => reset(staircase(3), [[1, 4], ...randomPairs()])}>
                  3連鎖の形を読み込む
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => reset(staircase(5), [[1, 4], ...randomPairs()])}>
                  5連鎖の形を読み込む
                  <ChevronRight size={16} />
                </button>
                <button onClick={() => reset(emptyBoard(), randomPairs())}>
                  新しい配ぷよで始める
                  <RefreshCw size={15} />
                </button>
              </div>
              <div className="pair-editor">
                <span>現在の組ぷよ</span>
                {[0, 1].map((n) => (
                  <select
                    key={n}
                    aria-label={n === 0 ? '軸ぷよの色' : '子ぷよの色'}
                    disabled={busy || editing}
                    value={queue[index]?.[n] ?? 1}
                    onChange={(e) => {
                      const pair: Pair = [...queue[index]];
                      pair[n] = Number(e.target.value) as Color;
                      const q = [...queue];
                      q[index] = pair;
                      setQueue(q);
                      setPiece(fits(board, spawn(pair)) ? spawn(pair) : null);
                    }}
                  >
                    {[1, 2, 3, 4, 5].map((c) => (
                      <option key={c} value={c}>
                        {COLORS[c]}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </section>
            <section className="small-note">
              <Lightbulb size={19} />
              <div>
                <strong>じっくり考えるための設定</strong>
                <p>
                  自動落下は初期状態でOFF。Spaceの即設置は練習用の機能です。実機のフレーム単位の操作・クイックターンは再現していません。
                </p>
              </div>
            </section>
          </>
        )}
        {last && (
          <section className="chain-log">
            <div className="section-mini-title">
              <h3>連鎖のふりかえり</h3>
              <span>{last.allClear ? 'ALL CLEAR!' : `${last.cleared}個 消去`}</span>
            </div>
            {last.steps.length ? (
              last.steps.map((step, i) => (
                <button
                  className={preview === i ? 'selected' : ''}
                  key={i}
                  onClick={() => {
                    setPreview(preview === i ? null : i);
                    setAuto(false);
                  }}
                >
                  <span className="step-number">{i + 1}</span>
                  <span>
                    {step.colors}色 · {step.removed.filter((c) => c.color !== 6).length}個
                  </span>
                  <strong>+{step.score.toLocaleString()}</strong>
                  <Eye size={14} />
                </button>
              ))
            ) : (
              <p>まだ連鎖はありません。</p>
            )}
            {preview !== null && (
              <button className="return-preview" onClick={() => setPreview(null)}>
                現在の盤面に戻る
              </button>
            )}
            <div className="log-total">
              <span>消去得点</span>
              <strong>
                {last.score.toLocaleString()}
                <small> pt</small>
              </strong>
            </div>
            <p className="scoring-note">
              おじゃま目安 {Math.floor(last.score / 70)}
              個（70点/個）。落下・全消しボーナス、相殺、余剰点、マージンは含みません。
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}

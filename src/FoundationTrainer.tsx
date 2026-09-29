import { useMemo, useRef, useState } from 'react';
import Board from './Board';
import Puyo from './Puyo';
import { SourceLinks } from './Simulator';
import { COLORS } from './engine';
import { makeTurn } from './sequence';
import type { FoundationDrill } from './content';

export default function FoundationTrainer({
  drill: d,
  onAttempt,
  onNext,
  onRelated,
}: {
  drill: FoundationDrill;
  onAttempt: (correct: boolean, seconds: number) => void;
  onNext: () => void;
  onRelated: (id: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [route, setRoute] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const started = useRef(Date.now());
  const option = d.options.find((o) => o.id === route);
  const frames = useMemo(() => {
    let board = d.board;
    const out = [{ board, label: 'まだ方針を決めていない開始盤面' }];
    for (const [i, path] of (option?.witness ?? []).entries()) {
      const turn = makeTurn(board, d.queue[i], path);
      board = turn.result.board;
      out.push({
        board,
        label: `${i + 1}手目：${turn.target.map((c) => `${COLORS[c.color]}を${c.x + 1}列${c.y + 1}段`).join('、')}`,
      });
    }
    return out;
  }, [d, option]);
  const chosen = d.options.find((o) => o.id === selected);
  return (
    <section className="next-trainer foundation-trainer">
      <div className="next-field-panel">
        <div className="next-field-heading">
          <span className="pill">{route ? '組み始めの一例' : 'ツモから方針を判断'}</span>
          <span>今のツモ ＋ NEXT 2手</span>
        </div>
        <div className="next-field-with-queue">
          <Board board={frames[step].board} />
          <aside className="next-queue" aria-label="判断材料の配ぷよ">
            {d.queue.map((pair, i) => (
              <div className="queue-slot" key={i}>
                <span>{i === 0 ? 'CURRENT' : `NEXT ${i}`}</span>
                <span className="queue-pair" aria-label={`${COLORS[pair[0]]}・${COLORS[pair[1]]}`}>
                  <Puyo color={pair[1]} />
                  <Puyo color={pair[0]} />
                </span>
                <small>{i + 1}手目</small>
              </div>
            ))}
          </aside>
        </div>
        {route && (
          <div className="next-replay">
            <strong>{frames[step].label}</strong>
            <input
              type="range"
              aria-label="組み始めを比較"
              min={0}
              max={frames.length - 1}
              value={step}
              onChange={(e) => setStep(Number(e.target.value))}
            />
            <div>
              <button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
                前へ
              </button>
              <button
                className="secondary"
                disabled={step === frames.length - 1}
                onClick={() => setStep(step + 1)}
              >
                次へ
              </button>
            </div>
            <p>ここから後のツモに応じて伸ばします。この3手で連鎖を完成させる必要はありません。</p>
            <button
              className="text-link"
              onClick={() => {
                setRoute(null);
                setStep(0);
              }}
            >
              開始盤面に戻る
            </button>
          </div>
        )}
      </div>
      <div className="next-task-panel">
        <h2>{d.title}</h2>
        <p className="next-objective">{d.description}</p>
        <p>本線を崩さず、後のツモに合わせて組み方を選べる受けを優先します。</p>
        <fieldset className="quiz-options" disabled={answered}>
          <legend>このツモなら、どの方針を優先しますか？</legend>
          {d.options.map((o) => (
            <label key={o.id}>
              <input
                type="radio"
                name={d.id}
                checked={selected === o.id}
                onChange={() => setSelected(o.id)}
              />
              <span>{o.label}</span>
            </label>
          ))}
        </fieldset>
        <button
          className="primary check-answer"
          disabled={selected === null || answered}
          onClick={() => {
            if (!chosen || answered) return;
            setAnswered(true);
            onAttempt(chosen.recommended, Math.round((Date.now() - started.current) / 1000));
          }}
        >
          方針を答え合わせする
        </button>
        {answered && (
          <>
            <div
              className={`next-feedback ${chosen?.recommended ? 'correct' : 'incorrect'}`}
              role="status"
            >
              <h3>
                {chosen?.recommended ? 'このツモに合った方針です' : 'ほかの方針と比べてみよう'}
              </h3>
              <p>{d.explanation}</p>
              <small>
                記事の優先順位に沿って判断します。対戦状況を含めた唯一の最善手という意味ではありません。
              </small>
            </div>
            <div className="foundation-comparison">
              <h3>方針ごとの比較</h3>
              {d.options.map((o) => (
                <article className="next-rules" key={o.id}>
                  <strong>
                    {o.recommended ? '推奨' : o.witness ? '別の候補' : '今回は見送る'}：{o.label}
                  </strong>
                  <p>{o.reason}</p>
                  {o.witness && (
                    <button
                      className="secondary"
                      aria-label={`${o.label}：配置例を見る`}
                      aria-pressed={route === o.id}
                      onClick={() => {
                        setRoute(o.id);
                        setStep(o.witness!.length);
                      }}
                    >
                      配置例を見る
                    </button>
                  )}
                </article>
              ))}
            </div>
            {d.related.length > 0 && (
              <div className="next-help">
                <p>同じ盤面で、ツモが変わると判断はどう変わる？</p>
                {d.related.map((id, i) => (
                  <button className="secondary" key={id} onClick={() => onRelated(id)}>
                    ツモ違い {i + 1} を解く
                  </button>
                ))}
              </div>
            )}
            <button className="primary" onClick={onNext}>
              次の問題
            </button>
          </>
        )}
        <details className="next-attribution">
          <summary>出題の考え方</summary>
          <p>
            伸ばす型が決まる前の盤面とツモから方針を選びます。配置例は選択後の組み始めを示すもので、完成形の復元や最大連鎖数を採点する問題ではありません。
          </p>
        </details>
        <SourceLinks ids={d.sources} />
      </div>
    </section>
  );
}

import { useRef, useState } from 'react';
import Board from './Board';
import { SourceLinks } from './Simulator';
import { drillTags, type QuizDrill } from './content';

export default function QuizTrainer({
  drill: d,
  onAttempt,
  onNext,
  onTag,
}: {
  drill: QuizDrill;
  onAttempt: (correct: boolean, seconds: number) => void;
  onNext: () => void;
  onTag: (tag: string) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [figure, setFigure] = useState(0);
  const started = useRef(Date.now());
  const diagram = d.diagrams[figure];
  return (
    <section className="next-trainer quiz-trainer">
      <div className="next-field-panel">
        <div className="next-field-heading">
          <span className="pill">形の判断</span>
          <span>
            {diagram.label} · {figure + 1} / {d.diagrams.length}
          </span>
        </div>
        <Board board={diagram.board} />
        <div className="diagram-tabs" aria-label="比較する図">
          {d.diagrams.map((item, i) => (
            <button
              key={item.id}
              className="secondary"
              aria-pressed={i === figure}
              onClick={() => setFigure(i)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="key-hint">
          図の灰色は省略された土台です。空中のぷよは接続を説明する配置で、操作中の盤面ではありません。
        </p>
      </div>
      <div className="next-task-panel">
        <div className="tag-list">
          {drillTags(d).map((tag) => (
            <button key={tag} className="tag-button" onClick={() => onTag(tag)}>
              #{tag}
            </button>
          ))}
        </div>
        <h2>{d.title}</h2>
        <p className="next-objective">{d.question}</p>
        <fieldset className="quiz-options" disabled={answered}>
          <legend>答えを1つ選んでください</legend>
          {d.options.map((option, index) => (
            <label key={option}>
              <input
                type="radio"
                name={d.id}
                checked={selected === index}
                onChange={() => setSelected(index)}
              />
              <span>{option}</span>
            </label>
          ))}
        </fieldset>
        <button
          className="primary check-answer"
          disabled={selected === null || answered}
          onClick={() => {
            if (selected === null || answered) return;
            setAnswered(true);
            onAttempt(selected === d.answer, Math.round((Date.now() - started.current) / 1000));
          }}
        >
          答え合わせする
        </button>
        {answered && (
          <div
            className={`next-feedback ${selected === d.answer ? 'correct' : 'incorrect'}`}
            role="status"
          >
            <h3>{selected === d.answer ? '正解' : 'もう一度、形を見てみよう'}</h3>
            <strong>正解：{d.options[d.answer]}</strong>
            <p>{d.explanation}</p>
            <button className="primary" onClick={onNext}>
              次の問題
            </button>
          </div>
        )}
        <details className="next-attribution">
          <summary>出典と問題化の内容</summary>
          <p>
            元記事の図から色と配置を転記し、比較する観点・選択肢・解説を本サイトで作成しました。図番号は記事内の画像の掲載順です。
          </p>
        </details>
        <SourceLinks ids={d.sources} />
      </div>
    </section>
  );
}

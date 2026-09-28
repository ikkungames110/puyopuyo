import { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, ExternalLink, Search } from 'lucide-react';
import Board from './Board';
import { SourceLinks } from './Simulator';
import { drills, lessons, videos, sources, type Lesson, type SequenceDrill } from './content';
import { evaluate, witnessTurns } from './sequence';
import { cloneBoard, type Board as BoardType, type Pair } from './engine';
export type StudySeed = { board: BoardType; pair: Pair; title: string };

function related(lesson: Lesson) {
  return drills.filter((d) =>
    lesson.topics?.length ? lesson.topics.includes(d.topic) : d.category === lesson.tag,
  );
}
function SeedViewer({
  drill,
  onPractice,
  onSeed,
}: {
  drill: SequenceDrill;
  onPractice: (d: SequenceDrill) => void;
  onSeed: (s: StudySeed) => void;
}) {
  const [step, setStep] = useState(0);
  const seed = useMemo(() => {
    const turns = witnessTurns(drill);
    const board = turns.at(-1)!.result.board;
    const result = evaluate(drill, turns).probe!;
    const placed = cloneBoard(board);
    result.target.forEach((c) => {
      placed[c.y][c.x] = c.color;
    });
    return {
      board,
      result,
      frames: [
        { board, label: '接続を補った形', highlight: [] },
        { board: placed, label: '確認ツモを置く', highlight: result.target },
        ...result.result.steps.map((s, i) => ({
          board: s.before,
          label: `${i + 1}連鎖目：${s.score.toLocaleString()}点`,
          highlight: s.removed,
        })),
        { board: result.result.board, label: `${result.result.chains}連鎖の消去後`, highlight: [] },
      ],
    };
  }, [drill]);
  const frame = seed.frames[step];
  return (
    <div className="study-seed">
      <Board board={frame.board} highlight={frame.highlight} compact />
      <div className="study-seed-detail">
        <strong aria-live="polite">{frame.label}</strong>
        <p>
          {drill.minChains}
          連鎖につながる種。消去する群を順に見て、どの色が何段落ちるか確かめてください。
        </p>
        <input
          aria-label="種の消去順"
          type="range"
          min={0}
          max={seed.frames.length - 1}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
        />
        <div className="study-step-buttons">
          <button className="secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>
            前の段階
          </button>
          <button
            className="secondary"
            disabled={step === seed.frames.length - 1}
            onClick={() => setStep(step + 1)}
          >
            次の段階
          </button>
        </div>
        <button className="primary" onClick={() => onPractice(drill)}>
          この接続を問題で解く <ArrowRight size={15} />
        </button>
        <button
          className="secondary"
          onClick={() =>
            onSeed({ board: cloneBoard(seed.board), pair: drill.probe, title: drill.title })
          }
        >
          この種を自由に編集
        </button>
        <small>{drill.origin}</small>
      </div>
    </div>
  );
}

export default function StudyLibrary({
  onTopic,
  onPractice,
  onSeed,
}: {
  onTopic: (topic: string, category: string) => void;
  onPractice: (d: SequenceDrill) => void;
  onSeed: (s: StudySeed) => void;
}) {
  const [track, setTrack] = useState('すべて');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const tracks = ['すべて', 'GTR', '多重', '折り返し', '連鎖尾', '判断・手順', '応用ノート'];
  const visible = lessons.filter(
    (l) =>
      (track === 'すべて' || (l.track ?? '応用ノート') === track) &&
      `${l.title}${l.text}${l.topics?.join('') ?? ''}`.includes(query.trim()),
  );
  return (
    <>
      <div className="page-heading">
        <span className="small-kicker">STUDY SEEDS</span>
        <h1>形を知って、次の一手へ。</h1>
        <p>
          {lessons.length}の学習ノートと{drills.length}の問題。形の観察 → 消去順の確認 →
          接続を自分で作る、の順で練習できます。
        </p>
      </div>
      <div className="study-intro">
        <BookOpen size={22} />
        <p>
          GTRの接続から、多重・第二折り返し・連鎖尾の回収まで。途中形を補う課題なので、完成形を置くだけではクリアできません。
        </p>
      </div>
      <div className="study-filters">
        <label>
          <span>学習分野</span>
          <select
            aria-label="学習分野"
            value={track}
            onChange={(e) => {
              setTrack(e.target.value);
              setOpen(null);
            }}
          >
            {tracks.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="search-field">
          <Search size={16} />
          <input
            placeholder="学習の種を検索"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <span>{visible.length}件</span>
      </div>
      <div className="study-grid">
        {visible.map((l) => {
          const matches = related(l);
          // Prefer examples directly sourced from this lesson's video when available.
          const sample =
            matches.find((d) => !d.attack && l.video && d.sources.includes(`video-${l.video}`)) ??
            matches.find((d) => !d.attack) ??
            matches[0];
          return (
            <article className={`study-card ${open === l.title ? 'study-open' : ''}`} key={l.title}>
              <span className="pill">{l.track ?? '応用ノート'}</span>
              <h2>{l.title}</h2>
              <p>{l.text}</p>
              {l.checkpoints && (
                <ol>
                  {l.checkpoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ol>
              )}
              {l.mistake && (
                <p className="study-mistake">
                  <strong>つまずきやすい点</strong>
                  {l.mistake}
                </p>
              )}
              <SourceLinks ids={l.sources} />
              {l.video && (
                <a
                  className="text-link"
                  href={`https://www.youtube.com/watch?v=${l.video}&t=${l.seconds ?? 0}s`}
                  target="_blank"
                  rel="noreferrer"
                >
                  解説の該当箇所へ（{Math.floor((l.seconds ?? 0) / 60)}:
                  {String((l.seconds ?? 0) % 60).padStart(2, '0')}）<ExternalLink size={13} />
                </a>
              )}
              <div className="study-actions">
                {sample && (
                  <button
                    className="secondary"
                    aria-expanded={open === l.title}
                    onClick={() => setOpen(open === l.title ? null : l.title)}
                  >
                    {open === l.title ? '形を閉じる' : '形と消え方を見る'}
                  </button>
                )}
                <button
                  className="text-link"
                  onClick={() =>
                    onTopic(l.topics?.[0] ?? 'すべて', l.topics?.length ? 'すべて' : l.tag)
                  }
                >
                  関連するドリルへ <ArrowRight size={14} />
                </button>
              </div>
              {open === l.title && sample && (
                <SeedViewer
                  key={sample.id}
                  drill={sample}
                  onPractice={onPractice}
                  onSeed={onSeed}
                />
              )}
            </article>
          );
        })}
      </div>
      {!visible.length && (
        <p className="empty-state">該当するノートがありません。検索語や分野を変更してください。</p>
      )}
    </>
  );
}

export function ResearchVideos() {
  return (
    <section className="research-videos">
      <h2>調査した動画</h2>
      <p>
        GTR・多重・連鎖尾の3検索、各10候補から解説内容と再生数を比較し、6本（合計約130分）を取得。日本語自動字幕と抽出した盤面を照合しました。再生数は2026年9月28日の取得時点です。
      </p>
      <p>
        検索候補内での比較であり、YouTube全体の順位ではありません。自動字幕の誤認識は画像と記事で補い、問題の成立は連鎖計算で検証しています。
      </p>
      <div className="video-grid">
        {videos.map((v) => (
          <article key={v.id}>
            <small>
              {v.author} · {v.views.toLocaleString()}回再生 · {Math.floor(v.duration / 60)}分
              {v.duration % 60}秒
            </small>
            <h3>
              <a href={v.url} target="_blank" rel="noreferrer">
                {v.title} ↗
              </a>
            </h3>
            {v.segments.map((s) => (
              <p key={s.seconds}>
                <a href={`${v.url}&t=${s.seconds}s`} target="_blank" rel="noreferrer">
                  {Math.floor(s.seconds / 60)}:{String(s.seconds % 60).padStart(2, '0')} {s.title}
                </a>
                <br />
                {s.summary}
              </p>
            ))}
          </article>
        ))}
      </div>
      <p className="small-note">
        全{sources.length - 1}
        件の攻略資料・動画に加え、公式素材の出典を以下に掲載。動画ファイルと字幕はローカル調査用に保管しています。
      </p>
    </section>
  );
}

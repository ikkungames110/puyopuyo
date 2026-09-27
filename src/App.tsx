import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  BookOpen,
  ChartNoAxesCombined,
  ArrowUpRight,
  ArrowRight,
  Flame,
  Target,
  Zap,
  Layers3,
  SlidersHorizontal,
  ChevronLeft,
  Check,
  Clock3,
  ExternalLink,
  Search,
  RotateCcw,
  Sparkles,
  Library,
  Upload,
} from 'lucide-react';
import Puyo, { AssetContext } from './Puyo';
import Simulator, { SourceLinks } from './Simulator';
import {
  categories,
  drills,
  lessons,
  sources,
  type Category,
  type Drill,
  type QuizDrill,
} from './content';
import { readProgress, saveProgress, localDay, streak, type Progress } from './storage';
import { COLORS } from './engine';
type Page = 'home' | 'drills' | 'simulator' | 'knowledge' | 'progress' | 'sources' | 'settings';
const nav = [
  { id: 'home', label: 'ホーム', icon: LayoutDashboard },
  { id: 'drills', label: '練習ドリル', icon: Target },
  { id: 'simulator', label: 'シミュレーター', icon: Gamepad2 },
  { id: 'knowledge', label: '学習ノート', icon: BookOpen },
  { id: 'progress', label: '練習のきろく', icon: ChartNoAxesCombined },
] as const;
const titles: Record<Page, string> = {
  home: 'ホーム',
  drills: '練習ドリル',
  simulator: 'シミュレーター',
  knowledge: '学習ノート',
  progress: '練習のきろく',
  sources: '参考資料・クレジット',
  settings: '表示設定',
};
function Quiz({
  drill,
  onAttempt,
  onNext,
}: {
  drill: QuizDrill;
  onAttempt: (correct: boolean, seconds: number) => void;
  onNext: () => void;
}) {
  const [choice, setChoice] = useState<number | null>(null),
    [answered, setAnswered] = useState(false),
    [hint, setHint] = useState(false),
    [start] = useState(Date.now());
  return (
    <div className="quiz-layout">
      <section className="quiz-card">
        <div className="eyebrow">
          <span className="number-chip">Q</span> THINK & LEARN
        </div>
        <div className="task-tags">
          <span>{drill.category}</span>
          <span>{drill.level}</span>
        </div>
        <h2>{drill.title}</h2>
        <p className="question">{drill.question}</p>
        <div className="quiz-options">
          {drill.options.map((o, i) => (
            <button
              key={o}
              className={`${choice === i ? 'chosen' : ''} ${answered && i === drill.answer ? 'right-answer' : ''} ${answered && choice === i && i !== drill.answer ? 'wrong-answer' : ''}`}
              onClick={() => setChoice(i)}
              disabled={answered}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {o}
              {answered && i === drill.answer && <Check size={19} />}
            </button>
          ))}
        </div>
        <button
          className="primary"
          disabled={choice === null || answered}
          onClick={() => {
            setAnswered(true);
            onAttempt(choice === drill.answer, Math.round((Date.now() - start) / 1000));
          }}
        >
          答え合わせする
          <ArrowRight size={18} />
        </button>
        {answered && (
          <div className={`quiz-feedback ${choice === drill.answer ? 'right' : ''}`} role="status">
            <h3>
              {choice === drill.answer
                ? '正解！ 理解がひとつ深まりました。'
                : '正解を確認してみよう。'}
            </h3>
            <p>{drill.explanation}</p>
            <SourceLinks ids={drill.sources} />
            <button className="primary" onClick={onNext}>
              次の問題
              <ArrowRight size={16} />
            </button>
          </div>
        )}
      </section>
      <aside className="task-card quiz-aside">
        <div className="big-asterisk">✳</div>
        <h3>考え方を、身につける。</h3>
        <p>知識は実際の盤面で使ってこそ。答えを確かめたら、シミュレーターでも試してみよう。</p>
        <button className="hint-button" onClick={() => setHint(!hint)}>
          <Sparkles size={16} />
          ヒントをみる
        </button>
        {hint && <p className="hint-text">{drill.hint}</p>}
      </aside>
    </div>
  );
}
function loadAssets(): Record<number, string> {
  try {
    const v = JSON.parse(localStorage.getItem('puyolab-assets') || '{}');
    return Object.fromEntries(
      Object.entries(v).filter(
        ([k, s]) =>
          /^[1-6]$/.test(k) &&
          typeof s === 'string' &&
          /^data:image\/(png|jpeg|webp);base64,/.test(s),
      ),
    ) as Record<number, string>;
  } catch {
    return {};
  }
}
export default function App() {
  const [page, setPage] = useState<Page>('home');
  const [active, setActive] = useState<Drill | null>(null);
  const [category, setCategory] = useState<Category>('すべて');
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [progress, setProgress] = useState<Progress>(readProgress);
  const [assets, setAssets] = useState<Record<number, string>>(loadAssets);
  const [defaultAssets, setDefaultAssets] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    fetch('/official/manifest.json')
      .then((r) => (r.ok ? r.json() : {}))
      .then((v) => {
        if (!cancelled && v && typeof v === 'object')
          setDefaultAssets(
            Object.fromEntries(
              Object.entries(v).filter(
                ([k, path]) =>
                  /^[1-6]$/.test(k) &&
                  typeof path === 'string' &&
                  /^\/official\/[a-zA-Z0-9_]+\.png$/.test(path),
              ),
            ) as Record<number, string>,
          );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  const [toast, setToast] = useState('');
  const [revealConfirm, setRevealConfirm] = useState(false);
  const [session, setSession] = useState(0);
  const todayAttempts = progress.attempts.filter((a) => localDay(new Date(a.at)) === localDay());
  const mastered = new Set(progress.attempts.filter((a) => a.correct).map((a) => a.id));
  const latest = new Map(progress.attempts.map((a) => [a.id, a]));
  const review = new Set([...latest].filter(([, a]) => !a.correct).map(([id]) => id));
  const accuracy = progress.attempts.length
    ? Math.round(
        (progress.attempts.filter((a) => a.correct).length / progress.attempts.length) * 100,
      )
    : 0;
  const featured = drills.find((d) => d.id === 'stairs-3')!;
  const current = active ?? featured;
  function go(p: Page) {
    setPage(p);
    setActive(null);
    setSession((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function openDrill(d: Drill) {
    setActive(d);
    setPage('drills');
    setSession((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function persist(p: Progress) {
    setProgress(p);
    if (!saveProgress(p))
      setToast(
        'ブラウザへの保存ができませんでした。記録はこの画面を開いている間だけ保持されます。',
      );
  }
  function attempt(correct: boolean, seconds: number) {
    setProgress((p) => {
      const next = {
        ...p,
        attempts: [
          ...p.attempts,
          { id: current.id, correct, seconds, at: new Date().toISOString() },
        ].slice(-2000),
      };
      if (!saveProgress(next)) setToast('記録を保存できませんでした。この画面内でのみ保持します。');
      return next;
    });
  }
  function best(chain: number) {
    if (chain > progress.bestChain) {
      setProgress((p) => {
        const next = { ...p, bestChain: chain };
        saveProgress(next);
        return next;
      });
    }
  }
  function next() {
    const at = drills.findIndex((d) => d.id === current.id);
    openDrill(drills[(at + 1) % drills.length]);
  }
  const filtered = drills.filter(
    (d) =>
      (category === 'すべて' || d.category === category) &&
      (!reviewOnly || review.has(d.id)) &&
      `${d.title}${d.description}`.includes(search),
  );
  const renderPractice = (d: Drill) =>
    d.type === 'placement' ? (
      <Simulator
        key={`${d.id}-${session}`}
        drill={d}
        onAttempt={attempt}
        onBest={best}
        onNext={next}
      />
    ) : (
      <Quiz key={`${d.id}-${session}`} drill={d} onAttempt={attempt} onNext={next} />
    );
  return (
    <AssetContext.Provider value={{ ...defaultAssets, ...assets }}>
      <div className="app-shell">
        <aside className="sidebar">
          <button className="brand" onClick={() => go('home')} aria-label="PUYO LAB ホーム">
            <div className="brand-mark">
              <Puyo color={2} />
              <Puyo color={3} />
            </div>
            <div>
              PUYO<span>LAB</span>
              <small>ぷよぷよ練習室</small>
            </div>
          </button>
          <div className="sidebar-label">LET'S PRACTICE</div>
          <nav>
            {nav.map((item) => (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => go(item.id)}
              >
                <item.icon size={19} />
                {item.label}
                {item.id === 'drills' && <span className="nav-count">{drills.length}</span>}
              </button>
            ))}
          </nav>
          <div className="sidebar-motivation">
            <div className="little-sparkles">
              ✳ <span>✧</span>
            </div>
            <strong>
              ひとつの「わかった」が、
              <br />
              次の連鎖になる。
            </strong>
            <p>今日も自分のペースで。</p>
            <div className="motivation-line">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="sidebar-bottom">
            <button onClick={() => go('sources')} className={page === 'sources' ? 'active' : ''}>
              <Library size={17} />
              参考資料・クレジット
              <ArrowUpRight size={15} />
            </button>
            <button onClick={() => go('settings')} className={page === 'settings' ? 'active' : ''}>
              <SlidersHorizontal size={17} />
              表示設定
            </button>
            <div className="sidebar-footer">
              <span className="status-dot" /> YOUR PERSONAL PRACTICE ROOM
              <small>Unofficial fan-made learning project</small>
            </div>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <div className="breadcrumbs">
              練習室<span>/</span>
              <strong>{titles[page]}</strong>
            </div>
            <div className="topbar-right">
              <span className="streak">
                <Flame size={17} />
                {streak(progress)} 日継続
              </span>
              <button className="profile-icon" onClick={() => go('settings')} aria-label="表示設定">
                P
              </button>
            </div>
          </header>
          <main>
            {toast && (
              <div className="toast" role="status">
                {toast}
                <button onClick={() => setToast('')}>閉じる</button>
              </div>
            )}
            {page === 'home' && (
              <>
                <section className="welcome-banner">
                  <div className="banner-copy">
                    <div className="eyebrow">
                      <span /> THINK. CONNECT. GROW.
                    </div>
                    <h1>
                      ひとつ先の、
                      <br className="mobile-only" />
                      連鎖へ。
                    </h1>
                    <p>
                      考えて、置いて、わかる。
                      <br className="mobile-only" />
                      毎日の小さな練習を、確かな力に。
                    </p>
                    <div className="banner-tags">
                      <span>
                        <Check size={13} />
                        登録不要
                      </span>
                      <span>
                        <Check size={13} />
                        自分のペースで
                      </span>
                      <span>
                        <Check size={13} />
                        答え合わせつき
                      </span>
                    </div>
                  </div>
                  <div className="banner-art" aria-hidden="true">
                    <div className="art-grid" />
                    <span className="art-star one">✳</span>
                    <span className="art-star two">✧</span>
                    <div className="floating-puyo p1">
                      <Puyo color={2} />
                    </div>
                    <div className="floating-puyo p2">
                      <Puyo color={3} />
                    </div>
                    <div className="floating-puyo p3">
                      <Puyo color={4} />
                    </div>
                    <div className="floating-puyo p4">
                      <Puyo color={1} />
                    </div>
                    <span className="art-label">MAKE YOUR NEXT MOVE.</span>
                  </div>
                </section>
                <section className="stat-row">
                  <div>
                    <span className="stat-icon mint">
                      <Target size={21} />
                    </span>
                    <div>
                      <span>今日のチャレンジ</span>
                      <strong>
                        {todayAttempts.length}
                        <small> 問</small>
                      </strong>
                    </div>
                    <span className="stat-aside">目標 5問</span>
                  </div>
                  <div>
                    <span className="stat-icon blue">
                      <Check size={21} />
                    </span>
                    <div>
                      <span>クリアしたドリル</span>
                      <strong>
                        {mastered.size}
                        <small> / {drills.length} 問</small>
                      </strong>
                    </div>
                  </div>
                  <div>
                    <span className="stat-icon yellow">
                      <Zap size={21} />
                    </span>
                    <div>
                      <span>最高連鎖</span>
                      <strong>
                        {progress.bestChain}
                        <small> 連鎖</small>
                      </strong>
                    </div>
                    <span className="stat-aside">練習の積み重ね</span>
                  </div>
                </section>
                <div className="section-heading">
                  <div>
                    <span className="small-kicker">DAILY PRACTICE</span>
                    <h2>
                      今日の一問<span className="pill">まずはここから</span>
                    </h2>
                  </div>
                  <button className="text-link" onClick={() => go('drills')}>
                    すべてのドリル
                    <ArrowRight size={17} />
                  </button>
                </div>
                {renderPractice(featured)}
                <div className="section-heading lower-heading">
                  <div>
                    <span className="small-kicker">FIND YOUR FOCUS</span>
                    <h2>伸ばしたい力を選ぼう</h2>
                  </div>
                </div>
                <div className="focus-grid">
                  {categories.slice(1).map((c, i) => {
                    const Icon = [Layers3, Zap, Target, Gamepad2][i];
                    return (
                      <button
                        key={c}
                        className={`focus-card focus-${i}`}
                        onClick={() => {
                          setCategory(c);
                          setReviewOnly(false);
                          go('drills');
                        }}
                      >
                        <span className="focus-icon">
                          <Icon size={23} />
                        </span>
                        <span className="focus-index">0{i + 1}</span>
                        <h3>{c}</h3>
                        <p>
                          {
                            [
                              '一手先を考える、配置の練習。',
                              '消える順番から、形を理解する。',
                              '小さな攻撃と、状況を読む力。',
                              '迷いのない、正確な操作へ。',
                            ][i]
                          }
                        </p>
                        <div>
                          {drills.filter((d) => d.category === c).length} ドリル
                          <ArrowUpRight size={20} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {page === 'drills' &&
              (active ? (
                <>
                  <button className="back-link" onClick={() => setActive(null)}>
                    <ChevronLeft size={16} />
                    ドリル一覧に戻る
                  </button>
                  <div className="page-heading">
                    <span className="small-kicker">PRACTICE DRILL</span>
                    <h1>{active.title}</h1>
                    <p>答えだけでなく、考え方を持ち帰ろう。</p>
                  </div>
                  {renderPractice(active)}
                </>
              ) : (
                <>
                  <div className="page-heading">
                    <span className="small-kicker">PRACTICE LIBRARY</span>
                    <h1>小さな練習、大きな一歩。</h1>
                    <p>{drills.length}問のドリルで、配置・連鎖・対戦判断・操作を少しずつ。</p>
                  </div>
                  <div className="filter-bar">
                    <div className="filter-tabs">
                      {categories.map((c) => (
                        <button
                          className={category === c ? 'selected' : ''}
                          onClick={() => setCategory(c)}
                          key={c}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <label className="search-box">
                      <Search size={16} />
                      <input
                        placeholder="ドリルを検索"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="list-meta">
                    <span>{filtered.length} 件のドリル</span>
                    <label>
                      <input
                        type="checkbox"
                        checked={reviewOnly}
                        onChange={(e) => setReviewOnly(e.target.checked)}
                      />
                      間違えた問題だけ（{review.size}）
                    </label>
                  </div>
                  <div className="drill-grid">
                    {filtered.map((d, i) => (
                      <button className="drill-card" key={d.id} onClick={() => openDrill(d)}>
                        <div className="drill-card-top">
                          <span className={`type-icon ${d.type}`}>
                            {d.type === 'placement' ? (
                              <Gamepad2 size={23} />
                            ) : (
                              <BookOpen size={23} />
                            )}
                          </span>
                          <span className="drill-index">{String(i + 1).padStart(2, '0')}</span>
                          {mastered.has(d.id) && (
                            <span className="completed-badge">
                              <Check size={13} />
                              CLEAR
                            </span>
                          )}
                        </div>
                        <div className="task-tags">
                          <span>{d.category}</span>
                          <span className="level">{d.level}</span>
                        </div>
                        <h3>{d.title}</h3>
                        <p>{d.description}</p>
                        <div className="drill-card-bottom">
                          <span>
                            {d.type === 'placement' ? '実際に置いて回答' : '選択式クイズ'}
                          </span>
                          <ArrowRight size={19} />
                        </div>
                      </button>
                    ))}
                  </div>
                  {!filtered.length && (
                    <div className="empty-state">
                      <Target size={34} />
                      <h3>
                        {reviewOnly ? '復習待ちの問題はありません' : '該当するドリルがありません'}
                      </h3>
                      <p>フィルターや検索条件を変えてみてください。</p>
                      <button
                        className="secondary"
                        onClick={() => {
                          setReviewOnly(false);
                          setCategory('すべて');
                          setSearch('');
                        }}
                      >
                        すべて表示
                      </button>
                    </div>
                  )}
                </>
              ))}
            {page === 'simulator' && (
              <>
                <div className="page-heading">
                  <span className="small-kicker">FREE PLAY</span>
                  <h1>思いついたら、試してみよう。</h1>
                  <p>置き直して、見比べて。自分だけの連鎖をつくる実験室。</p>
                </div>
                <Simulator onAttempt={() => {}} onBest={best} />
              </>
            )}
            {page === 'knowledge' && (
              <>
                <div className="page-heading">
                  <span className="small-kicker">LEARNING NOTES</span>
                  <h1>「なんとなく」を、理解に。</h1>
                  <p>調査した講座の考え方を、練習につながる短いノートにまとめました。</p>
                </div>
                <div className="lesson-grid">
                  {lessons.map((l, i) => (
                    <article className="lesson-card" key={l.title}>
                      <span className="lesson-number">0{i + 1}</span>
                      <span className="pill">{l.tag}</span>
                      <h2>{l.title}</h2>
                      <p>{l.text}</p>
                      <SourceLinks ids={l.sources} />
                      <button
                        className="text-link"
                        onClick={() => {
                          setCategory(l.tag as Category);
                          setReviewOnly(false);
                          go('drills');
                        }}
                      >
                        関連するドリルへ
                        <ArrowRight size={16} />
                      </button>
                    </article>
                  ))}
                </div>
                <div className="small-note wide">
                  <BookOpen />
                  <p>
                    問題の盤面・選択肢・解説は本サイト用に作成しました。参考先の図や問題の転載ではありません。対戦判断は状況依存のため、問題に書かれた条件での推奨を答えとしています。
                  </p>
                </div>
              </>
            )}
            {page === 'progress' && (
              <>
                <div className="page-heading">
                  <span className="small-kicker">YOUR PROGRESS</span>
                  <h1>できることが、増えていく。</h1>
                  <p>このブラウザに、あなたの練習の歩みを保存しています。</p>
                </div>
                <div className="progress-stats">
                  <div>
                    <Target />
                    <strong>{progress.attempts.length}</strong>
                    <span>回答した問題</span>
                  </div>
                  <div>
                    <Check />
                    <strong>
                      {accuracy}
                      <small>%</small>
                    </strong>
                    <span>回答の正答率</span>
                  </div>
                  <div>
                    <Flame />
                    <strong>
                      {streak(progress)}
                      <small>日</small>
                    </strong>
                    <span>継続日数</span>
                  </div>
                  <div>
                    <Zap />
                    <strong>{progress.bestChain}</strong>
                    <span>最高連鎖</span>
                  </div>
                </div>
                <section className="week-card">
                  <h2>この7日間の練習</h2>
                  <div className="week-bars">
                    {Array.from({ length: 7 }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - 6 + i);
                      const count = progress.attempts.filter(
                        (a) => localDay(new Date(a.at)) === localDay(d),
                      ).length;
                      return (
                        <div key={i}>
                          <span>{count}問</span>
                          <div className="bar-track">
                            <i style={{ height: `${Math.min(100, count * 12)}%` }} />
                          </div>
                          <small>
                            {d.getMonth() + 1}/{d.getDate()}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <div className="section-heading">
                  <h2>カテゴリー別のクリア状況</h2>
                  <button
                    className="text-link"
                    onClick={() => {
                      setReviewOnly(true);
                      setCategory('すべて');
                      go('drills');
                    }}
                  >
                    <RotateCcw size={16} />
                    復習する（{review.size}）
                  </button>
                </div>
                <div className="category-progress">
                  {categories.slice(1).map((c) => {
                    const all = drills.filter((d) => d.category === c),
                      count = all.filter((d) => mastered.has(d.id)).length;
                    return (
                      <div key={c}>
                        <div>
                          <strong>{c}</strong>
                          <span>
                            {count} / {all.length}
                          </span>
                        </div>
                        <progress value={count} max={all.length} />
                      </div>
                    );
                  })}
                </div>
                <h2 className="history-title">最近の回答</h2>
                {progress.attempts.length ? (
                  <div className="history-list">
                    {progress.attempts
                      .slice(-15)
                      .reverse()
                      .map((a, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            const d = drills.find((d) => d.id === a.id);
                            if (d) openDrill(d);
                          }}
                        >
                          <span className={`result-dot ${a.correct ? 'right' : ''}`}>
                            {a.correct ? <Check size={15} /> : <RotateCcw size={15} />}
                          </span>
                          <strong>{drills.find((d) => d.id === a.id)?.title ?? a.id}</strong>
                          <span>
                            <Clock3 size={13} />
                            {a.seconds}秒
                          </span>
                          <time>{new Date(a.at).toLocaleDateString('ja-JP')}</time>
                          <ArrowRight size={16} />
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <BookOpen size={34} />
                    <h3>はじめの一問を、ここから。</h3>
                    <p>ドリルに回答すると記録が表示されます。</p>
                    <button className="primary" onClick={() => go('drills')}>
                      ドリルを選ぶ
                      <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
            {page === 'sources' && (
              <>
                <div className="page-heading">
                  <span className="small-kicker">SOURCES & CREDITS</span>
                  <h1>学びの、その先へ。</h1>
                  <p>
                    公式資料とプレイヤーの講座をもとに、練習テーマを組み立てています。確認日：2026年9月28日。
                  </p>
                </div>
                <div className="source-list">
                  {sources.map((s, i) => (
                    <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                      <span className="source-number">{String(i + 1).padStart(2, '0')}</span>
                      <div>
                        <small>{s.author}</small>
                        <h3>{s.title}</h3>
                        <p>{s.note}</p>
                      </div>
                      <ExternalLink size={18} />
                    </a>
                  ))}
                </div>
                <section className="license-card">
                  <h2>素材とシミュレーションについて</h2>
                  <a
                    className="text-link"
                    href="/official/SEGA_License.txt"
                    target="_blank"
                    rel="noreferrer"
                  >
                    素材に付属する利用許諾書 ↗
                  </a>
                  <p>
                    PUYO
                    LABは非公式の練習用プロジェクトです。株式会社セガとの提携・監修を示すものではありません。「ぷよぷよ」の権利は株式会社セガに帰属します。
                  </p>
                  <p>
                    このローカル環境では「ぷよぷよプログラミング」由来の公式ぷよ画像を使用しています（©SEGA）。配布教材を収録した第三者リポジトリから原画像と利用許諾書を取得し、画像を改変せず表示しています。素材はGit管理の対象外です。一般公開・再配布を行う場合は配布元の利用条件を別途確認してください。
                  </p>
                  <p>
                    6列×12段と非表示の13段目、4個消し、重力、連鎖、色ぷよの消去得点を実装。13段目では消去判定を行いません。回転は基本の壁・床補正のみで、クイックターン・先行入力・製品ごとのフレーム挙動・対戦相殺は対象外です。全消しは検出しますが、ボーナスの持越しは行いません。
                  </p>
                </section>
              </>
            )}
            {page === 'settings' && (
              <>
                <div className="page-heading">
                  <span className="small-kicker">PERSONALIZE</span>
                  <h1>あなたの練習環境に。</h1>
                  <p>表示と記録はこのブラウザ内に保存されます。</p>
                </div>
                <section className="settings-card">
                  <h2>ぷよの画像を読み込む</h2>
                  <p>
                    利用許諾を確認した公式素材を、色ごとに設定できます。PNG・WebP・JPEG対応。画像は外部へ送信されません。透過PNGを推奨します。
                  </p>
                  <a
                    className="text-link"
                    href="https://puyo.sega.jp/program_2020/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    公式教材と利用条件を確認
                    <ExternalLink size={15} />
                  </a>
                  <div className="asset-grid">
                    {[1, 2, 3, 4, 5, 6].map((c) => (
                      <label key={c}>
                        <Puyo color={c as 1} />
                        <span>{COLORS[c]}</span>
                        <span className="asset-upload">
                          <Upload size={14} />
                          {assets[c] ? '変更する' : '読み込む'}
                        </span>
                        <input
                          type="file"
                          accept="image/png,image/webp,image/jpeg"
                          hidden
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (
                              !['image/png', 'image/webp', 'image/jpeg'].includes(file.type) ||
                              file.size > 500000
                            ) {
                              setToast('500KB以下のPNG・WebP・JPEGを選んでください。');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = () => {
                              const image = new Image();
                              image.onload = () => {
                                const nextAssets = { ...assets, [c]: String(reader.result) };
                                setAssets(nextAssets);
                                try {
                                  localStorage.setItem(
                                    'puyolab-assets',
                                    JSON.stringify(nextAssets),
                                  );
                                  setToast(`${COLORS[c]}の画像を保存しました。`);
                                } catch {
                                  setToast('保存容量が足りないため、画像は今回のみ適用します。');
                                }
                              };
                              image.onerror = () =>
                                setToast('画像を読み込めませんでした。別の画像を選んでください。');
                              image.src = String(reader.result);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    onClick={() => {
                      setAssets({});
                      try {
                        localStorage.removeItem('puyolab-assets');
                      } catch {
                        /* private mode */
                      }
                    }}
                  >
                    追加した画像を解除する
                  </button>
                </section>
                <section className="settings-card">
                  <h2>学習記録</h2>
                  <p>
                    正答率や復習リストは、この端末のこのブラウザに保存されます。アカウント間の同期はありません。
                  </p>
                  <button
                    className="secondary"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(progress, null, 2)], {
                        type: 'application/json',
                      });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'puyo-lab-progress.json';
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    記録をダウンロード
                  </button>
                  <button className="danger-text" onClick={() => setRevealConfirm(!revealConfirm)}>
                    記録をリセット
                  </button>
                  {revealConfirm && (
                    <div className="reset-confirm">
                      <p>
                        このブラウザの回答履歴と最高連鎖をすべて削除します。この操作は元に戻せません。
                      </p>
                      <button className="secondary" onClick={() => setRevealConfirm(false)}>
                        キャンセル
                      </button>
                      <button
                        className="danger-button"
                        onClick={() => {
                          persist({ attempts: [], bestChain: 0 });
                          setRevealConfirm(false);
                        }}
                      >
                        すべて削除する
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            <footer className="main-footer">
              <span>
                PUYO LAB<span className="footer-dot">·</span>ぷよ画像 ©SEGA
              </span>
              <button onClick={() => go('sources')}>
                参考資料・素材について
                <ArrowUpRight size={13} />
              </button>
            </footer>
          </main>
        </div>
      </div>
    </AssetContext.Provider>
  );
}

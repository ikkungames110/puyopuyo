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
  Library,
  Upload,
} from 'lucide-react';
import Puyo, { AssetContext } from './Puyo';
import Simulator from './Simulator';
import NextTrainer from './NextTrainer';
import QuizTrainer from './QuizTrainer';
import StudyLibrary, { ResearchVideos, type StudySeed } from './StudyLibrary';
import {
  categories,
  topics,
  practiceDrills as drills,
  sources,
  drillTags,
  matchesDrillSearch,
  type Category,
  type PracticeDrill as Drill,
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
  const [sandboxSeed, setSandboxSeed] = useState<StudySeed | undefined>();
  const [active, setActive] = useState<Drill | null>(null);
  const [category, setCategory] = useState<Category>('すべて');
  const [topic, setTopic] = useState('すべて');
  const [difficulty, setDifficulty] = useState('すべて');
  const [turnCount, setTurnCount] = useState('すべて');
  const [search, setSearch] = useState('');
  const [reviewOnly, setReviewOnly] = useState(false);
  const [progress, setProgress] = useState<Progress>(() => {
    const p = readProgress();
    return { ...p, attempts: p.attempts.filter((a) => drills.some((d) => d.id === a.id)) };
  });
  const [assets, setAssets] = useState<Record<number, string>>(loadAssets);
  const [defaultAssets, setDefaultAssets] = useState<Record<number, string>>({});
  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}official/manifest.json`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((v) => {
        if (!cancelled && v && typeof v === 'object')
          setDefaultAssets(
            Object.fromEntries(
              Object.entries(v)
                .filter(
                  ([k, path]) =>
                    /^[1-6]$/.test(k) &&
                    typeof path === 'string' &&
                    /^\/official\/[a-zA-Z0-9_]+\.png$/.test(path),
                )
                .map(([k, path]) => [k, `${import.meta.env.BASE_URL}${(path as string).slice(1)}`]),
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
  const featured = drills.find((d) => d.id === 'next-piro-1-2')!;
  const current = active ?? featured;
  function go(p: Page) {
    setSandboxSeed(undefined);
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
    const list = filtered.some((d) => d.id === current.id) ? filtered : drills;
    const at = list.findIndex((d) => d.id === current.id);
    openDrill(list[(at + 1) % list.length]);
  }
  function searchTag(tag: string) {
    setSearch(`#${tag}`);
    setCategory('すべて');
    setTopic('すべて');
    setDifficulty('すべて');
    setTurnCount('すべて');
    setReviewOnly(false);
    go('drills');
  }
  const filtered = drills.filter(
    (d) =>
      (category === 'すべて' ||
        (category === '次の一手' && d.type === 'sequence') ||
        d.category === category) &&
      (!reviewOnly || review.has(d.id)) &&
      (topic === 'すべて' || d.topic === topic) &&
      (difficulty === 'すべて' || d.level === difficulty) &&
      (turnCount === 'すべて' || (d.type === 'sequence' && d.queue.length === Number(turnCount))) &&
      matchesDrillSearch(d, search),
  );
  const renderPractice = (d: Drill) =>
    d.type === 'quiz' ? (
      <QuizTrainer
        key={`${d.id}-${session}`}
        drill={d}
        onAttempt={attempt}
        onNext={next}
        onTag={searchTag}
      />
    ) : (
      <>
        <div className="tag-list">
          {drillTags(d).map((tag) => (
            <button className="tag-button" key={tag} onClick={() => searchTag(tag)}>
              #{tag}
            </button>
          ))}
        </div>
        <NextTrainer
          key={`${d.id}-${session}`}
          drill={d}
          onAttempt={attempt}
          onBest={best}
          onNext={next}
        />
      </>
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
                      連鎖尾・折り返し・催促を、{drills.length}の盤面で。
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
                      今日の一問<span className="pill">NEXTを読んで組む</span>
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
                    const Icon = [Layers3, Target, Gamepad2, BookOpen][i];
                    return (
                      <button
                        key={c}
                        className={`focus-card focus-${i}`}
                        onClick={() => {
                          setCategory(c);
                          setTopic('すべて');
                          setDifficulty('すべて');
                          setTurnCount('すべて');
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
                              '1〜3手先まで読む、接続の実戦ドリル。',
                              '短い攻撃を撃ち、本線を残す配置。',
                              'ちぎらずに、接続を完成させる手順。',
                              '図を比べて、段差・配色・消去順を判断。',
                            ][i]
                          }
                        </p>
                        <div>
                          {
                            drills.filter(
                              (d) =>
                                (c === '次の一手' && d.type === 'sequence') || d.category === c,
                            ).length
                          }{' '}
                          ドリル
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
                    <h1>次の一手を、深く読む。</h1>
                    <p>
                      {drills.length}問・{topics.length}
                      テーマ。配置問題と、図を比較する判断問題で練習。
                    </p>
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
                        aria-label="ドリルを検索（キーワード・#タグ）"
                        aria-describedby="tag-search-help"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                  </div>
                  <p id="tag-search-help" className="search-help">
                    #タグで絞り込み。スペースで区切るとすべての条件に一致する問題を探せます。
                  </p>
                  <div className="tag-list" aria-label="タグで検索">
                    {[
                      '記事n951e68d4fdb9',
                      '最善手',
                      '記事104662',
                      'ちぇすな',
                      'GTR',
                      '雪崩',
                      'Y字下ゾロ',
                      'Y字下二色',
                      '鶴亀',
                      '仕込み',
                    ].map((tag) => (
                      <button className="tag-button" key={tag} onClick={() => searchTag(tag)}>
                        #{tag}
                      </button>
                    ))}
                  </div>
                  <div className="advanced-filters">
                    <label>
                      テーマ
                      <select
                        aria-label="テーマ"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                      >
                        <option>すべて</option>
                        {topics.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      難易度
                      <select
                        aria-label="難易度"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option>すべて</option>
                        <option>中級</option>
                        <option>上級</option>
                      </select>
                    </label>
                    <label>
                      構築手数
                      <select
                        aria-label="構築手数"
                        value={turnCount}
                        onChange={(e) => setTurnCount(e.target.value)}
                      >
                        <option>すべて</option>
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n}手
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="research-summary">
                    盤面とツモから置き方を考える配置問題と、図を比較する判断問題です。「多重折りは三種類しかない」から最大連鎖を目指す9問を追加。各問題に出典を記載しています。
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
                            <Gamepad2 size={23} />
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
                          <span>{d.topic}</span>
                          <span className="level">{d.level}</span>
                        </div>
                        <div className="drill-preview" aria-hidden="true">
                          <div className="mini-field">
                            {d.board
                              .slice(0, 12)
                              .reverse()
                              .flatMap((row, y) =>
                                row.map((c, x) => (
                                  <span key={`${x}-${y}`} className={`mini-cell color-${c}`} />
                                )),
                              )}
                          </div>
                          <div className="preview-queue">
                            {d.type === 'sequence' ? (
                              <>
                                <span>{d.queue.length}手で構築</span>
                                <div>
                                  {d.queue.map((p, i) => (
                                    <span key={i} className="preview-pair">
                                      <Puyo color={p[1]} />
                                      <Puyo color={p[0]} />
                                    </span>
                                  ))}
                                </div>
                                <small>
                                  {d.attack ? '攻撃後に' : ''}
                                  {d.objective === 'max-chains'
                                    ? '最大連鎖を目指す'
                                    : `${d.minChains}連鎖以上`}
                                  {d.noSplit ? ' · ちぎり0' : ''}
                                </small>
                              </>
                            ) : (
                              <>
                                <span>図を読んで判断</span>
                                <small>{d.diagrams.length}図を比較 · 選択式</small>
                              </>
                            )}
                          </div>
                        </div>
                        <h3>{d.title}</h3>
                        <p>{d.description}</p>
                        <div className="tag-list card-tags">
                          {drillTags(d)
                            .slice(0, 8)
                            .map((tag) => (
                              <span key={tag}>#{tag}</span>
                            ))}
                        </div>
                        <div className="drill-card-bottom">
                          <span>
                            {sources
                              .find((s) => s.id === d.sources[0])
                              ?.author.split(' / ')
                              .at(-1)}
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
                          setTopic('すべて');
                          setDifficulty('すべて');
                          setTurnCount('すべて');
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
                <Simulator key={session} initial={sandboxSeed} onAttempt={() => {}} onBest={best} />
              </>
            )}
            {page === 'knowledge' && (
              <StudyLibrary
                onTopic={(nextTopic, nextCategory) => {
                  setCategory(nextCategory as Category);
                  setTopic(nextTopic);
                  setDifficulty('すべて');
                  setTurnCount('すべて');
                  setReviewOnly(false);
                  setSearch('');
                  go('drills');
                }}
                onPractice={(d) => {
                  go('drills');
                  setActive(d);
                }}
                onSeed={(seed) => {
                  go('simulator');
                  setSandboxSeed(seed);
                }}
              />
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
                      setTopic('すべて');
                      setDifficulty('すべて');
                      setTurnCount('すべて');
                      setSearch('');
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
                    const all = drills.filter(
                        (d) => (c === '次の一手' && d.type === 'sequence') || d.category === c,
                      ),
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
                <ResearchVideos />
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
                  {Object.keys(defaultAssets).length > 0 && (
                    <a
                      className="text-link"
                      href={`${import.meta.env.BASE_URL}official/SEGA_License.txt`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      素材に付属する利用許諾書 ↗
                    </a>
                  )}
                  <p>
                    PUYO
                    LABは非公式の練習用プロジェクトです。株式会社セガとの提携・監修を示すものではありません。「ぷよぷよ」の権利は株式会社セガに帰属します。
                  </p>
                  <p>
                    {Object.keys(defaultAssets).length > 0
                      ? '「ぷよぷよプログラミング」由来の公式ぷよ画像を使用しています（©SEGA）。配布教材を収録した第三者リポジトリから原画像と利用許諾書を取得し、画像を改変せず表示しています。'
                      : '標準のぷよ表示には、このアプリに同梱したイラストを使用しています。公式ぷよ画像は配信していません。表示設定で読み込んだ画像は、このブラウザ内にのみ保存されます。'}
                  </p>
                  <p>
                    6列×12段と非表示の13段目、4個消し、重力、連鎖、色ぷよの消去得点を実装。13段目では消去判定を行いません。基本の壁・床補正、クイックターン、長押し移動、ゲームパッド入力に対応。先行入力・製品ごとのフレーム挙動・対戦相殺は対象外です。全消しは検出しますが、ボーナスの持越しは行いません。
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

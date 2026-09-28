import type { Board, Pair, Resolution, Cell, Action } from './engine';
import nextDrills from './data/next-drills.json' with { type: 'json' };
import researchSources from './data/research-sources.json' with { type: 'json' };
import researchVideos from './data/research-videos.json' with { type: 'json' };
import studyNotes from './data/study-notes.json' with { type: 'json' };
export const videos = researchVideos;
export const sources = [
  ...researchSources,
  {
    id: 'mid',
    title: '中盤戦術技術徹底攻略 第一部',
    author: 'Rilium / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/89527',
    note: '本線を残す催促・マルチの考え方を、残しも判定する配置問題に反映。',
  },
  {
    id: 'watch',
    title: '中盤戦術技術徹底攻略 第二部',
    author: 'Rilium / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/89528',
    note: '相手の発火点・隙・対応を見る判断材料。盤面単体で実戦の最善手とは断定しない。',
  },
  {
    id: 'camp-tail',
    title: '連鎖尾手順を考えてみる その1',
    author: 'ヌリトオ / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/163665',
    note: '完成図からの手順課題と、NEXTの受け入れ・段差・ちぎりを考える制約に反映。',
  },
  {
    id: 'delta-next',
    title: '【★★★】次の2手、どこに置く？ #9',
    author: 'delta / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/179167',
    note: '多重折りの空間、横3の作り方、後続ツモで置き方を変える視点を学習ノートへ反映。',
  },
  {
    id: 'next',
    title: '「床ぷよ」を使った連鎖尾の組み方のコツ',
    author: 'けいたそ！ / ぷよぷよのコツ',
    url: 'https://keepuyo.com/nextmove6/',
    note: '床の色と、ちぎりを避けながら連鎖尾へ使う発想を配置条件に反映。',
  },
  {
    id: 'keep-fold',
    title: '先折りGTRで多重折り返しを組む',
    author: 'けいたそ！ / ぷよぷよのコツ',
    url: 'https://keepuyo.com/nextmove31/',
    note: '折り返し上の空間を使う考え方。完成形の暗記ではなく接続を検証する課題へ反映。',
  },
  {
    id: 'piro',
    title: '【ぷよぷよ土台解説】だぁ積みの特徴と組み方を解説します',
    author: 'ぴろぷよ / ぴろぷよの超ぷよぷよ研究所',
    url: 'https://piropuyo.com/puyopuyo-daa/',
    note: '後折り、底上げ、逆L字の完成例から1〜3手の構築問題を作成。',
  },
  {
    id: 'euphonic',
    title: 'GTR連鎖尾',
    author: 'ぷよブロ！',
    url: 'https://puyo-euphonic.com/puyo-gtr-tale',
    note: '連鎖尾側からの逆発火の形を、同色連鎖の接続問題に加工。',
  },
  {
    id: 'log-tail',
    title: '【連鎖講座その5】簡単な連鎖尾を覚える',
    author: 'Oscillator / PUYOLOG',
    url: 'https://puyopuyo.hatenablog.jp/entry/rensa5',
    note: '9連鎖のかんぬき・雪崩の例から、後半を補う構築問題を作成。',
  },
  {
    id: 'shiro',
    title: 'GTRの組み方のコツと発火点・連鎖尾の伸ばし方',
    author: 'しろまるライフ',
    url: 'https://shiromaru-life.com/puyopuyo-gtr/',
    note: '応用図の多重折りと連鎖尾の順序交換を、構築手順の課題に加工。',
  },
  {
    id: 'free',
    title: '多連鎖組みの基本・GTRをマスターせよ',
    author: 'チャイフ / Free Steps',
    url: 'https://freesteps.jp/puyo_4',
    note: '折り返しと連鎖尾を別々の延長経路として扱う視点をノートへ反映。',
  },
  {
    id: 'score',
    title: '得点 — 対戦講座',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/taisen11.html',
    note: '消去数・連結・色数・連鎖の得点計算を参照。',
  },
  {
    id: 'assets',
    title: 'ぷよぷよプログラミング',
    author: 'SEGA / Monaca Education',
    url: 'https://puyo.sega.jp/program_2020/',
    note: '公式学習素材。個人のローカル環境で利用。画像ファイルはGit管理対象外。',
  },
  {
    id: 'alg8',
    title: '連鎖尾',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain8.html',
    note: '雪崩と段差の完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg25',
    title: '連鎖尾2',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain25.html',
    note: '残る色の回収の完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg11',
    title: '連鎖尾3',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain11.html',
    note: '潜り込み・斉藤SPの完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg14',
    title: '連鎖尾4',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain14.html',
    note: '消去後の高さを合わせる応用の完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg9',
    title: 'クッション',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain9.html',
    note: '折り返しに挟む色と部分発火の完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg16',
    title: '底上げ',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain16.html',
    note: '接続の高さを支える配置の完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg10',
    title: '同色連鎖',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain10.html',
    note: '同色の消去を別の段階に分ける完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg21',
    title: '連鎖の変化',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain21.html',
    note: '発火点・対応関係の組み替えの完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
  {
    id: 'alg5',
    title: 'GTR',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/chain5.html',
    note: '折り返しと連鎖尾の多様な接続の完成例から、ツモと欠けた接続を設定した練習問題を作成。',
  },
];
export const categories = ['すべて', '次の一手', '催促・判断', '操作の最適化'] as const;
export type Category = (typeof categories)[number];
type Base = {
  id: string;
  title: string;
  category: Category;
  level: '中級' | '上級';
  description: string;
  hint: string;
  explanation: string;
  sources: string[];
};
export type PlacementDrill = Base & {
  type: 'placement';
  board: Board;
  pair: Pair;
  goal: {
    chains?: number;
    minScore?: number;
    allClear?: boolean;
    colorsOnSecond?: number;
    target?: Cell[];
    maxInputs?: number;
  };
};
export type QuizDrill = Base & {
  type: 'quiz';
  question: string;
  options: string[];
  answer: number;
};
export type SequenceDrill = Base & {
  type: 'sequence';
  topic: string;
  board: Board;
  queue: Pair[];
  probe: Pair;
  minChains: number;
  witness: Action[][];
  origin: string;
  motif: string;
  solutionNote: string;
  noSplit: boolean;
  attack?: { min: number; max: number; minScore: number };
};
export type Drill = SequenceDrill;
export const drills: Drill[] = nextDrills as SequenceDrill[];
export const topics = [...new Set(nextDrills.map((d) => d.topic))];
export function isCorrect(d: PlacementDrill, result: Resolution, target: Cell[], inputs: number) {
  const g = d.goal;
  return (
    (!g.chains || result.chains >= g.chains) &&
    (!g.minScore || result.score >= g.minScore) &&
    (!g.allClear || result.allClear) &&
    (!g.colorsOnSecond || (result.steps[1]?.colors ?? 0) >= g.colorsOnSecond) &&
    (!g.target ||
      g.target.every((t) =>
        target.some((c) => c.x === t.x && c.y === t.y && c.color === t.color),
      )) &&
    (g.maxInputs === undefined || inputs <= g.maxInputs)
  );
}

export type Lesson = {
  title: string;
  tag: string;
  text: string;
  sources: string[];
  track?: string;
  topics?: string[];
  checkpoints?: string[];
  mistake?: string;
  video?: string | null;
  seconds?: number;
};
export const lessons: Lesson[] = [
  ...studyNotes,
  {
    title: 'NEXTの置き場所から逆算する',
    tag: '次の一手',
    text: '次のツモを使う列・段を先に決めてから、現在のツモの向きを比べる。目先の3連結ができても、次に必要な色を置く場所を埋めれば接続は止まる。複数手問題では最終手だけでなく、その前の受け入れを検討する。',
    sources: ['camp-tail', 'delta-next'],
  },
  {
    title: '連鎖尾は消去後の高さで読む',
    tag: '次の一手',
    text: '現在の段数ではなく、手前の色が消えた後に何段目へ落ちるかを追う。下に残る色を回収する潜り込みと、上から補う雪崩では手順が異なる。検証ログで途切れた直前の盤面に戻り、足りない色の高さを確認する。',
    sources: ['alg14', 'log-tail', 'shiro'],
  },
  {
    title: '折り返しと連鎖尾の両方に振る',
    tag: '次の一手',
    text: '混色ツモの2個を同じ役割に使う必要はない。一方を折り返しのキー、もう一方を後半の接続に使えるかを見る。後折りでは進行方向を塞がないこと、多重折りでは上部の空間と後から置くキーの通路を残すことが重要になる。',
    sources: ['piro', 'keep-fold', 'free'],
  },
  {
    title: '同じ色を同時に消さない選択',
    tag: '次の一手',
    text: '同色の群を別の段階で消すには、最初の消去まで接触させず、落下で初めて合流させる。連鎖数が不足した場合は、必要な個数が足りないのか、同色を早くまとめすぎたのかをログで区別する。',
    sources: ['alg10', 'euphonic'],
  },
  {
    title: '短く撃った後の本線も採点する',
    tag: '催促・判断',
    text: '催促問題では2〜3連鎖の得点だけでなく、その後に確認ツモから本線が発火できるかも判定する。本線を使い切る大連鎖は、この目的では不正解。相手の対応が見えていない盤面問題なので、撃つタイミングの実戦的な優劣は別に判断する。',
    sources: ['mid', 'watch', 'alg9'],
  },
  {
    title: 'ちぎりを減らす手順を探す',
    tag: '操作の最適化',
    text: '横置きする2列の高さが異なると片方が独立して落ちる。縦置き、同じ高さへの横置き、置く順番の変更を比べる。ちぎり0回の課題では連鎖が完成しても制約違反は不正解。入力数の表示はこのシミュレーターの離散入力であり、実機の所要フレーム数ではない。',
    sources: ['next', 'camp-tail'],
  },
  {
    title: '固定された発火点から離れる',
    tag: '次の一手',
    text: 'もとの連鎖で隣り合う色でも、別の消去順に組み替えられる場合がある。逆発火や部分発火では普段と違う方向から落下を読む。正解は登録された配置との一致ではなく、問題に示した消去・残し・ちぎり条件で判定する。',
    sources: ['alg21', 'euphonic'],
  },
  {
    title: '連鎖数と連結火力を分ける',
    tag: '催促・判断',
    text: '同じ連鎖数でも、連結の数と同時消しの色数で得点が変わる。短い攻撃では「2連鎖できた」だけで終わらず必要な得点を確保し、使った色が本線の接続を壊していないかまで見る。',
    sources: ['score', 'mid'],
  },
];

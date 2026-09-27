import {
  emptyBoard,
  fromColumns,
  staircase,
  type Board,
  type Pair,
  type Resolution,
  type Cell,
} from './engine';
export const sources = [
  {
    id: 'sega',
    title: 'ぷよぷよ 基本ルール・連鎖の組み方',
    author: 'SEGA / 飛車ちゅうプロ',
    url: 'https://info-esports.sega.jp/wp-content/uploads/2024/07/puyopuyo_esports_leaflet.pdf',
    note: '4個消し、階段積み、NEXT、GTRの折り返しを学ぶ公式リーフレット。',
  },
  {
    id: 'delta',
    title: '【タテ置き】基本の操作をマスターしよう！',
    author: 'delta / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/173991',
    note: '軸と子の関係、列ごとの置き方、壁際の回転を扱うプロの操作講座。',
  },
  {
    id: 'mid',
    title: '中盤戦術技術徹底攻略 第一部',
    author: 'Rilium / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/89527',
    note: '本線を残す催促、マルチ、対応の考え方。著者の戦型に基づく戦術論。',
  },
  {
    id: 'watch',
    title: '中盤戦術技術徹底攻略 第二部',
    author: 'Rilium / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/89528',
    note: '凝視するタイミング、発火点、相手の隙を読むための判断材料。',
  },
  {
    id: 'gtr',
    title: 'ぷよぷよ初心者に分かりやすいGTR講座',
    author: 'なもこ / ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/137318',
    note: '折り返しの役割と、ツモに合わせて完成形を修正する考え方。',
  },
  {
    id: 'key',
    title: '【連鎖講座その3】カギ積みをマスターする',
    author: 'PUYOLOG',
    url: 'https://puyopuyo.hatenablog.jp/entry/rensa3',
    note: '挟み込みを利用するカギ積みと、階段との組み合わせ。',
  },
  {
    id: 'free',
    title: '多連鎖組みの基本・GTRをマスターせよ',
    author: 'Free Steps',
    url: 'https://freesteps.jp/puyo_4',
    note: 'キーぷよ、折り返し、連鎖尾を分けて理解するための解説。',
  },
  {
    id: 'next',
    title: '「床ぷよ」を使った連鎖尾の組み方のコツ',
    author: 'けいたそ！ / ぷよぷよのコツ',
    url: 'https://keepuyo.com/nextmove6/',
    note: '次の一手形式の学習、連鎖尾とちぎりを考慮した配置の発想。',
  },
  {
    id: 'score',
    title: '得点 — 対戦講座',
    author: '壱大整域',
    url: 'https://alg-d.com/game/puyo/taisen11.html',
    note: '通ルールの得点式、連結・色数ボーナス、全消し後の扱い。',
  },
  {
    id: 'power',
    title: 'ぷよぷよeスポーツの火力計算について',
    author: 'ぷよぷよキャンプ',
    url: 'https://puyo-camp.jp/posts/191916',
    note: '同時に消える各グループの連結ボーナスを合計する計算。',
  },
  {
    id: 'assets',
    title: 'ぷよぷよプログラミング',
    author: 'SEGA / Monaca Education',
    url: 'https://puyo.sega.jp/program_2020/',
    note: '公式素材を使ったプログラミング学習教材。素材の利用範囲は配布元の条件に従います。',
  },
];
export const categories = [
  'すべて',
  '次の一手',
  '連鎖の基礎',
  '催促・判断',
  '操作の最適化',
] as const;
export type Category = (typeof categories)[number];
type Base = {
  id: string;
  title: string;
  category: Category;
  level: '初級' | '中級';
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
export type Drill = PlacementDrill | QuizDrill;
const mirrored = (b: Board) => b.map((r) => [...r].reverse());
export const drills: Drill[] = [
  {
    id: 'first-clear',
    type: 'placement',
    title: 'はじめの4個消し',
    category: '連鎖の基礎',
    level: '初級',
    description: '赤ぷよをつなげて、1連鎖以上を起こそう。',
    board: fromColumns([[], [1, 1, 1], [], [], [], []]),
    pair: [1, 3],
    goal: { chains: 1 },
    hint: '赤が3つつながっています。同じ赤を上下左右のどこかに添えてみよう。',
    explanation:
      '同じ色が上下左右に4個以上つながると消えます。斜めはつながりません。縦置き以外でも条件を満たせば正解です。',
    sources: ['sega'],
  },
  ...[2, 3, 4, 5].map((n): PlacementDrill => ({
    id: `stairs-${n}`,
    type: 'placement',
    title: `階段積みで${n}連鎖`,
    category: n <= 3 ? '連鎖の基礎' : '次の一手',
    level: n <= 3 ? '初級' : '中級',
    description: `この1手で${n}連鎖以上。消えたあとの落ち方を想像しよう。`,
    board: staircase(n),
    pair: [1, 4],
    goal: { chains: n },
    hint: '左端から赤の3連結に触れよう。赤の上にあるぷよが次の色への橋になります。',
    explanation:
      '下の色が消えると、その上のぷよが落下して隣の3連結につながります。消える順番と、1個ずつ落ちてくるぷよを追いかけましょう。',
    sources: ['sega'],
  })),
  {
    id: 'reverse-stairs',
    type: 'placement',
    title: '反対側から見つけよう',
    category: '次の一手',
    level: '初級',
    description: '右から始まる連鎖。1手で3連鎖以上を起こそう。',
    board: mirrored(staircase(3)),
    pair: [3, 1],
    goal: { chains: 3 },
    hint: '発火点は右側。赤が下になるように回転する方法もあります。',
    explanation:
      '形が左右反転しても、連鎖の仕組みは変わりません。色が消えたあと、上のぷよが何段落ちるかを順に確認します。',
    sources: ['sega', 'gtr'],
  },
  {
    id: 'all-clear',
    type: 'placement',
    title: '2色の全消し',
    category: '次の一手',
    level: '初級',
    description: '赤青の組ぷよを使って、盤面を空にしよう。',
    board: fromColumns([[1, 1, 1], [3, 3, 3], [], [], [], []]),
    pair: [1, 3],
    goal: { allClear: true },
    hint: '2つの3連結に、それぞれ同じ色を1つずつ足そう。',
    explanation:
      '2色を同時に4個ずつ消せば全消しです。同時消しは2連鎖とは異なり、1連鎖の中で複数の色が消えることです。',
    sources: ['score', 'sega'],
  },
  {
    id: 'sandwich',
    type: 'placement',
    title: '挟み込みのスイッチ',
    category: '連鎖の基礎',
    level: '初級',
    description: '赤を消して、上下に分かれた青をつなげよう。2連鎖以上で正解。',
    board: fromColumns([[], [3, 1, 1, 1, 3, 3, 3], [], [], [], []]),
    pair: [1, 4],
    goal: { chains: 2 },
    hint: '左右どちらかの列で赤が上・黄が下になるように回すと、2段目の赤に触れられます。',
    explanation:
      '間に挟まった赤がなくなると、上下に分かれていた青が落ちてつながります。「間の色を消す」が挟み込みの基本です。',
    sources: ['key'],
  },
  {
    id: 'garbage',
    type: 'placement',
    title: 'おじゃまを巻き込む',
    category: '連鎖の基礎',
    level: '初級',
    description: '赤を消そう。隣り合うおじゃまぷよの消え方も観察。',
    board: fromColumns([[6], [1, 1, 1], [6, 6], [], [], []]),
    pair: [1, 2],
    goal: { chains: 1 },
    hint: '消える色ぷよに上下左右で接するおじゃまが、一緒に消えます。',
    explanation:
      'おじゃまは同じものを4つつないでも消えません。色ぷよの消去に隣接させます。おじゃま同士を伝わって連続で消えることはありません。',
    sources: ['sega'],
  },
  {
    id: 'double',
    type: 'placement',
    title: '同時消しで火力をつくる',
    category: '催促・判断',
    level: '初級',
    description: '1手で消去得点240点以上を出そう。連鎖数だけでなく色数にも注目。',
    board: fromColumns([[1, 1, 1], [3, 3, 3], [], [], [], []]),
    pair: [1, 3],
    goal: { minScore: 240 },
    hint: '赤と青を同じタイミングで消すと、色数ボーナスが加わります。',
    explanation:
      '4個ずつ2色を同時に消すと、8個 × 10 × 色数ボーナス3 = 240点。連鎖数と同時消しは別々の火力要素です。',
    sources: ['score'],
  },
  {
    id: 'two-double',
    type: 'placement',
    title: '2ダブを発火しよう',
    category: '催促・判断',
    level: '中級',
    description: '2連鎖目に2色以上を同時消ししよう。',
    board: fromColumns([[3, 3, 3], [6, 6, 1, 3], [6, 6, 1], [6, 6, 1, 2], [2, 2, 2], []]),
    pair: [1, 4],
    goal: { chains: 2, colorsOnSecond: 2 },
    hint: '3列目から、横につながる3個の赤に触れよう。赤の上の青と緑が落ちてきます。',
    explanation:
      '赤が消えたあと、青と緑が左右の3連結に落下すると、2連鎖目に2色が同時に消えます。催促を撃つかどうかは、相手の対応と自分の残りの形も見て判断します。',
    sources: ['mid', 'power'],
  },
  ...[
    { x: 0, r: 0, title: '左端へまっすぐ', max: 2 },
    { x: 3, r: 0, title: '4列目に迷わず置く', max: 1 },
    { x: 2, r: 2, title: '軸と子を入れ替える', max: 2 },
    { x: 5, r: 2, title: '右端で逆さに置く', max: 5 },
  ].map((v, i): PlacementDrill => ({
    id: `control-${i}`,
    type: 'placement',
    title: v.title,
    category: '操作の最適化',
    level: i < 2 ? '初級' : '中級',
    description: `${v.x + 1}列目に${v.r === 0 ? '赤が下・青が上' : '青が下・赤が上'}。${v.max}入力以内（決定を除く）で置こう。`,
    board: emptyBoard(),
    pair: [1, 3],
    goal: {
      target: [
        { x: v.x, y: 0, color: v.r === 0 ? 1 : 3 },
        { x: v.x, y: 1, color: v.r === 0 ? 3 : 1 },
      ],
      maxInputs: v.max,
    },
    hint: '出現位置は3列目。Zは左回転、Xは右回転。逆さにするには2回転です。',
    explanation:
      'まず到達する形を決めてから操作しましょう。ここでの最短は1マス移動・90度回転を各1入力としたものです。実機の長押し・同時押し・先行入力による最速操作とは異なります。',
    sources: ['delta'],
  })),
  {
    id: 'next-look',
    type: 'quiz',
    title: 'NEXTを見るタイミング',
    category: '次の一手',
    level: '初級',
    description: '次の組ぷよを、いつ配置の判断に使う？',
    question: '現在の組ぷよをまだ動かせる状況。NEXTの情報を使うなら？',
    options: [
      '現在の組ぷよを確定してから初めて見る',
      '置く前に、現在の組とNEXTの役割を考える',
      '色を1つだけ見て、もう1色は無視する',
    ],
    answer: 1,
    hint: '次の2個が置ける場所を、今の手でふさいでいないかな？',
    explanation:
      '今の組ぷよだけで完成形を固定せず、NEXTが使える場所も残します。まずは1手先を見て、使いたい色を置く場所を確保する練習から始めましょう。',
    sources: ['sega', 'gtr'],
  },
  {
    id: 'pressure-purpose',
    type: 'quiz',
    title: '催促は何のため？',
    category: '催促・判断',
    level: '初級',
    description: '小さな攻撃が生む、相手への選択。',
    question: '自分は本線と小連鎖を構え、相手は本線を伸ばしている。催促の主な狙いは？',
    options: [
      '自分の本線をすべて消費すること',
      '連鎖数だけを必ず最大にすること',
      '相手に対応や早めの本線発火を迫ること',
    ],
    answer: 2,
    hint: '相手がそのまま伸ばし続けられない状況をつくります。',
    explanation:
      '催促は相手の選択を制限するための小さな攻撃です。自分の本線を大きく壊すと、相手が対応したあとの勝負が苦しくなります。',
    sources: ['mid'],
  },
  {
    id: 'pressure-build',
    type: 'quiz',
    title: '催促の種を残す',
    category: '催促・判断',
    level: '中級',
    description: '本線と副砲を両立するための組み方。',
    question: '本線の発火点を維持しながら催促を用意したい。まず検討するのは？',
    options: [
      '本線の上の余りぷよで小連鎖を作り、巻き込みを確認',
      'どんなツモでも本線全体を2連鎖に崩す',
      '発火点をおじゃまで埋める',
    ],
    answer: 0,
    hint: '催促を撃ったあとにも戦える形を残したい。',
    explanation:
      '余りぷよや表面の連結を使って小連鎖を作り、発火時に本線がどこまで巻き込まれるかを確認します。残し方は盤面ごとに変わり、いつも同じ形が正解ではありません。',
    sources: ['mid'],
  },
  {
    id: 'watch-when',
    type: 'quiz',
    title: '凝視のきっかけ',
    category: '催促・判断',
    level: '中級',
    description: '見る情報を絞って、判断の余裕をつくる。',
    question: '催促を構え、発火色を引いた。撃つ前に優先して確かめたいのは？',
    options: [
      '相手がすぐ撃てる対応と、発火点の状態',
      '相手のぷよをすべて暗記する',
      '自分の得点表示だけ',
    ],
    answer: 0,
    hint: 'その催促を、相手がどう受け止めるかを考えます。',
    explanation:
      '相手に対応があるか、発火点が埋まりそうかを短く確認します。凝視は必要な情報を選んで見る練習です。見ることで自分の手が止まりすぎないようにしましょう。',
    sources: ['watch'],
  },
  {
    id: 'gtr-purpose',
    type: 'quiz',
    title: '折り返しの役割',
    category: '連鎖の基礎',
    level: '初級',
    description: '横幅を使い切った、その先へ。',
    question: 'GTRなどの折り返しを覚える主な目的は？',
    options: [
      '同じ色だけで盤面を埋める',
      '連鎖の向きを変え、上の空間にも伸ばす',
      'NEXTを見る必要をなくす',
    ],
    answer: 1,
    hint: '6列の横幅だけでは使える空間に限りがあります。',
    explanation:
      '折り返しは連鎖の進む向きを変え、縦方向の空間を使うための仕組みです。GTRの形を覚えたら、その後の連鎖や連鎖尾も別に組む必要があります。',
    sources: ['gtr', 'free'],
  },
  {
    id: 'tail',
    type: 'quiz',
    title: '連鎖尾に色を振り分ける',
    category: '次の一手',
    level: '中級',
    description: '折り返しに合わない色にも、使い道を。',
    question: '折り返しに使いづらい色を引いた。連鎖を伸ばすための候補は？',
    options: [
      '常に発火点をふさぐ',
      '必ず即座に単発で消す',
      '連鎖の後半で消える連鎖尾に使えるか考える',
    ],
    answer: 2,
    hint: '連鎖の入り口だけでなく、出口も見よう。',
    explanation:
      '必要な色を折り返しへ、別の色を連鎖尾へ振り分けると、組ぷよの両方を使いやすくなります。消える順番と落下先がつながるかを確認して配置しましょう。',
    sources: ['sega', 'next'],
  },
  {
    id: 'split',
    type: 'quiz',
    title: 'ちぎりと時間',
    category: '操作の最適化',
    level: '初級',
    description: '同じ完成形でも、置き方で時間が変わる。',
    question: '高さの違う2列に横置きするとき、片方だけがさらに落下する動きを何と呼ぶ？',
    options: ['ちぎり', '相殺', '全消し'],
    answer: 0,
    hint: '組ぷよの2個が、着地すると離れます。',
    explanation:
      '段差のある列への横置きでは、片方が着地したあとにもう片方が落ちます。不要なちぎりを減らすと速度につながりますが、必要な連鎖のためなら使います。',
    sources: ['next'],
  },
  {
    id: 'wall',
    type: 'quiz',
    title: '右の壁で回すなら',
    category: '操作の最適化',
    level: '中級',
    description: '壁際で軸がずれる理由を知ろう。',
    question: '軸が6列目、子が上の状態から、軸を6列目に保って子を下へ回したい。基本の操作は？',
    options: ['右回転を2回', '左回転を2回', '右移動をもう1回'],
    answer: 1,
    hint: '最初の回転で、子が壁の外へ出ない方向を選びます。',
    explanation:
      '右端では左回転2回が基本です。右回転すると子が右壁に当たり、軸が5列目へ押し戻される場合があります。左端では左右が逆になります。',
    sources: ['delta'],
  },
  {
    id: 'power-quiz',
    type: 'quiz',
    title: '2ダブの消去得点',
    category: '催促・判断',
    level: '中級',
    description: '連鎖数が同じでも、火力は同じとは限らない。',
    question: '1連鎖目に4個、2連鎖目に別の2色を4個ずつ消す。落下・全消しボーナスなしの得点は？',
    options: ['360点', '920点', '240点'],
    answer: 1,
    hint: '1連鎖目40点。2連鎖目は8個 × 10 ×（連鎖8 + 色数3）。',
    explanation:
      '40 + 8 × 10 × (8 + 3) = 920点です。おじゃまの目安は70点につき1個なので13個。これは余剰点・相殺・マージン・全消しを含まない単独消去の比較です。',
    sources: ['score', 'power'],
  },
  {
    id: 'accidental-clear',
    type: 'quiz',
    title: '暴発を防ぐには',
    category: '次の一手',
    level: '初級',
    description: '完成前に連鎖が始まらないように、発火色を扱う。',
    question: 'まだ伸ばしたい連鎖の発火点に、同じ色が3個つながっている。次に気をつけたいのは？',
    options: [
      '同じ色を4個目として触れさせると、予定より早く消える',
      '斜めに同じ色があれば必ず消える',
      'NEXTを見れば消去判定が止まる',
    ],
    answer: 0,
    hint: '色が消える条件と、キーぷよを置くタイミングを思い出そう。',
    explanation:
      '連鎖を伸ばす前に4個目がつながると、その時点で消去が始まります。発火点に触れる色の置き方を確認し、必要な空間やキーぷよを置く順番を残しましょう。',
    sources: ['sega', 'gtr'],
  },
  {
    id: 'trigger',
    type: 'quiz',
    title: '発火点を守る',
    category: '催促・判断',
    level: '初級',
    description: '大きい連鎖も、撃てなければ使えない。',
    question: '少量のおじゃまが来そうで、発火点が低い。まず気にしたいのは？',
    options: [
      '発火色を置く経路が埋まらないか',
      '見た目を左右対称にすること',
      '色数を5色に増やすこと',
    ],
    answer: 0,
    hint: '必要な色を届けられる場所が残っているかな？',
    explanation:
      '連鎖の長さに加え、必要な色を発火点へ置けるかを確認します。発火点が埋まる場合には、対応・本線発火・受けのどれが可能かを判断します。',
    sources: ['watch'],
  },
];
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
export const lessons = [
  {
    title: 'まずは「消えたあと」を読む',
    tag: '連鎖の基礎',
    text: '同色4個のつながりを見つけたら、消えた場所の上にあるぷよがどこまで落ちるかを考えます。階段は隣の3連結に1個を足す形、挟み込みは間の色を消して上下をつなぐ形。まず2〜3連鎖を自分で説明できる状態を目指しましょう。',
    sources: ['sega', 'key'],
  },
  {
    title: '完成形を決めすぎない',
    tag: '次の一手',
    text: '現在の組ぷよとNEXTを見て、2個がそれぞれどこで役立つか考えます。形に合わない色が来たら、連鎖尾に回す、色の割り当てを変える、余りぷよを整理するなど、完成形を更新します。自由な盤面には唯一の正解がないため、ドリルでは達成条件を明示しています。',
    sources: ['gtr', 'next'],
  },
  {
    title: '小さく撃って、本線を残す',
    tag: '催促・判断',
    text: '催促は相手に対応を迫る攻撃です。表面の余りぷよを小連鎖にまとめ、撃ったあとに本線が残るかを確認します。相手が対応を構えているなら、ただ撃つより伸ばした方がよい場合もあります。相手の状態によって判断は変わります。',
    sources: ['mid', 'watch'],
  },
  {
    title: '操作を決めてから動かす',
    tag: '操作の最適化',
    text: '出現位置は3列目、軸は下、子は上。置く列と向きを先に決め、必要な移動と回転をまとめます。左右の壁では回転によって軸が押し戻されることに注意。長押しや先行入力の感覚は、実際にプレイする製品でも確認しましょう。',
    sources: ['delta'],
  },
  {
    title: 'GTRから連鎖を広げる',
    tag: '連鎖の基礎',
    text: 'GTRは折り返しに使える定型のひとつです。形そのものを覚えたあと、連鎖がどの方向へ流れるかを追います。折り返しに使わない色を後半の連鎖に振り分け、土台だけでなく上の空間にも連鎖を伸ばしましょう。',
    sources: ['gtr', 'free'],
  },
  {
    title: '連鎖数と火力を分けて考える',
    tag: '催促・判断',
    text: '得点は消した個数、連鎖数、連結の大きさ、同時に消える色数で変化します。同じ2連鎖でも2連鎖目を2色同時消しにすれば火力は増えます。シミュレーターの消去ログで各段階の得点を比較してみましょう。',
    sources: ['score', 'power'],
  },
];

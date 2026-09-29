// Node.js 24。完成形から戻さず、未確定のGTR上と配ぷよから方針を比較する。
import { writeFileSync } from 'node:fs';
import { fromColumns, placements, gameOver } from '../src/engine.ts';
const raw = [[3, 1, 1], [3, 1, 3], [4, 3, 4], [2, 4], [3, 4], []];
const cases = [
  {
    id: 'a1',
    family: 'a',
    extra: null,
    queue: [
      [2, 3],
      [1, 3],
      [2, 4],
    ],
    expected: 'cushion',
  },
  {
    id: 'a2',
    family: 'a',
    extra: null,
    queue: [
      [2, 3],
      [2, 1],
      [2, 4],
    ],
    expected: 'seat',
  },
  {
    id: 'a3',
    family: 'a',
    extra: null,
    queue: [
      [2, 3],
      [1, 3],
      [4, 4],
    ],
    expected: 'key',
  },
  {
    id: 'a4',
    family: 'a',
    extra: null,
    queue: [
      [1, 3],
      [1, 3],
      [4, 4],
    ],
    expected: 'hold',
  },
  {
    id: 'b1',
    family: 'b',
    extra: 2,
    queue: [
      [3, 4],
      [1, 3],
      [4, 4],
    ],
    expected: 'key',
  },
  {
    id: 'b2',
    family: 'b',
    extra: 2,
    queue: [
      [3, 4],
      [2, 1],
      [4, 3],
    ],
    expected: 'cushion',
  },
  {
    id: 'b3',
    family: 'b',
    extra: 2,
    queue: [
      [3, 4],
      [2, 2],
      [1, 3],
    ],
    expected: 'seat',
  },
  {
    id: 'c1',
    family: 'c',
    extra: 0,
    queue: [
      [3, 4],
      [2, 1],
      [4, 3],
    ],
    expected: 'hold',
  },
  {
    id: 'c2',
    family: 'c',
    extra: 0,
    queue: [
      [3, 4],
      [2, 1],
      [2, 3],
    ],
    expected: 'seat',
  },
];
const labels = {
  seat: '座布団を優先する',
  cushion: 'クッション・卍型Aへ進める受けを作る',
  key: 'カギ積み・卍型Bを候補にする',
  hold: '折り返し上の受け作りを保留する',
};
// 構築の最終形ではなく、4段目の四色目の受けだけを分類する。
function classify(b) {
  const row = b[3].slice(0, 3);
  if (row.every((c) => c === 2)) return 'seat';
  if (row[0] !== 2 && row[1] === 2 && row[2] === 2) return 'cushion';
  if (row[0] !== 2 && row[1] !== 2 && row[2] === 2) return 'key';
  return 'hold';
}
const drills = [];
for (const [index, c] of cases.entries()) {
  const columns = raw.map((col) => [...col]);
  if (c.extra !== null) columns[c.extra].push(2);
  const board = fromColumns(columns);
  const found = new Map();
  // 同じ盤面に至る手順はまとめる。各候補の例では、なるべく低くちぎらずに置く。
  let states = new Map([[JSON.stringify(board), { board, path: [], splits: 0 }]]);
  for (const pair of c.queue) {
    const next = new Map();
    for (const state of states.values()) {
      for (const p of placements(state.board, pair)) {
        if (p.result.chains || gameOver(p.result.board)) continue;
        const splits =
          state.splits + Number(p.target[0].x !== p.target[1].x && p.target[0].y !== p.target[1].y);
        const key = JSON.stringify(p.result.board);
        if (!next.has(key) || next.get(key).splits > splits)
          next.set(key, {
            board: p.result.board,
            path: [...state.path, p.path],
            splits,
          });
      }
    }
    states = next;
  }
  for (const state of states.values()) {
    const kind = classify(state.board);
    const height = Math.max(
      ...Array.from({ length: 6 }, (_, x) => state.board.filter((row) => row[x]).length),
    );
    const cost = height * 100 + state.splits * 10 + state.path.flat().length;
    if (!found.has(kind) || found.get(kind).cost > cost) found.set(kind, { ...state, cost });
  }
  const preferred = ['seat', 'cushion', 'key', 'hold'].find((kind) => found.has(kind));
  if (preferred !== c.expected) throw new Error(`${c.id}: 想定 ${c.expected} / 実際 ${preferred}`);
  const stock = Number(c.extra !== null);
  const count = c.queue.flat().filter((color) => color === 2).length;
  const context = `このGTRの四色目は緑。折り返し上に${stock}個、見えているツモに${count}個あります。`;
  const reason = {
    seat: found.has('seat')
      ? '緑を1〜3列の同じ高さに置けます。伸ばす型を急いで固定せず、後続の受けを広く残せるので、ここでは座布団を優先します。'
      : `横3にする緑が${Math.max(0, 3 - stock - count)}個不足しています。見えていない緑が来る前提で、ほかのツモの置き場所を狭めないようにします。`,
    cushion: found.has('cushion')
      ? '2・3列側に緑を残せます。左上からの回収や卍型Aへの移行を残す組み始めです。クッションと卍型Aのどちらに確定するかは、後のツモで決められます。'
      : c.extra === 0
        ? 'すでにある緑は1列目です。緑が合計2個でも、その1個を2・3列へ移すことはできません。個数だけでクッション向きと判断しないでください。'
        : '2・3列側の受けに必要な緑2個を、このツモではそろえられません。',
    key: found.has('key')
      ? '3列側の緑1個から受けられます。ただし、緑を2個・3個使える配置があれば、そちらの受けを先に検討します。今すぐカギ積みか卍型Bに決め打ちする必要はありません。'
      : c.extra === 0
        ? '1列側の緑を動かせず、記事の1個を3列側に使う受けとは位置関係が違います。今ある緑を無視して型を当てはめないようにします。'
        : 'この配ぷよでは、3列側に使う緑がありません。',
    hold:
      preferred === 'hold'
        ? c.extra === 0
          ? '1列側の緑を保ち、足りない色を待てる場所にほかのツモを置きます。緑の個数だけで型を固定せず、置ける位置まで見て保留する場面です。'
          : '折り返し上に使う緑がまだありません。GTRを消したり発火経路を埋めたりせず、右側などでツモを受けて、次の判断材料を待ちます。'
        : '保留自体はできますが、このツモでは折り返し上の受けを作れます。使える緑を別の場所へ逃がす前に、候補の置き方を比べてみましょう。',
  };
  if (preferred === 'seat') reason.cushion += ' 今回は座布団も作れるため、そちらを優先します。';
  const options = Object.keys(labels).map((id) => ({
    id,
    label: labels[id],
    recommended: id === preferred,
    reason: reason[id],
    ...(found.has(id) ? { witness: found.get(id).path } : {}),
  }));
  drills.push({
    id: `foundation-${c.id}`,
    type: 'foundation',
    category: '形の判断',
    topic: 'ツモから多重折りを判断',
    level: c.extra === 0 ? '上級' : '中級',
    title: `配ぷよから方針を選ぶ ${String(index + 1).padStart(2, '0')}`,
    description:
      'GTRの上は、まだ伸ばす型が決まっていません。今のツモとNEXT 2手を見て、どの形への受けを優先するか判断してください。',
    hint: 'GTRに使っていない色が、いくつ・どの位置に使えるかを見ます。',
    explanation: `${context} ${reason[preferred]}`,
    sources: ['note-fold'],
    tags: ['記事n951e68d4fdb9', '土台判断', '多重折り'],
    board,
    queue: c.queue,
    options,
    related: cases
      .filter((other) => other.family === c.family && other.id !== c.id)
      .map((other) => `foundation-${other.id}`),
  });
  console.log(`${c.id}: ${preferred} / ${states.size}盤面を検証`);
}
writeFileSync(
  new URL('../src/data/foundation-drills.json', import.meta.url),
  JSON.stringify(drills, null, 2).replace(
    /\[\s*[0-6](?:,\s*[0-6]){5}\s*\]/g,
    (row) => '[' + row.match(/[0-6]/g).join(', ') + ']',
  ) + '\n',
);

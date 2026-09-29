// Node.js 24: 記事の折り返しを教材用の盤面に加工し、全合法手順で最大連鎖を検証する。
import { readFileSync, writeFileSync } from 'node:fs';
import { cloneBoard, fromColumns, placements, resolve, COLORS } from '../src/engine.ts';
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const motifs = read('./research/note-fold-motifs.json');
const existing = [...read('../src/data/next-drills.json'), ...read('../src/data/camp-drills.json')];
function canonical(board) {
  const normalize = (b) => {
    const colors = new Map();
    return b
      .flat()
      .map((c) => {
        if (!c || c === 6) return c;
        if (!colors.has(c)) colors.set(c, colors.size + 1);
        return colors.get(c);
      })
      .join('');
  };
  return [normalize(board), normalize(board.map((r) => [...r].reverse()))].sort()[0];
}
const seen = new Set(existing.map((d) => canonical(d.board)));
const output = [];
for (const motif of motifs) {
  const cache = new Map();
  const moves = (b, pair) => {
    const k = JSON.stringify(b) + pair;
    if (!cache.has(k)) cache.set(k, placements(b, pair));
    return cache.get(k);
  };
  const best = (b) => moves(b, motif.probe).reduce((n, p) => Math.max(n, p.result.chains), 0);
  // 灰色の省略部分はおじゃまとして固定。空いた右側は独自の土台に置換する。
  const completed = fromColumns([
    ...motif.columns,
    ...[[2, 4], [3, 4], []].slice(Math.max(0, motif.columns.length - 3)),
  ]);
  if (resolve(completed).chains) throw new Error(`${motif.id}: 完成図が暴発`);
  const targetChains = best(completed);
  function remove(board, remaining, steps = []) {
    if (!remaining) return seen.has(canonical(board)) ? null : { board, steps: steps.toReversed() };
    const heights = Array.from({ length: 6 }, (_, x) => board.filter((r) => r[x]).length);
    for (const x of [2, 1, 0])
      for (const horizontal of [true, false]) {
        if (horizontal && x === 2) continue;
        const cells = horizontal
          ? [
              { x, y: heights[x] - 1 },
              { x: x + 1, y: heights[x + 1] - 1 },
            ]
          : [
              { x, y: heights[x] - 2 },
              { x, y: heights[x] - 1 },
            ];
        if (cells.some((c) => c.y < 3)) continue;
        const pair = cells.map((c) => board[c.y][c.x]);
        if (pair.includes(6)) continue;
        const before = cloneBoard(board);
        cells.forEach((c) => (before[c.y][c.x] = 0));
        if (best(before) >= targetChains) continue;
        const restore = moves(before, pair).find(
          (p) => !p.result.chains && JSON.stringify(p.result.board) === JSON.stringify(board),
        );
        if (!restore) continue;
        const found = remove(before, remaining - 1, [...steps, { pair, path: restore.path }]);
        if (found) return found;
      }
    return null;
  }
  const selected = remove(completed, motif.hands);
  if (!selected) throw new Error(`${motif.id}: 課題を生成できません`);
  const queue = selected.steps.map((s) => s.pair);
  let maximum = -1,
    witness = [],
    sequences = 0,
    optimal = 0;
  function search(board, depth, path) {
    if (depth === queue.length) {
      sequences++;
      const chains = best(board);
      if (chains > maximum) {
        maximum = chains;
        witness = path;
        optimal = 0;
      }
      if (chains === maximum) optimal++;
      return;
    }
    for (const p of moves(board, queue[depth])) {
      if (!p.result.chains) search(p.result.board, depth + 1, [...path, p.path]);
    }
  }
  search(selected.board, 0, []);
  let board = selected.board;
  const notes = witness.map((path, i) => {
    const p = moves(board, queue[i]).find((p) => JSON.stringify(p.path) === JSON.stringify(path));
    board = p.result.board;
    return `${i + 1}手目：${p.target.map((c) => `${COLORS[c.color]}を${c.x + 1}列${c.y + 1}段`).join('、')}`;
  });
  const probe = [...moves(board, motif.probe)].sort(
    (a, b) =>
      b.result.chains - a.result.chains ||
      b.result.score - a.result.score ||
      a.path.length - b.path.length,
  )[0];
  const order = probe.result.steps
    .map((s) =>
      [...new Set(s.removed.filter((c) => c.color !== 6).map((c) => COLORS[c.color]))].join('＋'),
    )
    .join(' → ');
  seen.add(canonical(selected.board));
  output.push({
    id: `note-fold-${motif.id}`,
    type: 'sequence',
    category: '次の一手',
    topic: '記事・多重折りの最善手',
    level: queue.length > 1 ? '上級' : '中級',
    title: `どう置く？ ${motif.label}`,
    objective: 'max-chains',
    description: `盤面とツモを見て、${queue.length}手をどう置く？ 構築中は消さず、表示された接続確認ツモで最も長い連鎖につなげよう。`,
    hint: motif.hint,
    explanation: `解答例の消去順は ${order}。配置後に上部のキーが合流する位置を、コマ送りで確認してください。`,
    tags: ['記事n951e68d4fdb9', '多重折り', '最善手', motif.label, '配置問題'],
    board: selected.board,
    queue,
    probe: motif.probe,
    minChains: maximum,
    witness,
    sources: ['note-fold'],
    origin: `みらいやまさると最強の生活「多重折りは三種類しかない」${motif.section}`,
    motif: `note-fold-${motif.id}`,
    sourceFigures: [motif.image],
    solutionNote: `${notes.join('。')}。この条件での最大は${maximum}連鎖。`,
    noSplit: false,
    searchAudit: { sequences, optimal, maxChains: maximum },
  });
  console.log(
    `${motif.id}: ${queue.length}手 / 最大${maximum}連鎖 / ${optimal}正解手順 / ${sequences}合法手順`,
  );
}
writeFileSync(
  new URL('../src/data/note-fold-drills.json', import.meta.url),
  JSON.stringify(output, null, 2).replace(
    /\[\s*[0-6](?:,\s*[0-6]){5}\s*\]/g,
    (row) => '[' + row.match(/[0-6]/g).join(', ') + ']',
  ) + '\n',
);

// Offline authoring helper. The shipped catalogue is deterministic and works without network access.
import { readFileSync, writeFileSync } from 'node:fs';
import { gravity, resolve, cloneBoard, placements, COLORS } from '../src/engine.ts';
const motifs = JSON.parse(readFileSync(new URL('./research/motifs.json', import.meta.url)));
const key = (b) => JSON.stringify(b);
const heights = (b) => Array.from({ length: 6 }, (_, x) => b.filter((r) => r[x]).length);
const cache = new Map();
function moves(b, pair) {
  const k = key(b) + pair;
  if (!cache.has(k)) cache.set(k, placements(b, pair));
  return cache.get(k);
}
function best(b, pair) {
  return moves(b, pair).sort(
    (a, c) =>
      c.result.chains - a.result.chains ||
      c.result.score - a.result.score ||
      a.path.length - c.path.length,
  )[0];
}
function seed(m) {
  const full = gravity(m.board),
    h = heights(full),
    candidates = [];
  if (!resolve(full).chains) candidates.push(full);
  else
    for (let x = 0; x < 6; x++)
      for (let n = 1; n <= 2; n++) {
        if (h[x] < n) continue;
        const b = cloneBoard(full);
        for (let k = 0; k < n; k++) b[h[x] - 1 - k][x] = 0;
        if (!resolve(b).chains) candidates.push(b);
      }
  let winner;
  for (const b of candidates)
    for (let c = 1; c <= 5; c++) {
      const p = best(b, [c, c]);
      if (p && (!winner || p.result.chains > winner.fire.result.chains))
        winner = { board: b, probe: [c, c], fire: p };
    }
  return winner;
}
function removals(b) {
  const h = heights(b),
    out = [];
  for (let x = 0; x < 6; x++)
    for (const horizontal of [false, true]) {
      if (horizontal ? x === 5 || !h[x] || !h[x + 1] : h[x] < 2) continue;
      const cells = horizontal
        ? [
            { x, y: h[x] - 1 },
            { x: x + 1, y: h[x + 1] - 1 },
          ]
        : [
            { x, y: h[x] - 2 },
            { x, y: h[x] - 1 },
          ];
      const pair = cells.map((c) => b[c.y][c.x]);
      const bb = cloneBoard(b);
      cells.forEach((c) => (bb[c.y][c.x] = 0));
      const restore = moves(bb, pair).find(
        (p) => !p.result.chains && key(p.result.board) === key(b),
      );
      if (restore) out.push({ board: bb, pair, path: restore.path, target: restore.target });
    }
  return out;
}
let random = 10928;
function rand(n) {
  random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
  return random % n;
}
const selection = [
  'alg8-1',
  'alg8-3',
  'alg8-4',
  'alg8-6',
  'alg25-4',
  'alg25-7',
  'alg25-10',
  'alg25-12',
  'alg11-2',
  'alg11-5',
  'alg11-8',
  'alg11-10',
  'alg14-2',
  'alg14-3',
  'alg14-6',
  'alg14-10',
  'alg9-1',
  'alg9-2',
  'alg16-1',
  'alg16-2',
  'alg10-1',
  'alg10-2',
  'alg10-3',
  'alg21-1',
  'alg21-2',
  'alg5-3',
  'alg5-6',
  'alg5-13',
  'alg5-15',
  'alg5-16',
  'alg5-19',
  'alg5-28',
];
const chosen = motifs.filter((m) => selection.includes(m.id) || !m.id.startsWith('alg'));
const drills = [],
  seen = new Set();
for (const m of chosen) {
  cache.clear();
  const s = seed(m);
  if (!s || s.fire.result.chains < 3) throw Error('invalid motif ' + m.id);
  const variants = m.id.startsWith('alg') || m.id.startsWith('log') ? 1 : 2;
  for (let v = 0; v < variants; v++) {
    const count = v ? 3 : drills.length % 4 === 0 ? 1 : 2;
    let selected;
    for (let trial = 0; trial < 500; trial++) {
      let b = s.board,
        reverse = [];
      for (let i = 0; i < count; i++) {
        const opts = removals(b);
        if (!opts.length) break;
        const p = opts[rand(opts.length)];
        reverse.push(p);
        b = p.board;
      }
      if (reverse.length < count || seen.has(key(b))) continue;
      // Every build move must matter: even directly before the final build move, the fire test falls short.
      if (reverse.some((p) => (best(p.board, s.probe)?.result.chains ?? 0) >= s.fire.result.chains))
        continue;
      const steps = reverse.reverse();
      selected = { board: b, steps };
      break;
    }
    if (!selected) throw Error('No construction for ' + m.id + ' ' + v);
    const { board, steps } = selected;
    seen.add(key(board));
    const id = `next-${m.id}-${v + 1}`;
    const placementsText = steps
      .map(
        (p, i) =>
          `${i + 1}手目：${p.target.map((c) => `${COLORS[c.color]}を${c.x + 1}列${c.y + 1}段`).join('、')}`,
      )
      .join('。');
    drills.push({
      id,
      type: 'sequence',
      category: '次の一手',
      topic: m.topic,
      level: count === 3 || s.fire.result.chains >= 9 ? '上級' : '中級',
      title: `${m.title} ${String(drills.filter((d) => d.topic === m.topic).length + 1).padStart(2, '0')}`,
      description: `${count}手で接続を作り、確認ツモから${s.fire.result.chains}連鎖以上。構築中の消去は禁止。`,
      hint: m.note,
      explanation: m.note,
      board,
      queue: steps.map((p) => p.pair),
      probe: s.probe,
      minChains: s.fire.result.chains,
      witness: steps.map((p) => p.path),
      sources: m.sources,
      origin: m.origin,
      motif: m.id,
      solutionNote:
        placementsText + '。最後に確認ツモを置くと' + s.fire.result.chains + '連鎖になる。',
      noSplit: false,
    });
  }
}
// Tactical adaptations: create a short attack while retaining a separately fireable main chain.
const attackSeen = new Set();
let attacks = 0;
for (const m of chosen) {
  if (attacks >= 8) break;
  cache.clear();
  const s = seed(m);
  if (!s || s.fire.result.chains < 6) continue;
  let win;
  for (let a = 1; a <= 5 && !win; a++)
    for (let c = a; c <= 5 && !win; c++)
      for (const p of moves(s.board, [a, c])) {
        if (p.result.chains < 2 || p.result.chains > 3 || p.result.score < 500) continue;
        const main = best(p.result.board, s.probe);
        if (main?.result.chains >= 4 && main.result.chains < s.fire.result.chains) {
          win = { pair: [a, c], attack: p, main };
          break;
        }
      }
  if (!win || attackSeen.has(key(s.board))) continue;
  attackSeen.add(key(s.board));
  const minMain = win.main.result.chains;
  let board = s.board,
    queue = [win.pair],
    witness = [win.attack.path];
  if (attacks % 2) {
    const prev = removals(s.board).find((p) => p.pair[0] !== p.pair[1]);
    if (prev) {
      board = prev.board;
      queue.unshift(prev.pair);
      witness.unshift(prev.path);
    }
  }
  drills.push({
    id: `tactical-${m.id}`,
    type: 'sequence',
    category: '催促・判断',
    topic: '催促と本線温存',
    level: '上級',
    title: `${win.attack.result.chains}連鎖の催促＋${minMain}連鎖の残し ${++attacks}`,
    description: `${queue.length}手目で2〜3連鎖・${win.attack.result.score}点以上を撃ち、確認ツモから${minMain}連鎖以上を残す。`,
    hint: '本線を全部使う発火と、上部・連鎖尾からの部分発火を比べる。短く撃てても、その後に発火色を入れられなければ温存にならない。',
    explanation:
      'この問題は短い攻撃と残った本線の両方を判定する。相手の盤面・対応力が与えられていないため、実戦で今撃つべきかまでは判定しない。',
    board,
    queue,
    probe: s.probe,
    minChains: minMain,
    attack: { min: 2, max: 3, minScore: win.attack.result.score },
    witness,
    sources: ['mid', ...m.sources],
    origin: m.origin + 'を元にした本サイトの部分発火課題',
    motif: m.id,
    solutionNote: `最終手で${win.attack.result.chains}連鎖・${win.attack.result.score}点。その後、確認ツモから${minMain}連鎖を発火できる。`,
    noSplit: false,
  });
}
let controls = 0;
for (const d of drills) {
  if (d.attack || controls >= 8 || d.queue.length < 2) continue;
  let b = d.board,
    split = false;
  for (let i = 0; i < d.queue.length; i++) {
    const p = moves(b, d.queue[i]).find(
      (p) => JSON.stringify(p.path) === JSON.stringify(d.witness[i]),
    );
    if (!p) {
      split = true;
      break;
    }
    if (p.target[0].x !== p.target[1].x && p.target[0].y !== p.target[1].y) split = true;
    b = p.result.board;
  }
  if (!split) {
    d.noSplit = true;
    d.category = '操作の最適化';
    d.description += ' ちぎり0回。';
    d.sources = [...d.sources, 'next', 'camp-tail'];
    controls++;
  }
}
writeFileSync(
  new URL('../src/data/next-drills.json', import.meta.url),
  JSON.stringify(drills, null, 2).replace(
    /\[\s*[0-6](?:,\s*[0-6]){5}\s*\]/g,
    (row) => '[' + row.match(/[0-6]/g).join(', ') + ']',
  ) + '\n',
);
console.log({ total: drills.length, attacks, controls });

// 記事の数値盤面と独自の設問から、再現可能な教材を生成する。
import { readFileSync, writeFileSync } from 'node:fs';
import { cloneBoard, gravity, placements, resolve, COLORS } from '../src/engine.ts';
const read = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const figures = read('./research/camp-104662-figures.json');
const curriculum = read('./research/camp-104662-curriculum.json');
const original = read('../src/data/next-drills.json');
const key = (board) => JSON.stringify(board);
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
  return [normalize(board), normalize(board.map((row) => [...row].reverse()))].sort()[0];
}
const seen = new Set(original.filter((d) => !d.attack).map((d) => canonical(d.board)));
const sequences = [];
const cache = new Map();
function moves(board, pair) {
  const id = key(board) + pair;
  if (!cache.has(id)) cache.set(id, placements(board, pair));
  return cache.get(id);
}
const best = (board, pair) =>
  [...moves(board, pair)].sort(
    (a, b) =>
      b.result.chains - a.result.chains ||
      b.result.score - a.result.score ||
      a.path.length - b.path.length,
  )[0];
function removals(board) {
  const heights = Array.from({ length: 6 }, (_, x) => board.filter((row) => row[x]).length);
  const out = [];
  // 記事の主題である右側の接続を補う。左側のGTRだけを復元する課題は作らない。
  for (let x = 5; x >= 3; x--)
    for (const horizontal of [false, true]) {
      if (horizontal ? x === 5 || !heights[x] || !heights[x + 1] : heights[x] < 2) continue;
      const cells = horizontal
        ? [
            { x, y: heights[x] - 1 },
            { x: x + 1, y: heights[x + 1] - 1 },
          ]
        : [
            { x, y: heights[x] - 2 },
            { x, y: heights[x] - 1 },
          ];
      const pair = cells.map((c) => board[c.y][c.x]);
      if (pair.some((c) => c === 6)) continue;
      const before = cloneBoard(board);
      cells.forEach((c) => (before[c.y][c.x] = 0));
      const restore = moves(before, pair).find(
        (p) => !p.result.chains && key(p.result.board) === key(board),
      );
      if (restore) out.push({ before, pair, path: restore.path, target: restore.target });
    }
  return out;
}
for (const f of figures) {
  const lesson = curriculum.find((l) => l.figures.includes(f.id));
  if (!lesson) throw new Error(`設問のない図: ${f.id}`);
  if (
    [2, 5].includes(f.figure) ||
    key(gravity(f.board)) !== key(f.board) ||
    resolve(f.board).chains ||
    f.board.flat().includes(6)
  )
    continue;
  cache.clear();
  const candidates = Array.from({ length: 5 }, (_, c) => ({
    pair: [c + 1, c + 1],
    result: best(f.board, [c + 1, c + 1]),
  }))
    .filter((p) => p.result)
    .sort(
      (a, b) =>
        b.result.result.chains - a.result.result.chains ||
        b.result.result.score - a.result.result.score,
    );
  const probe = candidates[0];
  if (!probe || probe.result.result.chains < 3) continue;
  const minChains = probe.result.result.chains;
  function search(board, remaining, reverse = []) {
    if (!remaining)
      return seen.has(canonical(board)) ? null : { board, steps: [...reverse].reverse() };
    for (const removal of removals(board)) {
      if ((best(removal.before, probe.pair)?.result.chains ?? 0) >= minChains) continue;
      const found = search(removal.before, remaining - 1, [...reverse, removal]);
      if (found) return found;
    }
    return null;
  }
  const selected = search(f.board, 2) ?? search(f.board, 1) ?? search(f.board, 3);
  if (!selected) continue;
  seen.add(canonical(selected.board));
  const { board, steps } = selected;
  sequences.push({
    id: `${f.id}-build`,
    type: 'sequence',
    category: '次の一手',
    topic: lesson.title,
    level: steps.length >= 3 || minChains >= 7 ? '上級' : '中級',
    title: `${lesson.title}・図${f.figure}${f.variant ? `-${f.variant}` : ''}`,
    description: `${steps.length}手で右側の接続を補い、確認ツモから${minChains}連鎖以上。構築中は消さずに組んでください。`,
    hint: lesson.explanation,
    explanation: lesson.explanation,
    tags: [...lesson.tags, '配置問題'],
    board,
    queue: steps.map((s) => s.pair),
    probe: probe.pair,
    minChains,
    witness: steps.map((s) => s.path),
    sources: ['camp-104662'],
    origin: `ちぇすな「GTRの連鎖尾の組み方(主に雪崩系)」図${f.figure}${f.variant ? `-${f.variant}` : ''}`,
    motif: f.id,
    sourceFigures: [f.id],
    solutionNote:
      steps
        .map(
          (p, i) =>
            `${i + 1}手目：${p.target.map((c) => `${COLORS[c.color]}を${c.x + 1}列${c.y + 1}段`).join('、')}`,
        )
        .join('。') + `。確認ツモから${minChains}連鎖。`,
    noSplit: false,
  });
}
const quizzes = curriculum.map((l) => ({
  id: l.id,
  type: 'quiz',
  category: '形の判断',
  topic: l.title,
  level: l.tags.includes('仕込み') || l.tags.includes('鶴亀') ? '上級' : '中級',
  title: `${l.title}・判断`,
  description: l.question,
  question: l.question,
  hint: '図を切り替えて、消える順序・高さ・必要な色を比べてください。',
  explanation: l.explanation,
  options: l.options,
  answer: l.answer,
  tags: [...l.tags, '判断問題'],
  sources: ['camp-104662'],
  board: figures.find((f) => f.id === l.figures[0]).board,
  diagrams: l.figures.map((id) => {
    const f = figures.find((f) => f.id === id);
    return { id, label: `図${f.figure}${f.variant ? `-${f.variant}` : ''}`, board: f.board };
  }),
  sourceFigures: l.figures,
}));
function write(path, data) {
  writeFileSync(
    new URL(path, import.meta.url),
    JSON.stringify(data, null, 2).replace(
      /\[\s*[0-6](?:,\s*[0-6]){5}\s*\]/g,
      (row) => '[' + row.match(/[0-6]/g).join(', ') + ']',
    ) + '\n',
  );
}
write('../src/data/camp-drills.json', sequences);
write('../src/data/camp-quizzes.json', quizzes);
write(
  './research/camp-104662-coverage.json',
  figures.map((f) => ({
    figure: f.id,
    exercises: [...sequences, ...quizzes]
      .filter((d) => d.sourceFigures.includes(f.id))
      .map((d) => d.id),
  })),
);
console.log({
  diagrams: figures.length,
  placement: sequences.length,
  quiz: quizzes.length,
  total: sequences.length + quizzes.length,
});

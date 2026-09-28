export type Color = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Board = Color[][];
export type Pair = [Color, Color];
export type Piece = { x: number; y: number; r: number; pair: Pair; quick?: 'cw' | 'ccw' };
export type Action = 'left' | 'right' | 'cw' | 'ccw' | 'down';
export type Cell = { x: number; y: number; color: Color };
export type ChainStep = {
  before: Board;
  removed: Cell[];
  after: Board;
  score: number;
  colors: number;
  groups: number[];
};
export type Resolution = {
  board: Board;
  steps: ChainStep[];
  chains: number;
  score: number;
  cleared: number;
  allClear: boolean;
};
export const WIDTH = 6;
export const HEIGHT = 13;
export const VISIBLE = 12;
export const COLORS = ['空白', '赤', '緑', '青', '黄', '紫', 'おじゃま'];
export const emptyBoard = (): Board =>
  Array.from({ length: HEIGHT }, () => Array<Color>(WIDTH).fill(0));
export const cloneBoard = (b: Board): Board => b.map((r) => [...r]);
export const spawn = (pair: Pair): Piece => ({ x: 2, y: 11, r: 0, pair });
const offsets = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
export function cells(p: Piece): Cell[] {
  const [dx, dy] = offsets[p.r];
  return [
    { x: p.x, y: p.y, color: p.pair[0] },
    { x: p.x + dx, y: p.y + dy, color: p.pair[1] },
  ];
}
export function fits(b: Board, p: Piece) {
  return cells(p).every((c) => c.x >= 0 && c.x < WIDTH && c.y >= 0 && c.y < HEIGHT && !b[c.y][c.x]);
}
export function move(b: Board, p: Piece, a: Action): Piece {
  if (a === 'left' || a === 'right' || a === 'down') {
    const next = {
      ...p,
      quick: undefined,
      x: p.x + (a === 'left' ? -1 : a === 'right' ? 1 : 0),
      y: p.y - (a === 'down' ? 1 : 0),
    };
    return fits(b, next) ? next : p;
  }
  const next = { ...p, quick: undefined, r: (p.r + (a === 'cw' ? 1 : 3)) % 4 };
  // A narrow vertical shaft permits a two-press 180° swap without passing through the walls.
  if (p.r % 2 === 0 && p.quick === a) {
    const turned = { ...p, quick: undefined, y: p.y + (p.r === 0 ? 1 : -1), r: (p.r + 2) % 4 };
    if (fits(b, turned)) return turned;
  }
  // Basic wall/floor kicks. Product-specific frame timings are not emulated.
  for (const [dx, dy] of [
    [0, 0],
    [next.r === 1 ? -1 : 1, 0],
    [0, 1],
  ]) {
    const kicked = { ...next, x: next.x + dx, y: next.y + dy };
    if (fits(b, kicked)) return kicked;
  }
  if (p.r % 2 === 0 && !fits(b, { ...p, r: 1 }) && !fits(b, { ...p, r: 3 }))
    return p.quick === a ? p : { ...p, quick: a };
  return p;
}
export function gravity(b: Board): Board {
  const result = emptyBoard();
  for (let x = 0; x < WIDTH; x++) {
    let y = 0;
    for (let sy = 0; sy < HEIGHT; sy++) if (b[sy][x]) result[y++][x] = b[sy][x];
  }
  return result;
}
export function landing(b: Board, p: Piece): Cell[] {
  if (!fits(b, p)) return [];
  let q = p;
  while (fits(b, { ...q, y: q.y - 1 })) q = { ...q, y: q.y - 1 };
  const result = cells(q).sort((a, c) => a.y - c.y);
  const copy = cloneBoard(b);
  for (const c of result) {
    while (c.y > 0 && !copy[c.y - 1][c.x]) c.y--;
    copy[c.y][c.x] = c.color;
  }
  return result;
}
const chainBonus = [
  0, 0, 8, 16, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 480, 512,
];
const groupBonus = (n: number) => (n <= 4 ? 0 : n <= 10 ? n - 3 : 10);
export function resolve(input: Board): Resolution {
  let board = cloneBoard(input);
  const steps: ChainStep[] = [];
  let score = 0,
    cleared = 0;
  while (true) {
    const visited = new Set<string>();
    const removed: Cell[] = [],
      groups: number[] = [];
    const colors = new Set<Color>();
    for (let y = 0; y < VISIBLE; y++)
      for (let x = 0; x < WIDTH; x++) {
        const color = board[y][x];
        const key = `${x},${y}`;
        if (!color || color === 6 || visited.has(key)) continue;
        const group: Cell[] = [{ x, y, color }];
        visited.add(key);
        for (let i = 0; i < group.length; i++) {
          const c = group[i];
          for (const [dx, dy] of [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ]) {
            const nx = c.x + dx,
              ny = c.y + dy,
              nk = `${nx},${ny}`;
            if (
              ny >= 0 &&
              ny < VISIBLE &&
              nx >= 0 &&
              nx < WIDTH &&
              board[ny][nx] === color &&
              !visited.has(nk)
            ) {
              visited.add(nk);
              group.push({ x: nx, y: ny, color });
            }
          }
        }
        if (group.length >= 4) {
          removed.push(...group);
          groups.push(group.length);
          colors.add(color);
        }
      }
    if (!removed.length) break;
    const before = cloneBoard(board);
    const colorCount = removed.length;
    const garbage = new Map<string, Cell>();
    for (const c of removed)
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const x = c.x + dx,
          y = c.y + dy;
        if (y >= 0 && y < VISIBLE && x >= 0 && x < WIDTH && board[y][x] === 6)
          garbage.set(`${x},${y}`, { x, y, color: 6 });
      }
    removed.push(...garbage.values());
    for (const c of removed) board[c.y][c.x] = 0;
    board = gravity(board);
    const bonus = Math.min(
      999,
      Math.max(
        1,
        chainBonus[Math.min(19, steps.length + 1)] +
          [0, 0, 3, 6, 12, 24][colors.size] +
          groups.reduce((a, n) => a + groupBonus(n), 0),
      ),
    );
    const stepScore = colorCount * 10 * bonus;
    score += stepScore;
    cleared += colorCount;
    steps.push({
      before,
      removed,
      after: cloneBoard(board),
      score: stepScore,
      colors: colors.size,
      groups,
    });
  }
  return {
    board,
    steps,
    chains: steps.length,
    score,
    cleared,
    allClear: steps.length > 0 && board.every((r) => r.every((c) => c === 0)),
  };
}
export function drop(b: Board, p: Piece): Resolution | null {
  const target = landing(b, p);
  if (target.length !== 2) return null;
  const board = cloneBoard(b);
  target.forEach((c) => {
    board[c.y][c.x] = c.color;
  });
  return resolve(board);
}
export function gameOver(b: Board): boolean {
  return b[11][2] !== 0;
}
export function placements(board: Board, pair: Pair) {
  const initial = spawn(pair);
  if (!fits(board, initial)) return [];
  const queue: { piece: Piece; path: Action[] }[] = [{ piece: initial, path: [] }];
  const visited = new Set<string>();
  const results = new Map<
    string,
    { piece: Piece; path: Action[]; result: Resolution; target: Cell[] }
  >();
  for (let i = 0; i < queue.length; i++) {
    const { piece, path } = queue[i];
    const key = `${piece.x},${piece.y},${piece.r},${piece.quick ?? ''}`;
    if (visited.has(key)) continue;
    visited.add(key);
    const target = landing(board, piece);
    const targetKey = target
      .map((c) => `${c.x},${c.y},${c.color}`)
      .sort()
      .join(';');
    if (!results.has(targetKey))
      results.set(targetKey, { piece, path, result: drop(board, piece)!, target });
    for (const a of ['left', 'right', 'cw', 'ccw', 'down'] as Action[]) {
      const next = move(board, piece, a);
      if (next !== piece) queue.push({ piece: next, path: [...path, a] });
    }
  }
  return [...results.values()];
}
export function fromColumns(columns: number[][]): Board {
  const board = emptyBoard();
  columns.forEach((col, x) =>
    col.forEach((color, y) => {
      board[y][x] = color as Color;
    }),
  );
  return board;
}
export function staircase(n = 3): Board {
  const palette = [1, 3, 2, 4, 5];
  return fromColumns([
    [],
    ...Array.from({ length: n }, (_, i) => [
      palette[i],
      palette[i],
      palette[i],
      ...(i < n - 1 ? [palette[i + 1]] : []),
    ]),
  ]);
}
export const actionLabel: Record<Action, string> = {
  left: '←',
  right: '→',
  cw: 'X',
  ccw: 'Z',
  down: '↓',
};
export function randomPairs(count = 200, seed = Date.now()): Pair[] {
  let s = seed >>> 0;
  const next = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (1 + (s % 4)) as Color;
  };
  // Use high bits to avoid LCG low-bit patterns.
  const color = () => {
    next();
    return (1 + ((s >>> 16) % 4)) as Color;
  };
  return Array.from({ length: count }, () => [color(), color()]);
}

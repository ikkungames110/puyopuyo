import { describe, it, expect } from 'vitest';
import {
  emptyBoard,
  fromColumns,
  staircase,
  spawn,
  fits,
  move,
  landing,
  drop,
  resolve,
  placements,
  randomPairs,
  gameOver,
  gravity,
  type Action,
} from '../src/engine';
import { drills, isCorrect } from '../src/content';
describe('連鎖・得点計算', () => {
  it('4個未満は消さず、入力盤面を変更しない', () => {
    const b = fromColumns([[1, 1, 1]]),
      before = JSON.stringify(b);
    expect(resolve(b).chains).toBe(0);
    expect(JSON.stringify(b)).toBe(before);
  });
  it('4個消し=40点、全消しを検出', () => {
    const r = resolve(fromColumns([[1, 1, 1, 1]]));
    expect(r.score).toBe(40);
    expect(r.allClear).toBe(true);
    expect(r.cleared).toBe(4);
  });
  it('斜めはつながらない', () => {
    const b = emptyBoard();
    for (let i = 0; i < 4; i++) b[i][i] = 1;
    expect(resolve(b).chains).toBe(0);
  });
  it('5連結=100点、11連結=1100点', () => {
    expect(resolve(fromColumns([[1, 1, 1, 1, 1]])).score).toBe(100);
    expect(resolve(fromColumns([Array(11).fill(1)])).score).toBe(1100);
  });
  it('2色同時消し=240点（2連鎖ではない）', () => {
    const r = resolve(
      fromColumns([
        [1, 1, 1, 1],
        [3, 3, 3, 3],
      ]),
    );
    expect(r.score).toBe(240);
    expect(r.chains).toBe(1);
    expect(r.steps[0].colors).toBe(2);
  });
  it('離れた同色の連結ボーナスも合算する', () => {
    expect(resolve(fromColumns([[1, 1, 1, 1, 1], [], [1, 1, 1, 1, 1]])).score).toBe(400);
  });
  it('4個ずつの3連鎖は1000点', () => {
    const b = staircase(3);
    b[0][0] = 1;
    const r = resolve(b);
    expect(r.chains).toBe(3);
    expect(r.score).toBe(1000);
    expect(r.allClear).toBe(true);
  });
  it('おじゃまは隣接分だけ消え、連鎖的には伝わらず、得点にも含まれない', () => {
    const b = fromColumns([[1, 1, 1, 1], [6], [6]]);
    const r = resolve(b);
    expect(r.score).toBe(40);
    expect(r.board[0][1]).toBe(0);
    expect(r.board[0][2]).toBe(6);
  });
  it('13段目は消去判定に参加しない', () => {
    const b = emptyBoard();
    b[9][0] = b[10][0] = b[11][0] = b[12][0] = 1;
    expect(resolve(b).chains).toBe(0);
  });
  it('13段目も消去後には落下する', () => {
    const b = fromColumns([Array(12).fill(1)]);
    b[12][0] = 3;
    const r = resolve(b);
    expect(r.board[0][0]).toBe(3);
    expect(r.board[12][0]).toBe(0);
  });
});
describe('移動・着地・再現性', () => {
  it('3列目から出現し、壁を越えない', () => {
    const b = emptyBoard();
    let p = spawn([1, 3]);
    expect(p.x).toBe(2);
    for (let i = 0; i < 10; i++) p = move(b, p, 'left');
    expect(p.x).toBe(0);
    expect(fits(b, p)).toBe(true);
  });
  it('右壁の右回転は軸を5列目に押し戻す', () => {
    const p = { ...spawn([1, 3]), x: 5 };
    expect(move(emptyBoard(), p, 'cw').x).toBe(4);
    expect(move(emptyBoard(), p, 'ccw').x).toBe(5);
  });
  it('壁際の逆さ置きが成立する', () => {
    const b = emptyBoard();
    let p = { ...spawn([1, 3]), x: 5 };
    p = move(b, move(b, p, 'ccw'), 'ccw');
    expect(landing(b, p)).toEqual([
      { x: 5, y: 0, color: 3 },
      { x: 5, y: 1, color: 1 },
    ]);
  });
  it('横置きの片方が独立して落ちる（ちぎり）', () => {
    const b = fromColumns([[], [], [2, 2, 2]]);
    expect(landing(b, { ...spawn([1, 3]), r: 1 })).toEqual([
      { x: 2, y: 3, color: 1 },
      { x: 3, y: 0, color: 3 },
    ]);
  });
  it('埋まった位置に重ねて置けない', () => {
    const b = emptyBoard();
    b[11][2] = 3;
    expect(fits(b, spawn([1, 3]))).toBe(false);
    expect(drop(b, spawn([1, 3]))).toBeNull();
    expect(gameOver(b)).toBe(true);
  });
  it('同じseedは同じ配ぷよ、すべて4色内', () => {
    expect(randomPairs(100, 123)).toEqual(randomPairs(100, 123));
    expect(new Set(randomPairs(100, 123).flat()).size).toBe(4);
    expect(
      randomPairs(100, 123)
        .flat()
        .every((c) => c >= 1 && c <= 4),
    ).toBe(true);
  });
  it('重力で浮いたぷよを詰める', () => {
    const b = emptyBoard();
    b[4][3] = 1;
    b[8][3] = 2;
    expect(gravity(b)[0][3]).toBe(1);
    expect(gravity(b)[1][3]).toBe(2);
  });
});
describe('全ドリルの妥当性', () => {
  it('IDに重複がない', () => {
    expect(new Set(drills.map((d) => d.id)).size).toBe(drills.length);
  });
  for (const drill of drills) {
    if (drill.type === 'placement')
      it(`${drill.id}: 初期盤面は安定、実際の入力経路で正解できる`, () => {
        expect(resolve(drill.board).chains).toBe(0);
        expect(gravity(drill.board)).toEqual(drill.board);
        const solutions = placements(drill.board, drill.pair).filter((p) =>
          isCorrect(drill, p.result, p.target, p.path.length),
        );
        expect(solutions.length, drill.title).toBeGreaterThan(0);
        for (const s of solutions) {
          const p = s.path.reduce((p, a: Action) => move(drill.board, p, a), spawn(drill.pair));
          expect(landing(drill.board, p)).toEqual(s.target);
          expect(drop(drill.board, p)).toEqual(s.result);
        }
      });
    else
      it(`${drill.id}: 選択肢と出典を持つ`, () => {
        expect(drill.options[drill.answer]).toBeTruthy();
        expect(drill.sources.length).toBeGreaterThan(0);
      });
  }
});

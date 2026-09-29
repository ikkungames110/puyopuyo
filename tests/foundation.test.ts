import { describe, expect, it } from 'vitest';
import { foundations, matchesDrillSearch, practiceDrills } from '../src/content';
import { gravity, resolve, gameOver } from '../src/engine';
import { makeTurn } from '../src/sequence';

const recommended = (id: string) =>
  foundations
    .find((d) => d.id === id)!
    .options.filter((o) => o.recommended)
    .map((o) => o.id);
describe('型を決める前の配ぷよ判断', () => {
  it('以前の穴埋め9問を除き、方針判断だけを記事タグから出す', () => {
    expect(foundations).toHaveLength(9);
    expect(practiceDrills.filter((d) => matchesDrillSearch(d, '#記事n951e68d4fdb9'))).toEqual(
      foundations,
    );
    expect(practiceDrills.filter((d) => d.id.startsWith('note-fold-'))).toHaveLength(0);
    expect(new Set(practiceDrills.map((d) => d.id)).size).toBe(practiceDrills.length);
  });
  it('同じ盤面・同じCURRENTでも、NEXTで優先する方針が変わる', () => {
    const group = ['a1', 'a2', 'a3'].map((id) =>
      foundations.find((d) => d.id === `foundation-${id}`)!,
    );
    expect(group[0].board).toEqual(group[1].board);
    expect(group[1].board).toEqual(group[2].board);
    expect(group[0].queue[0]).toEqual(group[1].queue[0]);
    expect(group[1].queue[0]).toEqual(group[2].queue[0]);
    expect(recommended('foundation-a1')).toEqual(['cushion']);
    expect(recommended('foundation-a2')).toEqual(['seat']);
    expect(recommended('foundation-a3')).toEqual(['key']);
    expect(recommended('foundation-a4')).toEqual(['hold']);
  });
  it('同じ個数・同じツモでも、盤面の緑の位置を見なければ判断できない', () => {
    const right = foundations.find((d) => d.id === 'foundation-b2')!;
    const left = foundations.find((d) => d.id === 'foundation-c1')!;
    expect(right.queue).toEqual(left.queue);
    expect(right.board.flat().filter((c) => c === 2)).toHaveLength(
      left.board.flat().filter((c) => c === 2).length,
    );
    expect(recommended(right.id)).toEqual(['cushion']);
    expect(recommended(left.id)).toEqual(['hold']);
  });
  for (const d of foundations) {
    it(`${d.id}: 未確定の盤面から、説明通りの受けを合法に作れる`, () => {
      expect(
        d.board
          .slice(4)
          .flat()
          .every((c) => c === 0),
      ).toBe(true);
      expect(gravity(d.board)).toEqual(d.board);
      expect(resolve(d.board).chains).toBe(0);
      expect(d.queue).toHaveLength(3);
      expect(d).not.toHaveProperty('probe');
      expect(d).not.toHaveProperty('minChains');
      expect(d.title).not.toMatch(/座布団|卍|クッション|カギ/);
      expect(d.options.filter((o) => o.recommended)).toHaveLength(1);
      for (const o of d.options) {
        if (o.recommended) expect(o.witness).toBeDefined();
        if (!o.witness) continue;
        expect(o.witness).toHaveLength(3);
        let board = d.board;
        o.witness.forEach((path, i) => {
          const turn = makeTurn(board, d.queue[i], path);
          expect(turn.result.chains).toBe(0);
          expect(gameOver(turn.result.board)).toBe(false);
          board = turn.result.board;
        });
        expect(board.slice(0, 3).map((r) => r.slice(0, 3))).toEqual(
          d.board.slice(0, 3).map((r) => r.slice(0, 3)),
        );
        const row = board[3].slice(0, 3);
        if (o.id === 'seat') expect(row).toEqual([2, 2, 2]);
        if (o.id === 'cushion') {
          expect(row.slice(1)).toEqual([2, 2]);
          expect(row[0]).not.toBe(2);
        }
        if (o.id === 'key') {
          expect(row[2]).toBe(2);
          expect(row.slice(0, 2)).not.toContain(2);
        }
      }
      for (const id of d.related)
        expect(foundations.find((other) => other.id === id)?.board).toEqual(d.board);
    });
  }
});

import { describe, it, expect } from 'vitest';
import { drills, sources } from '../src/content';
import { evaluate, makeTurn, replayFrames, witnessTurns } from '../src/sequence';
import { gravity, placements, resolve } from '../src/engine';

describe('中上級の問題集', () => {
  it('72問・15テーマ、50問以上が複数手、入門クイズを含まない', () => {
    expect(drills).toHaveLength(72);
    expect(new Set(drills.map((d) => d.topic)).size).toBe(15);
    expect(drills.filter((d) => d.queue.length > 1).length).toBeGreaterThanOrEqual(50);
    expect(drills.every((d) => d.type === 'sequence' && ['中級', '上級'].includes(d.level))).toBe(
      true,
    );
    expect(drills.filter((d) => d.attack)).toHaveLength(8);
    expect(drills.filter((d) => d.noSplit)).toHaveLength(8);
  });
  it('IDと構築盤面が重複せず、全出典を参照できる', () => {
    expect(new Set(drills.map((d) => d.id)).size).toBe(drills.length);
    expect(new Set(drills.filter((d) => !d.attack).map((d) => JSON.stringify(d.board))).size).toBe(
      64,
    );
    for (const d of drills)
      for (const id of d.sources)
        expect(
          sources.some((s) => s.id === id),
          id,
        ).toBe(true);
    const hosts = new Set(
      drills
        .flatMap((d) => d.sources)
        .map((id) => new URL(sources.find((s) => s.id === id)!.url).hostname),
    );
    expect(hosts.size).toBeGreaterThanOrEqual(7);
  });
  for (const d of drills)
    it(`${d.id}: 安定盤面から全手を操作でき、解答例が制約を満たす`, () => {
      expect(gravity(d.board)).toEqual(d.board);
      expect(resolve(d.board).chains).toBe(0);
      expect(d.witness).toHaveLength(d.queue.length);
      const turns = witnessTurns(d);
      const result = evaluate(d, turns);
      expect(result.correct, result.reasons.join('\n')).toBe(true);
      expect(result.probe!.result.chains).toBeGreaterThanOrEqual(d.minChains);
      expect(replayFrames(d.board, turns, result).at(-1)?.board).toEqual(
        result.probe!.result.board,
      );
      if (!d.attack) {
        expect(turns.every((t) => !t.result.chains)).toBe(true);
        expect(Math.max(...placements(d.board, d.probe).map((p) => p.result.chains))).toBeLessThan(
          d.minChains,
        );
      }
    });
});
describe('正解例との一致ではなく条件で採点する', () => {
  it('構築手数が不足していれば正解にしない', () => {
    const d = drills.find((d) => d.queue.length === 3)!;
    expect(evaluate(d, witnessTurns(d).slice(0, 2)).correct).toBe(false);
  });
  it('異なる合法配置の別解も正解になる', () => {
    let found = false;
    for (const d of drills.filter((d) => d.queue.length === 1 && !d.attack)) {
      const original = witnessTurns(d)[0];
      for (const p of placements(d.board, d.queue[0])) {
        if (JSON.stringify(p.result.board) === JSON.stringify(original.result.board)) continue;
        if (evaluate(d, [makeTurn(d.board, d.queue[0], p.path)]).correct) {
          found = true;
          break;
        }
      }
      if (found) break;
    }
    expect(found).toBe(true);
  });
  it('連鎖が足りても、ちぎり制約に違反した手順は不正解', () => {
    const d = drills.find((d) => !d.attack && witnessTurns(d).some((t) => t.split))!;
    const ts = witnessTurns(d);
    expect(evaluate({ ...d, noSplit: false }, ts).correct).toBe(true);
    const r = evaluate({ ...d, noSplit: true }, ts);
    expect(r.correct).toBe(false);
    expect(r.reasons.join()).toContain('ちぎり');
  });
  it('目標連鎖を失う配置を不正解にし、最大連鎖数を示す', () => {
    const d = drills.find((d) => d.queue.length === 1 && !d.attack)!;
    const wrong = placements(d.board, d.queue[0])
      .map((p) => evaluate(d, [makeTurn(d.board, d.queue[0], p.path)]))
      .find((r) => !r.correct && r.probe && r.probe.result.chains < d.minChains)!;
    expect(wrong.reasons.join()).toContain('最大');
  });
  it('催促は攻撃の火力と本線の残しを両方満たす必要がある', () => {
    const d = drills.find((d) => d.attack && d.queue.length === 1)!;
    const ts = witnessTurns(d);
    expect(evaluate({ ...d, attack: { ...d.attack!, minScore: 999999 } }, ts).correct).toBe(false);
    expect(evaluate({ ...d, minChains: 19 }, ts).correct).toBe(false);
  });
  it('構築途中の暴発を認めない', () => {
    let tested = false;
    for (const d of drills.filter((d) => !d.attack)) {
      const p = placements(d.board, d.queue[0]).find((p) => p.result.chains > 0);
      if (!p) continue;
      const r = evaluate(d, [makeTurn(d.board, d.queue[0], p.path)]);
      expect(r.correct).toBe(false);
      expect(r.reasons.join()).toContain('まだ消さず');
      tested = true;
      break;
    }
    expect(tested).toBe(true);
  });
});

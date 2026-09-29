import { describe, expect, it } from 'vitest';
import { drills, matchesDrillSearch } from '../src/content';
import { placements, COLORS, type Board, type Action } from '../src/engine';
import { evaluate, makeTurn, witnessTurns } from '../src/sequence';
import generated from '../src/data/note-fold-drills.json';

const article = drills.filter((d) => d.sources.includes('note-fold'));
describe('多重折りの最善手問題', () => {
  it('9問すべてを記事・最善手タグで探せる', () => {
    expect(article).toHaveLength(9);
    expect(drills.filter((d) => matchesDrillSearch(d, '#記事n951e68d4fdb9'))).toEqual(article);
    expect(drills.filter((d) => matchesDrillSearch(d, '#最善手'))).toEqual(article);
    expect(new Set(article.map((d) => d.queue.length))).toEqual(new Set([1, 2]));
  });
  for (const d of article) {
    it(`${d.id}: 全合法手順の最大値と採点を照合し、別解と誤答を区別する`, () => {
      const outcomes: { chains: number; path: Action[][] }[] = [];
      function visit(board: Board, path: Action[][]) {
        if (path.length === d.queue.length) {
          outcomes.push({
            chains: Math.max(0, ...placements(board, d.probe).map((p) => p.result.chains)),
            path,
          });
          return;
        }
        for (const p of placements(board, d.queue[path.length])) {
          if (!p.result.chains) visit(p.result.board, [...path, p.path]);
        }
      }
      visit(d.board, []);
      const maximum = Math.max(...outcomes.map((p) => p.chains));
      expect(d.objective).toBe('max-chains');
      expect(d.minChains).toBe(maximum);
      const reference = evaluate(d, witnessTurns(d));
      expect(reference.correct).toBe(true);
      const order = reference
        .probe!.result.steps.map((s) =>
          [...new Set(s.removed.filter((c) => c.color !== 6).map((c) => COLORS[c.color]))].join(
            '＋',
          ),
        )
        .join(' → ');
      expect(d.explanation).toContain(order);
      const winners = outcomes.filter((p) => p.chains === maximum);
      expect(generated.find((g) => g.id === d.id)!.searchAudit).toEqual({
        sequences: outcomes.length,
        optimal: winners.length,
        maxChains: maximum,
      });
      // すべての最適手順を受け入れ、最大値に届かない合法手順を拒否する。
      const wrong = outcomes.find((p) => p.chains < maximum);
      expect(wrong).toBeDefined();
      for (const p of [...winners, wrong!]) {
        let board = d.board;
        const turns = p.path.map((path, i) => {
          const turn = makeTurn(board, d.queue[i], path);
          board = turn.result.board;
          return turn;
        });
        expect(evaluate(d, turns).correct).toBe(p.chains === maximum);
      }
    });
  }
});

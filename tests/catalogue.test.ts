import { describe, it, expect } from 'vitest';
import { drills, quizzes, practiceDrills, matchesDrillSearch, sources } from '../src/content';
import figures from '../scripts/research/camp-104662-figures.json';
import coverage from '../scripts/research/camp-104662-coverage.json';

describe('記事全体の教材化', () => {
  it('本文の全47画像とスライド内の小図を問題に対応づける', () => {
    expect(new Set(figures.map((f) => f.figure))).toEqual(
      new Set(Array.from({ length: 47 }, (_, i) => i + 2)),
    );
    expect(figures).toHaveLength(51);
    expect(coverage).toHaveLength(figures.length);
    for (const f of figures) {
      expect(f.board).toHaveLength(13);
      expect(
        f.board.every(
          (row) => row.length === 6 && row.every((c) => Number.isInteger(c) && c >= 0 && c <= 6),
        ),
      ).toBe(true);
      const linked = coverage.find((c) => c.figure === f.id)!;
      expect(linked.exercises.length, f.id).toBeGreaterThan(0);
      for (const id of linked.exercises)
        expect(practiceDrills.find((d) => d.id === id)?.sourceFigures).toContain(f.id);
    }
    expect(drills.filter((d) => d.sources.includes('camp-104662'))).toHaveLength(35);
    expect(quizzes).toHaveLength(21);
  });
  it('判断問題の選択肢・正解・図・出典に欠落がなく、既存IDと衝突しない', () => {
    expect(new Set(practiceDrills.map((d) => d.id)).size).toBe(practiceDrills.length);
    for (const q of quizzes) {
      expect(q.options).toHaveLength(3);
      expect(new Set(q.options).size).toBe(q.options.length);
      expect(q.options[q.answer]).toBeTruthy();
      expect(q.explanation.length).toBeGreaterThan(10);
      expect(q.diagrams.length).toBeGreaterThan(0);
      for (const diagram of q.diagrams)
        expect(diagram.board).toEqual(figures.find((f) => f.id === diagram.id)?.board);
      for (const source of q.sources) expect(sources.some((s) => s.id === source)).toBe(true);
    }
  });
});
describe('#タグ検索', () => {
  const find = (query: string) => practiceDrills.filter((d) => matchesDrillSearch(d, query));
  it('記事全問をタグで探せて、大小文字・全角記号にも対応する', () => {
    expect(find('#記事104662')).toHaveLength(56);
    expect(find('#ちぇすな')).toHaveLength(56);
    expect(find('＃ＧＴＲ')).toEqual(find('#gtr'));
    expect(find('ちぇすな')).toHaveLength(56);
  });
  it('複数タグとキーワードをANDで絞り込み、タグは完全一致する', () => {
    const found = find('#記事104662 #仕込み 判断');
    expect(found).toHaveLength(3);
    expect(found.every((d) => d.type === 'quiz')).toBe(true);
    expect(find('#Y字下ゾロ').length).toBeGreaterThan(0);
    expect(find('#Y字下')).toHaveLength(0);
    expect(find('#存在しないタグ')).toHaveLength(0);
    expect(find('  ')).toHaveLength(practiceDrills.length);
  });
});

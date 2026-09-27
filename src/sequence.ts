import {
  cloneBoard,
  drop,
  landing,
  move,
  placements,
  spawn,
  type Action,
  type Board,
  type Cell,
  type Pair,
  type Resolution,
} from './engine';
import type { SequenceDrill } from './content';
export type Turn = {
  before: Board;
  pair: Pair;
  target: Cell[];
  result: Resolution;
  inputs: number;
  split: boolean;
};
export function makeTurn(before: Board, pair: Pair, path: Action[]): Turn {
  const piece = path.reduce((p, a) => move(before, p, a), spawn(pair));
  const result = drop(before, piece);
  if (!result) throw new Error('組ぷよを配置できません');
  const target = landing(before, piece);
  return { before, pair, target, result, inputs: path.length, split: isSplit(target) };
}
export function isSplit(target: Cell[]) {
  return target.length === 2 && target[0].x !== target[1].x && target[0].y !== target[1].y;
}
export function witnessTurns(d: SequenceDrill) {
  let board = d.board;
  return d.witness.map((path, i) => {
    const t = makeTurn(board, d.queue[i], path);
    board = t.result.board;
    return t;
  });
}
export function evaluate(d: SequenceDrill, turns: Turn[]) {
  const reasons: string[] = [];
  if (turns.length !== d.queue.length)
    reasons.push(`まだ${d.queue.length - turns.length}手残っています。`);
  const splitCount = turns.filter((t) => t.split).length;
  if (d.noSplit && splitCount)
    reasons.push(
      `ちぎりが${splitCount}回発生しました。横置きする2列の高さをそろえるか、縦置きを検討してください。`,
    );
  turns.forEach((t, i) => {
    if (t.result.chains && (!d.attack || i !== d.queue.length - 1))
      reasons.push(
        `${i + 1}手目で${t.result.chains}連鎖が発生しました。この手ではまだ消さずに接続を残す必要があります。`,
      );
  });
  const last = turns.at(-1);
  if (
    d.attack &&
    last &&
    (last.result.chains < d.attack.min ||
      last.result.chains > d.attack.max ||
      last.result.score < d.attack.minScore)
  ) {
    reasons.push(
      `最後の攻撃は${last.result.chains}連鎖・${last.result.score.toLocaleString()}点。条件は${d.attack.min}〜${d.attack.max}連鎖・${d.attack.minScore.toLocaleString()}点以上です。`,
    );
  }
  const board = last?.result.board ?? d.board;
  const probe = placements(board, d.probe).sort(
    (a, b) =>
      b.result.chains - a.result.chains ||
      b.result.score - a.result.score ||
      a.path.length - b.path.length,
  )[0];
  if (!probe) reasons.push('確認ツモが出現できません。3列目の発火経路を確保してください。');
  else if (probe.result.chains < d.minChains)
    reasons.push(
      `確認ツモの全到達可能配置を調べても最大${probe.result.chains}連鎖。目標まで${d.minChains - probe.result.chains}連鎖不足しています。消去ログの最後に残る色と、解答例の落下位置を比べてください。`,
    );
  return {
    correct: reasons.length === 0,
    reasons,
    probe,
    splitCount,
    inputs: turns.reduce((s, t) => s + t.inputs, 0),
  };
}
export type Evaluation = ReturnType<typeof evaluate>;
export type Frame = { board: Board; highlight?: Cell[]; label: string };
export function replayFrames(initial: Board, turns: Turn[], report: Evaluation): Frame[] {
  const frames: Frame[] = [{ board: initial, label: '開始盤面' }];
  turns.forEach((t, i) => {
    const placed = cloneBoard(t.before);
    t.target.forEach((c) => (placed[c.y][c.x] = c.color));
    frames.push({ board: placed, highlight: t.target, label: `${i + 1}手目の配置` });
    t.result.steps.forEach((s, j) =>
      frames.push({
        board: s.before,
        highlight: s.removed,
        label: `${i + 1}手目・${j + 1}連鎖目（${s.score.toLocaleString()}点）`,
      }),
    );
    if (t.result.chains) frames.push({ board: t.result.board, label: `${i + 1}手目の消去後` });
  });
  const probe = report.probe;
  if (probe) {
    const placed = cloneBoard(turns.at(-1)?.result.board ?? initial);
    probe.target.forEach((c) => (placed[c.y][c.x] = c.color));
    frames.push({
      board: placed,
      highlight: probe.target,
      label: '確認ツモ：最も長くつながる配置',
    });
    probe.result.steps.forEach((s, i) =>
      frames.push({
        board: s.before,
        highlight: s.removed,
        label: `接続検証・${i + 1}連鎖目（${s.score.toLocaleString()}点）`,
      }),
    );
    frames.push({ board: probe.result.board, label: `検証終了：${probe.result.chains}連鎖` });
  }
  return frames;
}

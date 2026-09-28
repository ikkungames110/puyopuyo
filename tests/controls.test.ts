import { describe, it, expect } from 'vitest';
import { InputRepeater, defaultControls, gamepadCommands, type Command } from '../src/controls';
import { emptyBoard, move, type Piece } from '../src/engine';
const held = (...cs: Command[]) => new Set(cs);
describe('入力の長押しとエッジ検出', () => {
  it('左右は初動・DAS・ARRの間隔で動き、遅延フレームを連続送信しない', () => {
    const r = new InputRepeater();
    expect(r.update(held('left'), 0, defaultControls)).toEqual(['left']);
    expect(r.update(held('left'), 149, defaultControls)).toEqual([]);
    expect(r.update(held('left'), 150, defaultControls)).toEqual(['left']);
    expect(r.update(held('left'), 194, defaultControls)).toEqual([]);
    expect(r.update(held('left'), 195, defaultControls)).toEqual(['left']);
    expect(r.update(held('left'), 5000, defaultControls)).toEqual(['left']);
  });
  it('回転・即設置は押し直すまで繰り返さない', () => {
    const r = new InputRepeater();
    const actions = held('cw', 'drop');
    expect(r.update(actions, 0, defaultControls)).toEqual(['cw', 'drop']);
    expect(r.update(actions, 1000, defaultControls)).toEqual([]);
    r.update(held(), 1010, defaultControls);
    expect(r.update(actions, 1020, defaultControls)).toEqual(['cw', 'drop']);
  });
  it('左右同時押しは中立、下は横移動と同時に繰り返せる', () => {
    const r = new InputRepeater();
    expect(r.update(held('left', 'right', 'down'), 0, defaultControls)).toEqual(['down']);
    expect(r.update(held('left', 'right', 'down'), 40, defaultControls)).toEqual(['down']);
    expect(r.update(held('right', 'down'), 50, defaultControls)).toEqual(['right']);
    r.reset();
    expect(r.update(held('left'), 55, defaultControls)).toEqual(['left']);
  });
  it('ボタンとスティックを同時入力しても、移動・回転してから一度だけ設置する', () => {
    const r = new InputRepeater();
    expect(r.update(held('drop', 'down', 'cw', 'right'), 0, defaultControls)).toEqual([
      'right',
      'cw',
      'drop',
    ]);
    r.reset();
    expect(r.update(held('undo', 'drop', 'left'), 0, defaultControls)).toEqual(['undo']);
    expect(r.update(held('undo'), 1000, defaultControls)).toEqual([]);
  });
  it('スティックの遊び・標準ボタン・未割り当て・上方向を扱う', () => {
    const buttons = Array.from({ length: 16 }, (_, i) => ({
      pressed: [0, 15].includes(i),
      touched: false,
      value: 0,
    }));
    expect([...gamepadCommands({ buttons, axes: [0.1, -1] }, defaultControls)]).toEqual([
      'right',
      'ccw',
      'drop',
    ]);
    expect([...gamepadCommands({ buttons: [], axes: [-0.8, 0.8] }, defaultControls)]).toEqual([
      'left',
      'down',
    ]);
    const config = { ...defaultControls, buttons: { ...defaultControls.buttons, ccw: -1 } };
    expect(gamepadCommands({ buttons, axes: [] }, config).has('ccw')).toBe(false);
  });
  it('十字キー上とスティック上は、同時入力や長押しでも一度だけハードドロップする', () => {
    const buttons = Array.from({ length: 17 }, (_, i) => ({
      pressed: i === 12,
      touched: false,
      value: i === 12 ? 1 : 0,
    }));
    const r = new InputRepeater();
    const up = gamepadCommands({ buttons, axes: [0, -1] }, defaultControls);
    expect([...up]).toEqual(['drop']);
    const oldMapping = { ...defaultControls, buttons: { ...defaultControls.buttons, undo: 12 } };
    expect([...gamepadCommands({ buttons, axes: [] }, oldMapping)]).toEqual(['drop']);
    expect(r.update(up, 0, defaultControls)).toEqual(['drop']);
    expect(r.update(up, 1000, defaultControls)).toEqual([]);
    r.update(new Set(), 1100, defaultControls);
    expect(
      r.update(
        gamepadCommands({ buttons: [], axes: [0, -1] }, defaultControls),
        1200,
        defaultControls,
      ),
    ).toEqual(['drop']);
    expect(gamepadCommands({ buttons: [], axes: [0, -0.2] }, defaultControls).has('drop')).toBe(
      false,
    );
  });
});
describe('クイックターン', () => {
  it('両側を囲まれた縦ぷよを2度押しでその場で入れ替える', () => {
    const b = emptyBoard();
    for (let y = 0; y < 13; y++) {
      b[y][1] = 6;
      b[y][3] = 6;
    }
    const p: Piece = { x: 2, y: 3, r: 0, pair: [1, 2] };
    const armed = move(b, p, 'cw');
    expect(armed.r).toBe(0);
    const swapped = move(b, armed, 'cw');
    expect(swapped).toMatchObject({ x: 2, y: 4, r: 2 });
    expect(move(b, move(b, swapped, 'ccw'), 'ccw')).toMatchObject({ x: 2, y: 3, r: 0 });
  });
  it('移動に成功したら2度押しの予約を解除する', () => {
    const b = emptyBoard();
    const p: Piece = { x: 2, y: 5, r: 0, pair: [1, 2], quick: 'cw' };
    expect(move(b, p, 'down').quick).toBeUndefined();
  });
});

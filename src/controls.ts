import type { Action } from './engine';

export type Command = Action | 'drop' | 'undo' | 'answer';
export type ControlSettings = {
  das: number;
  arr: number;
  softDrop: number;
  deadzone: number;
  buttons: Record<Command, number>;
};
export const defaultControls: ControlSettings = {
  das: 150,
  arr: 45,
  softDrop: 40,
  deadzone: 0.35,
  buttons: { left: 14, right: 15, down: 13, ccw: 0, cw: 1, drop: 3, undo: 4, answer: 9 },
};
export const commandLabels: Record<Command, string> = {
  left: '左移動',
  right: '右移動',
  down: '下入力',
  ccw: '左回転',
  cw: '右回転',
  drop: '即設置',
  undo: '1手戻す',
  answer: '答え合わせ',
};
export function readControls(): ControlSettings {
  try {
    const value = JSON.parse(localStorage.getItem('puyolab-controls-v1') || '{}');
    const bounded = (key: 'das' | 'arr' | 'softDrop' | 'deadzone', min: number, max: number) =>
      typeof value[key] === 'number' && Number.isFinite(value[key])
        ? Math.max(min, Math.min(max, value[key]))
        : defaultControls[key];
    return {
      das: bounded('das', 80, 350),
      arr: bounded('arr', 20, 150),
      softDrop: bounded('softDrop', 20, 150),
      deadzone: bounded('deadzone', 0.15, 0.85),
      buttons: Object.fromEntries(
        Object.entries(defaultControls.buttons).map(([key, fallback]) => {
          const b = value.buttons?.[key];
          return [key, Number.isInteger(b) && b >= -1 && b < 32 ? b : fallback];
        }),
      ) as Record<Command, number>,
    };
  } catch {
    return { ...defaultControls, buttons: { ...defaultControls.buttons } };
  }
}
export const keyCommands: Record<string, Command> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowDown: 'down',
  ArrowUp: 'cw',
  KeyZ: 'ccw',
  KeyX: 'cw',
  Space: 'drop',
  KeyU: 'undo',
  Enter: 'answer',
};
export function gamepadCommands(pad: Pick<Gamepad, 'buttons' | 'axes'>, settings: ControlSettings) {
  const held = new Set<Command>();
  for (const [command, index] of Object.entries(settings.buttons))
    if (index >= 0 && pad.buttons[index]?.pressed) held.add(command as Command);
  if ((pad.axes[0] ?? 0) < -settings.deadzone) held.add('left');
  if ((pad.axes[0] ?? 0) > settings.deadzone) held.add('right');
  if ((pad.axes[1] ?? 0) > settings.deadzone) held.add('down');
  // Up is deliberately unbound: pressing up on a physical pad must not rotate or drop.
  return held;
}

/** All input devices share app-controlled repeat timings, independent of OS key repeat. */
export class InputRepeater {
  private next = new Map<Command, number>();
  reset() {
    this.next.clear();
  }
  update(held: Set<Command>, now: number, settings: ControlSettings): Command[] {
    const effective = new Set(held);
    if (held.has('left') && held.has('right')) {
      effective.delete('left');
      effective.delete('right');
    }
    for (const command of this.next.keys()) if (!effective.has(command)) this.next.delete(command);
    const events: Command[] = [];
    for (const command of effective) {
      const repeat = command === 'left' || command === 'right' || command === 'down';
      const next = this.next.get(command);
      if (next === undefined || (repeat && now >= next)) {
        events.push(command);
        // Never catch up missed frames in a burst after a suspended tab.
        this.next.set(
          command,
          now +
            (command === 'down'
              ? settings.softDrop
              : next === undefined
                ? settings.das
                : settings.arr),
        );
      }
    }
    // Stick directions are appended after buttons by the browser adapter. Apply movement
    // and rotation before placement regardless of which physical controls produced them.
    if (events.includes('undo')) return ['undo'];
    const order: Command[] = ['left', 'right', 'ccw', 'cw', 'down', 'drop', 'answer'];
    return events
      .filter((c) => c !== 'down' || !events.includes('drop'))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }
}

import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  InputRepeater,
  gamepadCommands,
  keyCommands,
  readControls,
  type Command,
  type ControlSettings,
} from './controls';

function textInput(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    !!target.closest('input,textarea,select,[contenteditable="true"],[data-controls-settings]')
  );
}
export default function useGameControls(
  onCommand: (command: Command) => void,
  onRelease: () => void,
) {
  const [settings, setSettings] = useState(readControls);
  const [devices, setDevices] = useState<{ index: number; id: string; mapping: string }[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number[]>([]);
  const [supported, setSupported] = useState(true);
  const current = useRef({ onCommand, onRelease, settings, selected });
  current.current = { onCommand, onRelease, settings, selected };
  useEffect(() => {
    const keys = new Set<string>();
    const repeater = new InputRepeater();
    let frame = 0,
      previousDown = false,
      suspended = false,
      padArmed = false;
    let padId = '',
      deviceSignature = '',
      pressedSignature = '';
    function release() {
      keys.clear();
      repeater.reset();
      current.current.onRelease();
      previousDown = false;
      padArmed = false;
    }
    function pump() {
      const { settings: config, selected: choice } = current.current;
      let pads: Gamepad[] = [];
      try {
        pads = [...(navigator.getGamepads?.() ?? [])].filter(
          (p): p is Gamepad => !!p && p.connected,
        );
        setSupported(!!navigator.getGamepads);
      } catch {
        setSupported(false);
      }
      const signature = pads.map((p) => `${p.index}:${p.id}:${p.mapping}`).join('|');
      if (signature !== deviceSignature) {
        deviceSignature = signature;
        setDevices(pads.map(({ index, id, mapping }) => ({ index, id, mapping })));
      }
      const pad = choice === null ? pads[0] : pads.find((p) => p.index === choice);
      const identity = pad ? `${pad.index}:${pad.id}` : '';
      if (identity !== padId) {
        release();
        padId = identity;
      }
      const buttons = pad?.buttons.flatMap((b, i) => (b.pressed ? [i] : [])) ?? [];
      if (buttons.join() !== pressedSignature) {
        pressedSignature = buttons.join();
        setPressed(buttons);
      }
      const padHeld = pad ? gamepadCommands(pad, config) : new Set<Command>();
      if (document.hidden || !document.hasFocus() || textInput(document.activeElement)) {
        if (!suspended) release();
        suspended = true;
        return;
      }
      if (suspended) {
        release();
        suspended = false;
      }
      if (!padHeld.size) padArmed = true;
      const held = new Set<Command>([...keys].map((key) => keyCommands[key]));
      if (padArmed) for (const c of padHeld) held.add(c);
      if (previousDown && !held.has('down')) current.current.onRelease();
      previousDown = held.has('down');
      for (const command of repeater.update(held, performance.now(), config))
        flushSync(() => current.current.onCommand(command));
    }
    const tick = () => {
      pump();
      frame = requestAnimationFrame(tick);
    };
    function keydown(e: KeyboardEvent) {
      if (!keyCommands[e.code] || textInput(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      // Enter on focused UI controls keeps its normal activation behavior.
      if (e.code === 'Enter' && (e.target as HTMLElement)?.closest('button,a,summary')) return;
      e.preventDefault();
      if (!e.repeat) {
        keys.add(e.code);
        pump();
      }
    }
    function keyup(e: KeyboardEvent) {
      keys.delete(e.code);
      pump();
    }
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', release);
    document.addEventListener('visibilitychange', release);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      release();
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', release);
      document.removeEventListener('visibilitychange', release);
    };
  }, []);
  function updateSettings(next: ControlSettings) {
    setSettings(next);
    try {
      localStorage.setItem('puyolab-controls-v1', JSON.stringify(next));
    } catch {
      /* session only */
    }
  }
  return { settings, updateSettings, devices, selected, setSelected, pressed, supported };
}

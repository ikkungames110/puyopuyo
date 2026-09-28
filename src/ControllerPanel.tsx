import { Gamepad2 } from 'lucide-react';
import { commandLabels, defaultControls, type Command } from './controls';
import type useGameControls from './useGameControls';

export default function ControllerPanel({
  controls,
}: {
  controls: ReturnType<typeof useGameControls>;
}) {
  const { settings, updateSettings, devices, selected, setSelected, pressed, supported } = controls;
  const device = selected === null ? devices[0] : devices.find((p) => p.index === selected);
  return (
    <details
      className="controller-panel"
      data-controls-settings
      onToggle={(e) => {
        if (!e.currentTarget.open && e.currentTarget.contains(document.activeElement))
          (document.activeElement as HTMLElement | null)?.blur();
      }}
    >
      <summary>
        <Gamepad2 size={17} /> コントローラー・操作設定 <span>{device ? '接続中' : '未接続'}</span>
      </summary>
      <div className="controller-settings">
        <p role="status">
          {!supported
            ? 'このブラウザではゲームパッドを利用できません。キーボードで操作できます。'
            : device
              ? device.id
              : 'USB / Bluetoothで接続し、コントローラーのボタンを一度押してください。'}
        </p>
        {!!devices.length && (
          <label>
            使用するコントローラー
            <select
              value={selected ?? 'auto'}
              onChange={(e) =>
                setSelected(e.target.value === 'auto' ? null : Number(e.target.value))
              }
            >
              <option value="auto">自動選択</option>
              {devices.map((d) => (
                <option key={d.index} value={d.index}>
                  {d.index + 1}: {d.id}
                </option>
              ))}
            </select>
          </label>
        )}
        <p>
          十字キー /
          左スティックで移動、下で落下、上でハードドロップ（即設置）。下を押したまま接地すると250msで確定。入力しなければ落下しません。
        </p>
        <p>
          標準配置：下側ボタンで左回転、右側で右回転、上側で即設置、L / LBで戻す、Start /
          Optionsで答え合わせ。
        </p>
        {device?.mapping !== 'standard' && device && (
          <p>標準配列以外の機器です。下のボタン番号を使って割り当ててください。</p>
        )}
        <output className="pad-monitor">
          押しているボタン：{pressed.length ? pressed.map((n) => `B${n}`).join(' / ') : 'なし'}
        </output>
        <div className="controller-mapping">
          {(Object.keys(commandLabels) as Command[]).map((c) => (
            <label key={c}>
              {commandLabels[c]}
              <select
                aria-label={`${commandLabels[c]}のボタン`}
                value={settings.buttons[c]}
                onChange={(e) => {
                  const index = Number(e.target.value);
                  const buttons = { ...settings.buttons };
                  for (const key of Object.keys(buttons) as Command[])
                    if (index >= 0 && buttons[key] === index) buttons[key] = -1;
                  buttons[c] = index;
                  updateSettings({ ...settings, buttons });
                }}
              >
                <option value={-1}>割り当てなし</option>
                {Array.from({ length: 32 }, (_, i) => (
                  <option key={i} value={i} disabled={i === 12 && c !== 'drop'}>
                    B{i}
                    {i === 12 ? '（十字キー上・即設置専用）' : ''}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="controller-timing">
          {(
            [
              ['das', '横移動の長押し待ち', 80, 350, 10],
              ['arr', '横移動の間隔', 20, 150, 5],
              ['softDrop', '下入力の間隔', 20, 150, 5],
              ['deadzone', 'スティックの遊び', 0.15, 0.85, 0.05],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label key={key}>
              {label}：
              {key === 'deadzone' ? `${Math.round(settings[key] * 100)}%` : `${settings[key]}ms`}
              <input
                aria-label={label}
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={(e) => updateSettings({ ...settings, [key]: Number(e.target.value) })}
              />
            </label>
          ))}
        </div>
        <button
          className="secondary"
          onClick={() =>
            updateSettings({ ...defaultControls, buttons: { ...defaultControls.buttons } })
          }
        >
          操作設定を初期値に戻す
        </button>
        <small>
          設定中はゲーム入力を停止します。設定の外をクリックすると再開できます。回転ボタン2度押しでクイックターン。製品ごとのフレーム精度は再現していません。
        </small>
      </div>
    </details>
  );
}

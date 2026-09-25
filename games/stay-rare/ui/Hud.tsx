import type { HudData } from './hudData';

export function Hud({ data, muted, onPause, onMute }: { data: HudData; muted: boolean; onPause(): void; onMute(): void }) {
  return <div className="sr-hud" data-ui>
    <div className="sr-hud-left">
      <span className="sr-lv" aria-label={`Level ${data.level}`}>LV {data.level}</span>
      <div className="sr-hud-bars">
        <div className="sr-bar sr-hp" role="meter" aria-label="Health" aria-valuemin={0} aria-valuemax={data.maxHp} aria-valuenow={data.hp}>
          <span style={{ width: `${data.hp / data.maxHp * 100}%` }} /><small>{data.hp}/{data.maxHp}</small>
        </div>
        <div className="sr-bar sr-xp" role="meter" aria-label="Experience" aria-valuemin={0} aria-valuemax={100} aria-valuenow={data.xpPct}><span style={{ width: `${data.xpPct}%` }} /></div>
      </div>
    </div>
    <div className="sr-hud-info">
      <strong className="sr-clock">{data.time}</strong>
      <span>{data.phase}</span>
      <span className="sr-bosses" aria-label={`${data.bosses} bosses defeated`}>✕ {data.bosses}</span>
    </div>
    <div className="sr-hud-buttons">
      <button type="button" className="sr-icon" aria-label="Pause" onClick={onPause}>II</button>
      <button type="button" className={`sr-icon${muted ? ' sr-muted-icon' : ''}`} aria-label="Sound" aria-pressed={!muted} onClick={onMute}>♪</button>
    </div>
  </div>;
}

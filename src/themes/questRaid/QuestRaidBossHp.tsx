import { useEffect, useRef, useState } from 'react'
import { hpState } from './questRaidEvents'

export function QuestRaidBossHp({ name, hp, maxHp, alive, reduced, peaceful }: {
  name: string
  hp: number
  maxHp: number
  alive: number
  reduced: boolean
  peaceful: boolean
}) {
  const [shown, setShown] = useState(hp)
  const previous = useRef(hp)
  useEffect(() => {
    const from = previous.current, to = hp
    previous.current = to
    if (reduced || from === to) { setShown(to); return }
    const started = performance.now()
    let id = 0
    const tick = () => {
      const t = Math.min(1, (performance.now() - started) / 220)
      setShown(Math.round(from + (to - from) * t))
      if (t < 1) id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [hp, reduced])
  if (peaceful) return <div className="qr-boss-hp qr-window" aria-label="へんせい">へんせい</div>
  if (maxHp <= 0) return <div className="qr-boss-hp qr-window" aria-label={name}>{name}</div>
  const state = hpState(shown, maxHp)
  const ratio = maxHp <= 0 ? 0 : Math.max(0, Math.min(1, shown / maxHp))
  return <div className={`qr-boss-hp qr-window qr-${state}`} aria-label={`${name} HP ${shown}/${maxHp}`}>
    <div className="qr-boss-hp-head"><strong>{name}</strong><span>せいぞん {alive}</span></div>
    <div className="qr-boss-hp-nums">H <b>{shown}</b><i>/{maxHp}</i></div>
    <span className="qr-boss-hp-bar" aria-hidden="true"><i style={{ width: `${ratio * 100}%` }} /></span>
  </div>
}

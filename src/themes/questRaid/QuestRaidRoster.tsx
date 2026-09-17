import { useEffect, useRef, useState } from 'react'
import type { Fighter } from './questRaidEvents'
import { hpState } from './questRaidEvents'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

function Status({ fighter, critical, acting, targeted, compact, reduced, rank, plain }: {
  fighter: Fighter; critical: boolean; acting: boolean; targeted: boolean; compact: boolean; reduced: boolean; rank?: number; plain?: boolean
}) {
  const [hp, setHp] = useState(fighter.hp)
  const previous = useRef(fighter.hp)
  useEffect(() => {
    const from = previous.current, to = fighter.hp
    previous.current = to
    if (reduced || from === to) { setHp(to); return }
    const started = performance.now()
    let id = 0
    const tick = () => { const t = Math.min(1, (performance.now() - started) / 110); setHp(Math.round(from + (to - from) * t)); if (t < 1) id = requestAnimationFrame(tick) }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [fighter.hp, reduced])
  const state = hpState(fighter.hp, fighter.maxHp)
  const ratio = fighter.maxHp <= 0 ? 0 : Math.max(0, Math.min(1, hp / fighter.maxHp))
  return <div
    className={`qr-chip qr-${state}${critical ? ' qr-critical-enter' : ''}${acting ? ' qr-acting' : ''}${targeted ? ' qr-targeted' : ''}`}
    title={`${fighter.name} HP ${hp}/${fighter.maxHp} MP ${fighter.mp}/${fighter.maxMp}`}
  >
    <span className="qr-chip-name">{rank ? `${rank}. ` : acting ? '▶' : ''}{fighter.name}</span>
    {!plain && <>
      <span className="qr-chip-stats">
        <span>H <b>{hp}</b>{!compact && <i>/{fighter.maxHp}</i>}</span>
        <em>M {fighter.mp}</em>
      </span>
      <span className="qr-chip-bar" aria-hidden="true"><i style={{ width: `${ratio * 100}%` }} /></span>
    </>}
  </div>
}

export function QuestRaidRoster({ fighters, criticalIds, actorId, targetIds, reduced, groups, showOrder }: {
  fighters: Fighter[]
  criticalIds: string[]
  actorId?: string
  targetIds?: string[]
  reduced: boolean
  groups?: string[][]
  showOrder?: boolean
}) {
  const density = densityFor(fighters.length)
  const compact = density === 'crowd' || density === 'mass'
  const targets = new Set(targetIds ?? [])
  const byId = new Map(fighters.map((fighter) => [fighter.id, fighter]))
  const chip = (fighter: Fighter, rank?: number) => <Status
    key={fighter.id}
    fighter={fighter}
    critical={criticalIds.includes(fighter.id)}
    acting={actorId === fighter.id}
    targeted={targets.has(fighter.id)}
    compact={compact}
    reduced={reduced}
    rank={rank}
    plain={Boolean(groups?.length || showOrder)}
  />
  if (groups?.length) {
    return <section className={`qr-roster qr-density-${density} qr-parties`} aria-label="パーティー分け">
      <div className="qr-roster-board">
        {groups.map((group, index) => <div className="qr-party" key={index}>
          <div className="qr-party-label">パーティー {index + 1}<small>{group.length}人</small></div>
          <div className="qr-party-members">{group.map((id) => byId.get(id)).filter((fighter): fighter is Fighter => Boolean(fighter)).map((fighter) => chip(fighter))}</div>
        </div>)}
      </div>
    </section>
  }
  return <section className={`qr-roster qr-density-${density}${showOrder ? ' qr-ordered' : ''}`} aria-label="なかまのステータス">
    <div className="qr-roster-board">
      {fighters.map((fighter, index) => chip(fighter, showOrder ? index + 1 : undefined))}
    </div>
  </section>
}

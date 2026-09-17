import { useEffect, useRef, useState } from 'react'
import type { Fighter } from './questRaidEvents'
import { hpState } from './questRaidEvents'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

const PARTY_ACCENTS = ['#ffe66f', '#7dff92', '#7ed7ff', '#ff9fe5', '#ffae6f', '#c7a3ff']

function Status({ fighter, critical, acting, targeted, compact, reduced }: {
  fighter: Fighter; critical: boolean; acting: boolean; targeted: boolean; compact: boolean; reduced: boolean
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
  const accent = fighter.party ? PARTY_ACCENTS[(fighter.party - 1) % PARTY_ACCENTS.length] : undefined
  return <div
    className={`qr-chip qr-${state}${critical ? ' qr-critical-enter' : ''}${acting ? ' qr-acting' : ''}${targeted ? ' qr-targeted' : ''}`}
    title={`${fighter.name} HP ${hp}/${fighter.maxHp} MP ${fighter.mp}/${fighter.maxMp}`}
    style={fighter.party ? {
      position: 'relative',
      borderColor: accent,
      boxShadow: `inset 0 0 0 1px ${accent}66, 0 0 9px ${accent}33, 0 1px 0 #010b35`,
    } : undefined}
  >
    {fighter.party && <span aria-label={`パーティー ${fighter.party}`} style={{
      position: 'absolute',
      top: 2,
      right: 3,
      zIndex: 1,
      padding: '1px 4px',
      border: `1px solid ${accent}`,
      borderRadius: 2,
      background: '#031653e8',
      color: accent,
      fontSize: compact ? 9 : 10,
      lineHeight: 1.1,
      fontWeight: 800,
      textShadow: '1px 1px 0 #00103f',
      pointerEvents: 'none',
    }}>{fighter.party}組</span>}
    <span className="qr-chip-name" style={fighter.party ? { paddingRight: compact ? 25 : 29 } : undefined}>{acting ? '▶' : ''}{fighter.name}</span>
    <span className="qr-chip-stats">
      <span>H <b>{hp}</b>{!compact && <i>/{fighter.maxHp}</i>}</span>
      <em>M {fighter.mp}</em>
    </span>
    <span className="qr-chip-bar" aria-hidden="true"><i style={{ width: `${ratio * 100}%` }} /></span>
  </div>
}

export function QuestRaidRoster({ fighters, criticalIds, actorId, targetIds, reduced }: {
  fighters: Fighter[]
  criticalIds: string[]
  actorId?: string
  targetIds?: string[]
  reduced: boolean
}) {
  const density = densityFor(fighters.length)
  const compact = density === 'crowd' || density === 'mass'
  const targets = new Set(targetIds ?? [])
  return <section className={`qr-roster qr-density-${density}`} aria-label="なかまのステータス">
    <div className="qr-roster-board">
      {fighters.map(f => <Status
        key={f.id}
        fighter={f}
        critical={criticalIds.includes(f.id)}
        acting={actorId === f.id}
        targeted={targets.has(f.id)}
        compact={compact}
        reduced={reduced}
      />)}
    </div>
  </section>
}

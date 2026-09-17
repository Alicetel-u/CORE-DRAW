import { useEffect, useRef, useState } from 'react'
import type { Fighter } from './questRaidEvents'
import { hpState } from './questRaidEvents'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

const PARTY_PALETTES = [
  { accent: '#ffe66f', tint: 'rgba(255,230,111,.13)' },
  { accent: '#7dff92', tint: 'rgba(125,255,146,.13)' },
  { accent: '#7ed7ff', tint: 'rgba(126,215,255,.13)' },
  { accent: '#ff9fe5', tint: 'rgba(255,159,229,.13)' },
  { accent: '#ffae6f', tint: 'rgba(255,174,111,.13)' },
  { accent: '#c7a3ff', tint: 'rgba(199,163,255,.13)' },
  { accent: '#76f0df', tint: 'rgba(118,240,223,.13)' },
  { accent: '#ff8f9f', tint: 'rgba(255,143,159,.13)' },
]

const RANK_GOLD = '#ffd65a'

function paletteFor(party: number) {
  return PARTY_PALETTES[(party - 1) % PARTY_PALETTES.length]
}

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
  const partyAccent = fighter.party ? paletteFor(fighter.party).accent : undefined
  const decorated = Boolean(fighter.rank || fighter.party)
  const accent = fighter.rank ? RANK_GOLD : partyAccent
  return <div
    className={`qr-chip qr-${state}${critical ? ' qr-critical-enter' : ''}${acting ? ' qr-acting' : ''}${targeted ? ' qr-targeted' : ''}`}
    title={`${fighter.rank ? `${fighter.rank}番 ` : ''}${fighter.name} HP ${hp}/${fighter.maxHp} MP ${fighter.mp}/${fighter.maxMp}`}
    style={decorated ? fighter.rank ? {
      position: 'relative',
      border: `2px solid ${RANK_GOLD}`,
      background: 'linear-gradient(180deg,rgba(91,70,15,.98),rgba(38,27,4,.98))',
      boxShadow: `inset 0 0 0 1px rgba(255,247,190,.55), 0 0 10px rgba(255,214,90,.28), 0 1px 0 #010b35`,
    } : {
      position: 'relative',
      borderColor: accent,
      boxShadow: `inset 0 0 0 1px ${accent}55, 0 1px 0 #010b35`,
    } : undefined}
  >
    {fighter.rank && <span aria-label={`${fighter.rank}番`} style={{
      position: 'absolute',
      top: 2,
      left: 3,
      zIndex: 2,
      minWidth: compact ? 17 : 20,
      height: compact ? 17 : 20,
      display: 'grid',
      placeItems: 'center',
      padding: '0 3px',
      border: '1px solid #fff0a3',
      borderRadius: 3,
      background: RANK_GOLD,
      color: '#241700',
      fontSize: compact ? 10 : 12,
      lineHeight: 1,
      fontWeight: 950,
      boxShadow: '0 1px 0 #5b4100, 0 0 7px rgba(255,214,90,.35)',
      pointerEvents: 'none',
    }}>{fighter.rank}</span>}
    <span className="qr-chip-name" style={fighter.rank ? { paddingLeft: compact ? 22 : 26 } : undefined}>{acting ? '▶' : ''}{fighter.name}</span>
    <span className="qr-chip-stats">
      <span>H <b>{hp}</b>{!compact && <i>/{fighter.maxHp}</i>}</span>
      <em>M {fighter.mp}</em>
    </span>
    <span className="qr-chip-bar" aria-hidden="true"><i style={{ width: `${ratio * 100}%` }} /></span>
  </div>
}

function FighterStatus({ fighter, criticalIds, actorId, targets, compact, reduced }: {
  fighter: Fighter
  criticalIds: string[]
  actorId?: string
  targets: Set<string>
  compact: boolean
  reduced: boolean
}) {
  return <Status
    fighter={fighter}
    critical={criticalIds.includes(fighter.id)}
    acting={actorId === fighter.id}
    targeted={targets.has(fighter.id)}
    compact={compact}
    reduced={reduced}
  />
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
  const ranked = fighters.filter(f => f.rank).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
  const partyNumbers = Array.from(new Set(fighters.flatMap(f => f.party ? [f.party] : []))).sort((a, b) => a - b)

  if (ranked.length) {
    const rankedIds = new Set(ranked.map(f => f.id))
    const unranked = fighters.filter(f => !rankedIds.has(f.id))
    const ordered = [...ranked, ...unranked]
    return <section className={`qr-roster qr-density-${density}`} aria-label="決定した並び順">
      <div className="qr-roster-board">
        {ordered.map(f => <FighterStatus
          key={f.id}
          fighter={f}
          criticalIds={criticalIds}
          actorId={actorId}
          targets={targets}
          compact={compact}
          reduced={reduced}
        />)}
      </div>
    </section>
  }

  if (!partyNumbers.length) {
    return <section className={`qr-roster qr-density-${density}`} aria-label="なかまのステータス">
      <div className="qr-roster-board">
        {fighters.map(f => <FighterStatus
          key={f.id}
          fighter={f}
          criticalIds={criticalIds}
          actorId={actorId}
          targets={targets}
          compact={compact}
          reduced={reduced}
        />)}
      </div>
    </section>
  }

  const unassigned = fighters.filter(f => !f.party)
  const blockColumns = partyNumbers.length <= 3 ? 1 : partyNumbers.length <= 8 ? 2 : 3
  const memberColumns = fighters.length <= 12 ? 2 : fighters.length <= 28 ? 2 : 3

  return <section className={`qr-roster qr-density-${density}`} aria-label="パーティー編成">
    <div className="qr-roster-board" style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${blockColumns}, minmax(0, 1fr))`,
      gridAutoRows: 'minmax(0, auto)',
      alignContent: 'start',
      gap: 5,
      overflow: 'hidden',
    }}>
      {partyNumbers.map(party => {
        const members = fighters.filter(f => f.party === party)
        const palette = paletteFor(party)
        return <section key={party} aria-label={`${party}組`} style={{
          minWidth: 0,
          padding: 4,
          border: `2px solid ${palette.accent}`,
          borderRadius: 4,
          background: `linear-gradient(180deg, ${palette.tint}, rgba(2,16,67,.72))`,
          boxShadow: `inset 0 0 0 1px ${palette.accent}22, 0 0 8px ${palette.accent}18`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 4,
            marginBottom: 3,
            color: palette.accent,
            fontSize: compact ? 10 : 11,
            fontWeight: 900,
            lineHeight: 1.05,
            textShadow: '1px 1px 0 #00103f',
          }}>
            <span>◆ {party}組</span><span>{members.length}人</span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.min(memberColumns, Math.max(1, members.length))}, minmax(0, 1fr))`,
            gap: 3,
          }}>
            {members.map(f => <FighterStatus
              key={f.id}
              fighter={f}
              criticalIds={criticalIds}
              actorId={actorId}
              targets={targets}
              compact={true}
              reduced={reduced}
            />)}
          </div>
        </section>
      })}
      {unassigned.length > 0 && <section aria-label="未決定" style={{
        minWidth: 0,
        padding: 4,
        border: '1px dashed rgba(220,232,255,.42)',
        borderRadius: 4,
        background: 'rgba(2,16,67,.36)',
        gridColumn: blockColumns > 1 && unassigned.length > 4 ? '1 / -1' : undefined,
      }}>
        <div style={{
          marginBottom: 3,
          color: '#b8c9ef',
          fontSize: compact ? 9 : 10,
          fontWeight: 700,
          lineHeight: 1.05,
        }}>まだ決まっていない仲間</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${density === 'mass' ? 5 : density === 'crowd' ? 4 : density === 'pack' ? 3 : 2}, minmax(0, 1fr))`,
          gap: 3,
        }}>
          {unassigned.map(f => <FighterStatus
            key={f.id}
            fighter={f}
            criticalIds={criticalIds}
            actorId={actorId}
            targets={targets}
            compact={compact}
            reduced={reduced}
          />)}
        </div>
      </section>}
    </div>
  </section>
}

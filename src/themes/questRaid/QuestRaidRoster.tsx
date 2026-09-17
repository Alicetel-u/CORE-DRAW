import { useEffect, useRef, useState } from 'react'
import type { Fighter } from './questRaidEvents'
import { hpState } from './questRaidEvents'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

const PARTY_ACCENTS = [
  '#d8bd72',
  '#78a88d',
  '#759bb3',
  '#a887a0',
  '#b68d70',
  '#9286ad',
  '#719d99',
  '#ae7e84',
]

const RANK_GOLD = '#ffd65a'

function accentFor(party: number) {
  return PARTY_ACCENTS[(party - 1) % PARTY_ACCENTS.length]
}

function Status({ fighter, critical, acting, targeted, compact, reduced, insidePartyBlock = false }: {
  fighter: Fighter; critical: boolean; acting: boolean; targeted: boolean; compact: boolean; reduced: boolean; insidePartyBlock?: boolean
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
  const partyAccent = fighter.party ? accentFor(fighter.party) : undefined
  const decorated = Boolean(fighter.rank || (fighter.party && !insidePartyBlock))
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
      boxShadow: `inset 0 0 0 1px ${accent}44, 0 1px 0 #010b35`,
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

function FighterStatus({ fighter, criticalIds, actorId, targets, compact, reduced, insidePartyBlock = false }: {
  fighter: Fighter
  criticalIds: string[]
  actorId?: string
  targets: Set<string>
  compact: boolean
  reduced: boolean
  insidePartyBlock?: boolean
}) {
  return <Status
    fighter={fighter}
    critical={criticalIds.includes(fighter.id)}
    acting={actorId === fighter.id}
    targeted={targets.has(fighter.id)}
    compact={compact}
    reduced={reduced}
    insidePartyBlock={insidePartyBlock}
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
  const rowCount = partyNumbers.length + (unassigned.length ? 1 : 0)

  return <section className={`qr-roster qr-density-${density}`} aria-label="パーティー編成">
    <div className="qr-roster-board" style={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr)',
      gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))`,
      alignContent: 'stretch',
      gap: 7,
      overflow: 'hidden',
    }}>
      {partyNumbers.map(party => {
        const members = fighters.filter(f => f.party === party)
        const accent = accentFor(party)
        const memberColumns = members.length <= 2 ? members.length : members.length <= 6 ? 3 : members.length <= 12 ? 4 : 5
        return <section key={party} aria-label={`パーティ${party}`} style={{
          minWidth: 0,
          minHeight: 0,
          display: 'grid',
          gridTemplateRows: 'auto minmax(0, 1fr)',
          padding: 5,
          border: '1px solid rgba(194,210,242,.28)',
          borderLeft: `5px solid ${accent}`,
          borderRadius: 4,
          background: 'linear-gradient(180deg, rgba(6,28,88,.96), rgba(2,16,67,.96))',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,.035)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            minHeight: compact ? 20 : 24,
            margin: '-1px -1px 5px',
            padding: compact ? '3px 7px' : '4px 8px',
            borderBottom: '1px solid rgba(194,210,242,.16)',
            background: 'rgba(255,255,255,.018)',
            color: '#f3f6ff',
            textShadow: '1px 1px 0 #00103f',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <i aria-hidden="true" style={{
                width: compact ? 7 : 8,
                height: compact ? 7 : 8,
                flex: '0 0 auto',
                borderRadius: 2,
                background: accent,
              }} />
              <strong style={{
                fontSize: compact ? 13 : 16,
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: '.04em',
              }}>パーティ{party}</strong>
            </span>
            <span style={{
              fontSize: compact ? 10 : 12,
              lineHeight: 1,
              fontWeight: 700,
              color: '#b9c6e3',
            }}>{members.length}人</span>
          </div>
          <div style={{
            minWidth: 0,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(1, memberColumns)}, minmax(0, 1fr))`,
            gridAutoRows: 'minmax(0, 1fr)',
            gap: 4,
          }}>
            {members.map(f => <FighterStatus
              key={f.id}
              fighter={f}
              criticalIds={criticalIds}
              actorId={actorId}
              targets={targets}
              compact={true}
              reduced={reduced}
              insidePartyBlock={true}
            />)}
          </div>
        </section>
      })}
      {unassigned.length > 0 && <section aria-label="未決定" style={{
        minWidth: 0,
        minHeight: 0,
        display: 'grid',
        gridTemplateRows: 'auto minmax(0, 1fr)',
        padding: 5,
        border: '1px dashed rgba(194,210,242,.3)',
        borderRadius: 4,
        background: 'rgba(2,16,67,.5)',
        overflow: 'hidden',
      }}>
        <div style={{
          marginBottom: 4,
          color: '#9eaccd',
          fontSize: compact ? 10 : 12,
          fontWeight: 700,
          lineHeight: 1.05,
        }}>振り分け待ち</div>
        <div style={{
          minWidth: 0,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${density === 'mass' ? 5 : density === 'crowd' ? 4 : density === 'pack' ? 3 : 2}, minmax(0, 1fr))`,
          gridAutoRows: 'minmax(0, 1fr)',
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

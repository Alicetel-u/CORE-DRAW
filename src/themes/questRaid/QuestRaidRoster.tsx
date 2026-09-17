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

function PartyBox({ party, expectedSize, members }: {
  party: number
  expectedSize: number
  members: Fighter[]
}) {
  const accent = accentFor(party)
  const slots = Array.from({ length: expectedSize }, (_, index) => members[index]?.name ?? '')
  const nameColumns = expectedSize <= 7 ? 1 : expectedSize <= 14 ? 2 : 3
  const nameRows = Math.max(1, Math.ceil(expectedSize / nameColumns))
  const nameFontSize = expectedSize <= 5 ? 13 : expectedSize <= 10 ? 11 : 10

  return <section aria-label={`パーティ${party}`} style={{
    minWidth: 0,
    minHeight: 0,
    width: '100%',
    height: '100%',
    boxSizing: 'border-box',
    display: 'grid',
    gridTemplateRows: '28px minmax(0, 1fr)',
    border: '2px solid rgba(230,237,255,.78)',
    borderTopColor: accent,
    borderRadius: 4,
    background: '#061b59',
    overflow: 'hidden',
    boxShadow: '0 2px 0 #010b35',
  }}>
    <header style={{
      minWidth: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 5,
      padding: '0 6px',
      borderBottom: '1px solid rgba(230,237,255,.24)',
      background: '#08236d',
      color: '#fff',
      lineHeight: 1,
      overflow: 'hidden',
    }}>
      <strong style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 950 }}>パーティ{party}</strong>
      <span style={{ flex: '0 0 auto', fontSize: 9, color: '#b9c6e3' }}>{members.length}/{expectedSize}</span>
    </header>
    <div style={{
      minWidth: 0,
      minHeight: 0,
      padding: '4px 5px',
      display: 'grid',
      gridTemplateColumns: `repeat(${nameColumns}, minmax(0, 1fr))`,
      gridTemplateRows: `repeat(${nameRows}, minmax(0, 1fr))`,
      gap: 2,
      overflow: 'hidden',
    }}>
      {slots.map((name, index) => <div key={index} style={{
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        color: name ? '#fff' : '#52658f',
        fontSize: nameFontSize,
        lineHeight: 1,
        overflow: 'hidden',
      }}>
        <span aria-hidden="true" style={{
          width: 4,
          height: 4,
          flex: '0 0 auto',
          background: name ? accent : '#33466f',
        }} />
        <span style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>{name || '────'}</span>
      </div>)}
    </div>
  </section>
}

export function QuestRaidRoster({ fighters, criticalIds, actorId, targetIds, reduced, groupSizes }: {
  fighters: Fighter[]
  criticalIds: string[]
  actorId?: string
  targetIds?: string[]
  reduced: boolean
  groupSizes?: number[]
}) {
  const density = densityFor(fighters.length)
  const compact = density === 'crowd' || density === 'mass'
  const targets = new Set(targetIds ?? [])
  const ranked = fighters.filter(f => f.rank).sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))

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

  const grouping = Boolean(groupSizes?.length)
  const currentPartyNumbers = Array.from(new Set(fighters.flatMap(f => f.party ? [f.party] : []))).sort((a, b) => a - b)
  const partyNumbers = grouping ? groupSizes!.map((_, index) => index + 1) : currentPartyNumbers

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

  if (grouping) {
    const assignedCount = fighters.filter(f => f.party).length
    const partyCount = partyNumbers.length
    const partyColumns = partyCount <= 2 ? 1 : partyCount <= 6 ? 2 : partyCount <= 12 ? 3 : 4
    const partyRows = Math.max(1, Math.ceil(partyCount / partyColumns))

    return <section className={`qr-roster qr-density-${density}`} aria-label="パーティー編成" style={{ overflow: 'hidden' }}>
      <div style={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'grid',
        gridTemplateRows: '28px minmax(0, 1fr)',
        gap: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 4px',
          color: '#dfe7fb',
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1,
        }}>
          <span>パーティ編成</span>
          <span style={{ color: '#98a8cc', fontWeight: 700 }}>決定 {assignedCount}/{fighters.length}</span>
        </div>
        <div style={{
          minWidth: 0,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: `repeat(${partyColumns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${partyRows}, minmax(0, 1fr))`,
          gap: 6,
          overflow: 'hidden',
          padding: 2,
        }}>
          {partyNumbers.map(party => <PartyBox
            key={party}
            party={party}
            expectedSize={Math.max(1, groupSizes![party - 1])}
            members={fighters.filter(f => f.party === party)}
          />)}
        </div>
      </div>
    </section>
  }

  return <section className={`qr-roster qr-density-${density}`} aria-label="パーティー編成">
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

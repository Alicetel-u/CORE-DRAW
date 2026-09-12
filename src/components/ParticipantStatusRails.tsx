import type { DrawMode, DrawResult, Participant } from '../core/types'

type ParticipantStatusRailsProps = {
  participants: Participant[]
  mode: DrawMode
  result: DrawResult | null
  revealed: boolean
  excludedIds: string[]
  exclusionActive: boolean
}

const WINNER_MODES = new Set<DrawMode>(['single_winner', 'multi_winner', 'top_n_ordered'])

export function ParticipantStatusRails({
  participants,
  mode,
  result,
  revealed,
  excludedIds,
  exclusionActive,
}: ParticipantStatusRailsProps) {
  const currentWinnerIds = revealed && result && WINNER_MODES.has(result.mode) ? new Set(result.winnerIds) : new Set<string>()
  const excludedIdSet = new Set(excludedIds)
  const resultOrder = new Map<string, number>()
  const resultGroups = new Map<string, number>()

  if (revealed && result) {
    if (result.mode === 'ordered_list' || result.mode === 'shuffle_only') {
      result.orderedIds.forEach((id, index) => resultOrder.set(id, index + 1))
    }
    if (result.mode === 'top_n_ordered') {
      result.winnerIds.forEach((id, index) => resultOrder.set(id, index + 1))
    }
    if (result.mode === 'grouping') {
      ;(result.groups ?? []).forEach((group, groupIndex) => {
        group.forEach((id) => resultGroups.set(id, groupIndex + 1))
      })
    }
  }

  const half = Math.ceil(participants.length / 2)
  const leftParticipants = participants.slice(0, half)
  const rightParticipants = participants.slice(half)
  const density = participants.length <= 18 ? 'small' : participants.length <= 36 ? 'medium' : 'large'
  const groupedResult = revealed && result?.mode === 'grouping' && (result.groups?.length ?? 0) > 0
  const groups = groupedResult ? result.groups ?? [] : []
  const partySplit = Math.ceil(groups.length / 2)
  const leftGroups = groups.slice(0, partySplit)
  const rightGroups = groups.slice(partySplit)
  const partyDensity = groups.length <= 4 ? 'party-few' : groups.length <= 8 ? 'party-medium' : 'party-many'
  const participantById = new Map(participants.map((participant) => [participant.id, participant]))

  function statusText(participant: Participant) {
    const winner = currentWinnerIds.has(participant.id)
    const order = resultOrder.get(participant.id)
    if (winner && !order) return '当選'
    const group = resultGroups.get(participant.id)
    if (group) return `${group}組`
    if (exclusionActive && excludedIdSet.has(participant.id) && !winner) return '除外'
    return null
  }

  function tile(participant: Participant, grouped = false) {
    const index = participants.findIndex((item) => item.id === participant.id)
    const winner = currentWinnerIds.has(participant.id)
    const excluded = exclusionActive && excludedIdSet.has(participant.id) && !winner
    const status = grouped ? null : statusText(participant)
    const resultNumber = resultOrder.get(participant.id)
    const showsResultNumber = typeof resultNumber === 'number'
    const resultKind = mode === 'top_n_ordered' ? 'rank' : mode === 'ordered_list' || mode === 'shuffle_only' ? 'order' : null
    const displayNumber = showsResultNumber ? String(resultNumber) : String(index + 1).padStart(2, '0')

    return <div className={`participant-status-tile ${winner ? 'is-winner' : ''} ${excluded ? 'is-excluded' : ''} ${showsResultNumber ? 'has-result-number' : ''} ${resultKind ? `result-${resultKind}` : ''} ${grouped ? 'is-party-member' : ''}`} key={participant.id}>
      <span className="participant-status-number">{displayNumber}</span>
      <span className="participant-status-name">{participant.name}</span>
      {status && <span className="participant-status-badge">{status}</span>}
    </div>
  }

  function party(group: string[], groupIndex: number) {
    const members = group.map((id) => participantById.get(id)).filter((participant): participant is Participant => Boolean(participant))
    const colorClass = `party-color-${groupIndex % 8 + 1}`
    const sizeClass = members.length > 16 ? 'party-size-huge' : members.length > 8 ? 'party-size-large' : 'party-size-normal'
    return <section className={`party-group ${colorClass} ${sizeClass}`} key={`party-${groupIndex}`}>
      <header className="party-group-heading">
        <strong>{groupIndex + 1}組</strong>
        <span>{members.length}人</span>
      </header>
      <div className="party-group-members">{members.map((participant) => tile(participant, true))}</div>
    </section>
  }

  if (groupedResult) {
    return <div className={`participant-status-board party-result-board ${partyDensity}`} aria-label="決定したパーティー">
      <div className="party-group-rail party-group-left">{leftGroups.map((group, index) => party(group, index))}</div>
      <div className="party-group-rail party-group-right">{rightGroups.map((group, index) => party(group, partySplit + index))}</div>
      <div className="party-group-mobile-strip">{groups.map((group, index) => party(group, index))}</div>
    </div>
  }

  return <div className={`participant-status-board density-${density}`} aria-label="参加者の抽選状態">
    <div className="participant-status-rail participant-status-left">{leftParticipants.map((participant) => tile(participant))}</div>
    <div className="participant-status-rail participant-status-right">{rightParticipants.map((participant) => tile(participant))}</div>
    <div className="participant-status-mobile-strip">{participants.map((participant) => tile(participant))}</div>
  </div>
}

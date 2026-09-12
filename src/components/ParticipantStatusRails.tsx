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

  function statusText(participant: Participant) {
    const winner = currentWinnerIds.has(participant.id)
    const order = resultOrder.get(participant.id)
    if (winner && !order) return '当選'
    const group = resultGroups.get(participant.id)
    if (group) return `${group}組`
    if (exclusionActive && excludedIdSet.has(participant.id) && !winner) return '除外'
    return null
  }

  function tile(participant: Participant) {
    const index = participants.findIndex((item) => item.id === participant.id)
    const winner = currentWinnerIds.has(participant.id)
    const excluded = exclusionActive && excludedIdSet.has(participant.id) && !winner
    const status = statusText(participant)
    const resultNumber = resultOrder.get(participant.id)
    const showsResultNumber = typeof resultNumber === 'number'
    const resultKind = mode === 'top_n_ordered' ? 'rank' : mode === 'ordered_list' || mode === 'shuffle_only' ? 'order' : null
    const displayNumber = showsResultNumber ? String(resultNumber) : String(index + 1).padStart(2, '0')

    return <div className={`participant-status-tile ${winner ? 'is-winner' : ''} ${excluded ? 'is-excluded' : ''} ${showsResultNumber ? 'has-result-number' : ''} ${resultKind ? `result-${resultKind}` : ''}`} key={participant.id}>
      <span className="participant-status-number">{displayNumber}</span>
      <span className="participant-status-name">{participant.name}</span>
      {status && <span className="participant-status-badge">{status}</span>}
    </div>
  }

  return <div className={`participant-status-board density-${density}`} aria-label="参加者の抽選状態">
    <div className="participant-status-rail participant-status-left">{leftParticipants.map(tile)}</div>
    <div className="participant-status-rail participant-status-right">{rightParticipants.map(tile)}</div>
    <div className="participant-status-mobile-strip">{participants.map(tile)}</div>
  </div>
}

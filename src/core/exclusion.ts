import type { DrawMode, DrawResult, Participant } from './types'

export function exclusionApplies(mode: DrawMode) {
  return mode === 'single_winner' || mode === 'multi_winner' || mode === 'top_n_ordered'
}

export function exclusionIds(result: DrawResult) {
  return exclusionApplies(result.mode) ? result.winnerIds : []
}

export function knownExcludedIds(participants: Participant[], excludedIds: string[]) {
  const known = new Set(participants.map((participant) => participant.id))
  return excludedIds.filter((id) => known.has(id))
}

export function partitionParticipants(
  participants: Participant[],
  excludedIds: string[],
  liveWinnerIds: string[] = [],
) {
  const excludedSet = new Set(knownExcludedIds(participants, excludedIds))
  const live = new Set(liveWinnerIds)
  return {
    candidates: participants.filter((participant) => !excludedSet.has(participant.id) || live.has(participant.id)),
    excluded: participants.filter((participant) => excludedSet.has(participant.id) && !live.has(participant.id)),
    nextPool: participants.filter((participant) => !excludedSet.has(participant.id)),
  }
}

export function canStartDraw(nextPoolCount: number, exclusionOn: boolean) {
  return nextPoolCount >= 2 || exclusionOn && nextPoolCount === 1
}

export function cycleComplete(exclusionOn: boolean, excludedCount: number, nextPoolCount: number) {
  return exclusionOn && excludedCount > 0 && nextPoolCount === 0
}

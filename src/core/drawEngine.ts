import type { DrawRequest, DrawResult } from './types'

function hashString(value: string) {
  let h = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: T[], seed: string) {
  const out = [...items]
  const random = mulberry32(hashString(seed))
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function resolveDraw(request: DrawRequest): DrawResult {
  const count = request.participants.length
  const lastRemaining = count === 1 && (request.mode === 'single_winner' || request.mode === 'multi_winner' || request.mode === 'top_n_ordered')
  if (count < 1 || count > 50 || !lastRemaining && count < 2) {
    throw new Error('CORE-DRAW supports 2 to 50 participants.')
  }

  const seed = request.seed ?? crypto.randomUUID()
  const ordered = shuffled(request.participants, `${request.drawId}:${seed}`)
  const winnerCount = Math.max(1, Math.min(request.winnerCount ?? 1, ordered.length))

  let winnerIds: string[] = []
  let groups: string[][] | undefined

  switch (request.mode) {
    case 'single_winner':
      winnerIds = [ordered[0].id]
      break
    case 'multi_winner':
    case 'top_n_ordered':
      winnerIds = ordered.slice(0, winnerCount).map((p) => p.id)
      break
    case 'ordered_list':
    case 'shuffle_only':
      winnerIds = ordered.map((p) => p.id)
      break
    case 'grouping': {
      const groupCount = Math.max(2, Math.min(request.groupCount ?? 2, ordered.length))
      groups = Array.from({ length: groupCount }, () => [])
      ordered.forEach((participant, index) => groups![index % groupCount].push(participant.id))
      winnerIds = []
      break
    }
  }

  return {
    drawId: request.drawId,
    mode: request.mode,
    seed,
    createdAt: new Date().toISOString(),
    orderedIds: ordered.map((p) => p.id),
    winnerIds,
    groups,
  }
}

// IMPORTANT: This deterministic resolver is for local preview and shared result replay.
// Production fairness must resolve and persist the result on the server before cinematic playback starts.

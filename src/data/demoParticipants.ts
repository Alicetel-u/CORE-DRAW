import type { Participant } from '../core/types'

export const demoParticipants: Participant[] = Array.from({ length: 12 }, (_, index) => ({
  id: `demo-${index + 1}`,
  name: `PLAYER ${String(index + 1).padStart(2, '0')}`,
  number: index + 1,
  seed: `core-draw-demo-${index + 1}`,
}))

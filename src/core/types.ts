export type DrawMode =
  | 'single_winner'
  | 'multi_winner'
  | 'ordered_list'
  | 'top_n_ordered'
  | 'grouping'
  | 'shuffle_only'

export type DrawPhase =
  | 'idle'
  | 'charging'
  | 'mixing'
  | 'selection'
  | 'impact'
  | 'reveal'
  | 'complete'

export type QualityTier = 'ultra' | 'high' | 'lite'

export interface Participant {
  id: string
  name: string
  number?: number
  avatarUrl?: string
  seed?: string
}

export interface DrawRequest {
  drawId: string
  mode: DrawMode
  participants: Participant[]
  winnerCount?: number
  groupCount?: number
  seed?: string
  startedAt?: string
}

export interface DrawResult {
  drawId: string
  mode: DrawMode
  seed: string
  createdAt: string
  orderedIds: string[]
  winnerIds: string[]
  groups?: string[][]
}

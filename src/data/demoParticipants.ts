import type { Participant } from '../core/types'

const DEMO_NAMES = [
  'ユウキ', 'ミオ', 'レン', 'アオイ', 'ハル', 'ナナ', 'ソラ', 'リン',
  'カイ', 'メイ', 'レオ', 'ヒナ', 'トワ', 'サキ', 'ルイ', 'ノア',
  'コウ', 'ユナ', 'リク', 'エマ', 'シン', 'モモ', 'ナギ', 'レイ',
]

function shuffledNames() {
  const names = [...DEMO_NAMES]
  for (let i = names.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }
  return names.slice(0, 12)
}

export function createDemoParticipants(): Participant[] {
  return shuffledNames().map((name, index) => ({
    id: `demo-${index + 1}`,
    name,
    number: index + 1,
    seed: `core-draw-demo-${index + 1}`,
  }))
}

export const demoParticipants: Participant[] = createDemoParticipants()

try {
  const stored = JSON.parse(localStorage.getItem('core-participants') ?? 'null') as Participant[] | null
  const legacyDefaults = Array.isArray(stored)
    && stored.length === 12
    && stored.every((participant, index) => participant?.id === `demo-${index + 1}` && /^PLAYER \d{2}$/.test(participant?.name ?? ''))

  if (legacyDefaults) {
    localStorage.setItem('core-participants', JSON.stringify(demoParticipants))
  }
} catch {
  // Keep defaults usable when storage is unavailable.
}

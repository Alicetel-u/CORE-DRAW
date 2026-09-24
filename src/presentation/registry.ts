import type { PresentationTheme } from './types'
export const PRESENTATION_THEMES: { id: PresentationTheme; label: string }[] = [
  { id: 'bingo', label: 'BINGO / ビンゴ' }, { id: 'core', label: 'CORE' }, { id: 'quest_raid', label: 'QUEST RAID' },
]
export function initialTheme(): PresentationTheme {
  try {
    const value = localStorage.getItem('core-presentation-theme')
    if (value === 'bingo' || value === '"bingo"') return 'bingo'
    return value === 'quest_raid' || value === '"quest_raid"' ? 'quest_raid' : 'core'
  } catch { return 'core' }
}

import type { PresentationTheme } from './types'
export const PRESENTATION_THEMES: { id: PresentationTheme; label: string }[] = [
  { id: 'core', label: 'CORE' }, { id: 'quest_raid', label: 'QUEST RAID' },
]
export function initialTheme(): PresentationTheme {
  try {
    const value = localStorage.getItem('core-presentation-theme')
    return value === 'quest_raid' || value === '"quest_raid"' ? 'quest_raid' : 'core'
  } catch { return 'core' }
}

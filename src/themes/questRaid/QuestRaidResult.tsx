import type { DrawResult, Participant } from '../../core/types'
import './questRaidResult.css'

export function QuestRaidResult({ result }: { result: DrawResult; participants: Participant[] }) {
  const highlightSurvivors = result.mode !== 'grouping' && result.mode !== 'shuffle_only'
  return <span
    className={`qr-result-marker${highlightSurvivors ? ' qr-result-highlight-survivors' : ''}`}
    aria-hidden="true"
  />
}

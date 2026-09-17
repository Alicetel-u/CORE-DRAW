import type { ReactNode } from 'react'
import type { DrawResult, Participant } from '../../../core/types'
import type { TavernFrame, TavernScript } from './questRaidTavernDirector'
import { QuestRaidTavernHostess } from './QuestRaidTavernHostess'
import { QuestRaidTavernParty } from './QuestRaidTavernParty'
import './questRaidTavern.css'

export function QuestRaidTavern({
  script, frame, participants, reduced, revealed, result, action, onAdvance,
}: {
  script: TavernScript | null
  frame: TavernFrame | null
  participants: Participant[]
  reduced: boolean
  revealed: boolean
  result: DrawResult | null
  action?: ReactNode
  onAdvance?: () => void
}) {
  const beat = frame?.beat
  const groups = beat?.revealedGroups ?? (revealed ? result?.groups ?? [] : [])
  const currentIndex = beat?.partyIndex ?? -1
  const currentMembers = beat?.members ?? []
  const finale = Boolean(revealed || beat?.finale)
  const pose = beat?.pose ?? 'idle'
  const speaker = beat?.speaker === 'member' && beat.name ? `【${beat.name}】` : '【店員】'
  const chars = beat ? Array.from(beat.text) : []
  const text = beat ? (frame?.typed ? beat.text : chars.slice(0, Math.max(1, Math.floor((frame.elapsed - beat.at) / (reduced ? 8 : 22)))).join('')) : 'いらっしゃいませー！'
  return <div className={`qr-tavern${reduced ? ' qr-tavern-reduced' : ''}`}>
    <div className="qr-tavern-scene">
      <QuestRaidTavernParty
        groups={finale ? result?.groups ?? groups : groups}
        titles={script?.titles ?? []}
        currentIndex={finale ? -1 : currentIndex}
        currentMembers={finale ? [] : currentMembers}
        finale={finale}
        participants={participants}
      />
      <QuestRaidTavernHostess pose={pose} reduced={reduced} />
    </div>
    <button type="button" className="qr-tavern-dialogue qr-window" onClick={() => onAdvance?.()} aria-label="会話">
      <strong>{speaker}</strong>
      <span>{text}</span>
    </button>
    {action}
  </div>
}
import type { QuestBattleEvent } from './questRaidEvents'
import { QuestRaidMessage } from './QuestRaidMessage'

const COMMANDS = ['たたかう', 'じゅもん', 'どうぐ', 'にげる'] as const

export function QuestRaidHud({ event, age, reduced }: { event: QuestBattleEvent; age: number; reduced: boolean }) {
  const active = event.type === 'player_item' ? 2 : event.type === 'player_spell' || event.type === 'player_heal' ? 1 : event.type.startsWith('boss') || event.type === 'knockout' ? 3 : event.type === 'player_attack' || event.type === 'final_strike' ? 0 : -1
  return <div className="qr-hud">
    <div className="qr-command qr-window" aria-label="コマンド">
      {COMMANDS.map((label, i) => <div key={label} className={active === i ? 'qr-cmd-on' : ''}>{active === i ? '▶' : '　'}{label}</div>)}
    </div>
    <QuestRaidMessage message={event.message} age={age} reduced={reduced} />
  </div>
}

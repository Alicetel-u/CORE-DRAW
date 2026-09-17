import type { QuestBattleEvent } from './questRaidEvents'
import { COMMANDS, COMMAND_INDEX } from './questRaidSkills'
import { QuestRaidMessage } from './QuestRaidMessage'

export function QuestRaidHud({ event, age, reduced }: { event: QuestBattleEvent; age: number; reduced: boolean }) {
  const active = COMMAND_INDEX[event.type] ?? -1
  return <div className="qr-hud">
    <div className="qr-command qr-window" aria-label="コマンド">
      {COMMANDS.map((label, i) => <div key={label} className={active === i ? 'qr-cmd-on' : ''}>{active === i ? '▶' : '　'}{label}</div>)}
    </div>
    <QuestRaidMessage message={event.message} age={age} reduced={reduced} />
  </div>
}

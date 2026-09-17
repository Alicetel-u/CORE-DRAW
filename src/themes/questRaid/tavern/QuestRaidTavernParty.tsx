import type { Participant } from '../../../core/types'

export function QuestRaidTavernParty({
  groups, titles, currentIndex, currentMembers, finale, participants,
}: {
  groups: string[][]
  titles: string[]
  currentIndex: number
  currentMembers: string[]
  finale: boolean
  participants: Participant[]
}) {
  const byId = new Map(participants.map((participant) => [participant.id, participant]))
  const visible = groups.map((members, index) => ({ index, members, title: titles[index] }))
  if (!finale && currentIndex >= 0 && currentIndex >= groups.length) {
    visible.push({ index: currentIndex, members: currentMembers, title: titles[currentIndex] })
  }
  return <div className={`qrt-parties${finale ? ' qrt-parties-finale' : ''}`} aria-label="パーティ">
    {visible.map((card) => <section className="qrt-card" key={card.index}>
      <header>
        <strong>パーティ {card.index + 1}</strong>
        {card.title && <em>{card.title}</em>}
        <small>{card.members.length}人</small>
      </header>
      <ol>
        {card.members.map((id) => <li key={id}>{byId.get(id)?.name ?? 'なまえなし'}</li>)}
      </ol>
    </section>)}
  </div>
}
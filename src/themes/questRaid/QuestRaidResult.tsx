import type { DrawResult, Participant } from '../../core/types'
import './questRaidResult.css'

function densityFor(count: number) {
  return count <= 1 ? 'solo' : count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

function initialFor(name: string) {
  const value = name.trim()
  return value ? value.slice(0, 1) : '？'
}

export function QuestRaidResult({ result, participants }: { result: DrawResult; participants: Participant[] }) {
  const people = new Map(participants.map(p => [p.id, p]))
  const groups = result.mode === 'grouping'
    ? result.groups ?? []
    : [result.mode === 'single_winner' || result.mode === 'multi_winner' || result.mode === 'top_n_ordered' ? result.winnerIds : result.orderedIds]
  const entries = groups.flatMap((ids, group) => ids.map((id, index) => ({ id, group, index })))
  const density = densityFor(entries.length)
  const heading = result.mode === 'grouping'
    ? 'とうばつたいが けっていした！'
    : result.mode === 'shuffle_only'
      ? 'たいれつを くみなおした！'
      : result.mode === 'ordered_list'
        ? 'たたかいの じゅんい'
        : result.mode === 'top_n_ordered'
          ? 'えらばれし ゆうしゃたち'
          : 'しょうり！'

  return <section
    className={`qr-result qr-window qr-result-${density}${result.mode === 'grouping' ? ' qr-result-grouping' : ''}`}
    aria-label="QUEST RAID 抽選結果"
    aria-live="polite"
  >
    <h2>{heading}</h2>
    <ol className="qr-result-grid">
      {entries.map((entry, overallIndex) => {
        const participant = people.get(entry.id)
        const name = participant?.name ?? entry.id
        const badge = result.mode === 'grouping' ? `P${entry.group + 1}` : String(overallIndex + 1)
        return <li className="qr-result-entry" key={entry.id} title={name}>
          <span className="qr-result-rank">{badge}</span>
          <span className="qr-result-avatar" aria-hidden="true">
            {participant?.avatarUrl
              ? <img src={participant.avatarUrl} alt="" />
              : <span>{initialFor(name)}</span>}
          </span>
          <span className="qr-result-name">{name}</span>
        </li>
      })}
    </ol>
    {result.mode === 'single_winner' && <p>が えらばれた！</p>}
  </section>
}

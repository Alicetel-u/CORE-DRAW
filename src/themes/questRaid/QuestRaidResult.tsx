import type { DrawResult, Participant } from '../../core/types'

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
  const total = groups.reduce((sum, ids) => sum + ids.length, 0)
  const density = densityFor(total)
  const heading = result.mode === 'grouping'
    ? 'とうばつたいが けっていした！'
    : result.mode === 'shuffle_only'
      ? 'たいれつを くみなおした！'
      : result.mode === 'ordered_list'
        ? 'たたかいの じゅんい'
        : result.mode === 'top_n_ordered'
          ? 'えらばれし ゆうしゃたち'
          : 'しょうり！'

  let overallRank = 0
  return <section
    className={`qr-result qr-window qr-result-${density}${result.mode === 'grouping' ? ' qr-result-grouping' : ''}`}
    aria-label="QUEST RAID 抽選結果"
    aria-live="polite"
  >
    <h2>{heading}</h2>
    <div className="qr-result-board">
      {groups.map((ids, group) => <section className="qr-result-group" key={group}>
        {result.mode === 'grouping' && <h3>パーティー {group + 1}</h3>}
        <ol className="qr-result-grid">
          {ids.map((id, index) => {
            const participant = people.get(id)
            const name = participant?.name ?? id
            const rank = result.mode === 'grouping' ? index + 1 : ++overallRank
            return <li className="qr-result-entry" key={id} title={name}>
              <span className="qr-result-rank">{result.mode === 'grouping' ? group + 1 : rank}</span>
              <span className="qr-result-avatar" aria-hidden="true">
                {participant?.avatarUrl
                  ? <img src={participant.avatarUrl} alt="" />
                  : <span>{initialFor(name)}</span>}
              </span>
              <span className="qr-result-name">{name}</span>
            </li>
          })}
        </ol>
      </section>)}
    </div>
    {result.mode === 'single_winner' && <p>が えらばれた！</p>}
  </section>
}

import type { DrawResult, Participant } from '../../core/types'
import './questRaidResult.css'

export function QuestRaidResult({ result, participants }: { result: DrawResult; participants: Participant[] }) {
  const byId = new Map(participants.map((participant) => [participant.id, participant]))
  if (result.mode === 'grouping') {
    return <div className="qr-formation-result" role="status">
      <span className="qr-formation-kicker">とうばつたい</span>
      <div className="qr-formation-groups">
        {(result.groups ?? []).map((group, index) => <section className="qr-formation-party" key={index}>
          <h3>パーティー {index + 1}<small>{group.length}人</small></h3>
          <ol>{group.map((id) => <li key={id}>{byId.get(id)?.name ?? 'なまえなし'}</li>)}</ol>
        </section>)}
      </div>
    </div>
  }
  if (result.mode === 'shuffle_only') {
    return <div className="qr-formation-result" role="status">
      <span className="qr-formation-kicker">ならびじゅん</span>
      <ol className="qr-formation-order">
        {result.orderedIds.map((id, index) => <li key={id}><b>{index + 1}</b><span>{byId.get(id)?.name ?? 'なまえなし'}</span></li>)}
      </ol>
    </div>
  }
  return <span className="qr-result-marker qr-result-highlight-survivors" aria-hidden="true" />
}

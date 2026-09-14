import type { DrawResult, Participant } from '../../core/types'
export function QuestRaidResult({ result, participants }: { result: DrawResult; participants: Participant[] }) {
  const names = new Map(participants.map(p => [p.id, p.name]))
  const groups = result.mode === 'grouping' ? result.groups ?? [] : [result.mode === 'single_winner' || result.mode === 'multi_winner' || result.mode === 'top_n_ordered' ? result.winnerIds : result.orderedIds]
  const heading = result.mode === 'grouping' ? 'とうばつたいが けっていした！' : result.mode === 'shuffle_only' ? 'たいれつを くみなおした！' : result.mode === 'ordered_list' ? 'たたかいの じゅんい' : result.mode === 'top_n_ordered' ? 'えらばれし ゆうしゃたち' : 'しょうり！'
  return <section className="qr-result qr-window" aria-label="QUEST RAID 抽選結果" aria-live="polite"><h2>{heading}</h2><div className="qr-result-scroll">{groups.map((ids, group) => <section key={group}>{result.mode === 'grouping' && <h3>パーティー {group + 1}</h3>}<ol>{ids.map(id => <li key={id}><span>{names.get(id) ?? id}</span></li>)}</ol></section>)}</div>{result.mode === 'single_winner' && <p>が えらばれた！</p>}</section>
}

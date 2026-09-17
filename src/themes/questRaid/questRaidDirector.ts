import type { QuestBattleScript } from './questRaidBattle'
import type { Fighter, QuestBattleEvent } from './questRaidEvents'
import { hpState } from './questRaidEvents'
import type { QuestRaidAudio } from './QuestRaidAudio'
export type QuestFrame = { fighters: Fighter[]; event: QuestBattleEvent; elapsed: number; eventIndex: number; page: number; bossHp: number; criticalIds: string[] }
export function playQuestRaidBattle(script: QuestBattleScript, audio: QuestRaidAudio | null, onFrame: (frame: QuestFrame) => void, onReveal: () => void, onComplete: () => void) {
  const started = performance.now()
  let frameId = 0, stopped = false, index = -1, revealed = false, lastPaint = -100, page = 0, lastPageAt = 0
  let fighters = script.fighters.map(f => ({ ...f })), bossHp = script.boss.maxHp
  let criticalIds: string[] = []
  const pages = Math.ceil(fighters.length / 8)
  function tick() {
    if (stopped) return
    const elapsed = performance.now() - started
    while (index + 1 < script.events.length && script.events[index + 1].at <= elapsed) {
      const event = script.events[++index]
      criticalIds = []
      fighters = fighters.map(f => {
        const hp = event.hp?.[f.id] ?? f.hp, mp = event.mp?.[f.id] ?? f.mp
        if (hpState(hp, f.maxHp) === 'critical' && hpState(f.hp, f.maxHp) !== 'critical') criticalIds.push(f.id)
        return { ...f, hp, mp, party: event.partyById?.[f.id] ?? f.party }
      })
      if (event.order) { const byId = new Map(fighters.map(f => [f.id, f])); fighters = event.order.map(id => byId.get(id)!) }
      bossHp = event.bossHp ?? bossHp
      // Suppress a burst of stale audio after returning from a background tab.
      if (elapsed - event.at < 200) { audio?.cue(event.type); if (criticalIds.length) audio?.cue('near_death') }
      if (event.type === 'result' && !revealed) { revealed = true; onReveal() }
    }
    const event = script.events[Math.max(0, index)]
    if (elapsed - lastPageAt >= 450) {
      const targets = new Set([...(event.targetIds ?? []), ...(event.actorId ? [event.actorId] : [])])
      const counts = Array.from({ length: pages }, (_, p) => fighters.slice(p * 8, p * 8 + 8).filter(f => targets.has(f.id)).length)
      const best = counts.indexOf(Math.max(...counts))
      const next = elapsed - event.at < 450 && counts[best] > 0 ? best : elapsed - lastPageAt >= 850 ? (page + 1) % pages : page
      if (next !== page) { page = next; lastPageAt = elapsed }
    }
    if (elapsed - lastPaint >= 32 || elapsed >= script.duration) {
      onFrame({ fighters, event, elapsed: Math.min(elapsed, script.duration), eventIndex: index, page, bossHp, criticalIds })
      lastPaint = elapsed
    }
    if (elapsed >= script.duration) { onComplete(); return }
    frameId = requestAnimationFrame(tick)
  }
  tick()
  return { kill() { stopped = true; cancelAnimationFrame(frameId); audio?.stop() } }
}

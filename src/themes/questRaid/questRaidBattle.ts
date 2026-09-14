import type { DrawResult, Participant } from '../../core/types'
import { QUEST_BOSSES, type QuestBossDefinition } from './questRaidBosses'
import { createSeededRandom, shuffle } from './questRaidSeed'
import type { Fighter, QuestBattleEvent, QuestPhase } from './questRaidEvents'
export type QuestBattleScript = { boss: QuestBossDefinition; fighters: Fighter[]; events: QuestBattleEvent[]; duration: number; survivorIds: string[]; peaceful: boolean }

// Presentation only. All selections and rankings come exclusively from DrawResult.
export function createQuestBattleScript(result: DrawResult, participants: Participant[]): QuestBattleScript {
  const random = createSeededRandom(result.drawId + 'quest-raid-v1')
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  const boss = QUEST_BOSSES[int(0, QUEST_BOSSES.length - 1)]
  const eligible = new Set(result.orderedIds)
  // Keep input order: result order must never leak through the opening roster.
  const fighters = participants.filter(p => eligible.has(p.id)).map(p => {
    const maxHp = int(80, 160), maxMp = int(12, 55)
    return { id: p.id, name: p.name, maxHp, hp: maxHp, maxMp, mp: maxMp }
  })
  const peaceful = result.mode === 'grouping' || result.mode === 'shuffle_only'
  const survivorIds = peaceful ? fighters.map(f => f.id) : result.mode === 'ordered_list' ? result.orderedIds.slice(0, 1) : [...result.winnerIds]
  const survivors = new Set(survivorIds)
  const events: QuestBattleEvent[] = []
  const hp = Object.fromEntries(fighters.map(f => [f.id, f.hp]))
  const mp = Object.fromEntries(fighters.map(f => [f.id, f.mp]))
  let bossHp = boss.maxHp
  const push = (type: QuestBattleEvent['type'], phase: QuestPhase, at: number, duration: number, message: string, extra: Partial<QuestBattleEvent> = {}) => events.push({ type, phase, at, duration, message, ...extra })
  if (peaceful) {
    push('intro', 'INTRO', 0, 800, result.mode === 'grouping' ? 'とうばつたいを\nへんせいしている……' : 'たいれつを\nくみなおしている……')
    for (let i = 0; i < 7; i++) push('formation', 'SKIRMISH', 800 + i * 400, 300, 'なかまたちが\nあつまってきた！', { order: shuffle(fighters.map(f => f.id), random) })
    push('result', 'RESULT', 3900, 700, result.mode === 'grouping' ? 'とうばつたいが\nけっていした！' : 'たいれつを\nくみなおした！', { order: [...result.orderedIds] })
    return { boss, fighters, events, duration: 4600, survivorIds, peaceful }
  }
  push('intro', 'INTRO', 0, 850, `${boss.name} が\nあらわれた！`)
  const actors = shuffle(fighters, random)
  for (let i = 0; i < 7; i++) {
    const actor = actors[i % actors.length], spell = i % 3 === 1, critical = random() < .22
    const damage = critical ? int(35, 75) : int(8, 35)
    bossHp -= damage
    if (spell) mp[actor.id] = Math.max(0, mp[actor.id] - 5)
    push(spell ? 'player_spell' : 'player_attack', 'SKIRMISH', 900 + i * 260, spell ? 300 : 230,
      `${actor.name} の ${spell ? 'ひかりのや！' : 'こうげき！'}\n${critical ? 'かいしん！ ' : ''}${damage}の ダメージ！`,
      { actorId: actor.id, damage, critical, bossHp, mp: spell ? { [actor.id]: mp[actor.id] } : undefined })
  }
  let lastTargetIds: string[] = []
  let nextAttack = 0
  const strike = (at: number, phase: QuestPhase, targets: Fighter[], final = false) => {
    const attack = boss.attacks[nextAttack++ % boss.attacks.length]
    const changes: Record<string, number> = {}
    for (const f of targets) {
      changes[f.id] = final ? (survivors.has(f.id) ? Math.max(1, Math.floor(f.maxHp * (random() < .65 ? int(1, 8) : int(15, 35)) / 100)) : 0) : Math.max(1, hp[f.id] - int(15, 45))
      hp[f.id] = changes[f.id]
    }
    lastTargetIds = targets.map(f => f.id)
    push(targets.length === 1 ? 'boss_attack' : 'boss_aoe', phase, at, attack.pose === 'special' ? 720 : 560, `${boss.name} は\n${attack.message}`, { targetIds: lastTargetIds, hp: changes, attackId: attack.id, effect: attack.effect, pose: attack.pose })
  }
  // Early damage and actors are independent of the winning IDs; nobody is eliminated early.
  strike(2850, 'RAID', fighters)
  strike(3500, 'RAID', shuffle(fighters, random).slice(0, Math.max(1, Math.ceil(fighters.length / 2))))
  const otherTargets = fighters.filter(f => !lastTargetIds.includes(f.id))
  strike(4100, 'RAID', otherTargets.length ? otherTargets : fighters)
  const healed = actors[int(0, actors.length - 1)]
  hp[healed.id] = Math.min(healed.maxHp, hp[healed.id] + int(20, 40))
  push('player_heal', 'CRISIS', 4750, 280, `${healed.name} に\nいやしのひかり！`, { actorId: healed.id, targetIds: [healed.id], hp: { [healed.id]: hp[healed.id] }, mp: { [healed.id]: Math.max(0, mp[healed.id] - 10) } })
  bossHp = Math.min(bossHp, Math.floor(boss.maxHp * .29))
  push('boss_enrage', 'CRISIS', 5150, 400, `${boss.name} が\nいかりに ふるえている！`, { bossHp, pose: 'special' })
  strike(5600, 'CRISIS', fighters)
  // Ordered mode uses reverse ranking as the knockout order; other modes use a seeded order.
  const losers = result.mode === 'ordered_list' ? result.orderedIds.slice(1).reverse().map(id => fighters.find(f => f.id === id)!) : shuffle(fighters.filter(f => !survivors.has(f.id)), random)
  const chunkSize = Math.max(1, Math.ceil(losers.length / 3))
  for (let i = 0; i < 3; i++) {
    const targets = losers.slice(i * chunkSize, (i + 1) * chunkSize)
    if (targets.length) {
      strike(6200 + i * 550, 'CRISIS', targets, true)
      push('knockout', 'CRISIS', 6460 + i * 550, 200, targets.length === 1 ? `${targets[0].name} は\nちからつきた！` : `${targets.length}人の なかまが\nちからつきた！`, { targetIds: targets.map(f => f.id) })
    }
  }
  strike(7900, 'FINISH', fighters.filter(f => survivors.has(f.id)), true)
  const finalId = result.mode === 'multi_winner' ? undefined : result.orderedIds[0]
  push('final_strike', 'FINISH', 8400, 600, finalId ? `${fighters.find(f => f.id === finalId)?.name} の\nかいしんの いちげき！` : 'のこった なかまたちの\nそうこうげき！', { actorId: finalId, targetIds: survivorIds, bossHp: 0, critical: true })
  push('boss_defeat', 'FINISH', 9000, 850, `${boss.name} を\nたおした！`, { bossHp: 0 })
  push('result', 'RESULT', 9900, 600, result.mode === 'single_winner' ? `${fighters.find(f => f.id === survivorIds[0])?.name} が\nえらばれた！` : 'たたかいの けっかが\nきろくされた！')
  return { boss, fighters, events: events.sort((a, b) => a.at - b.at), duration: 10500, survivorIds, peaceful }
}

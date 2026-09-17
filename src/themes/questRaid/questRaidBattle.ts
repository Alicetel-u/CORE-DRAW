import type { DrawResult, Participant } from '../../core/types'
import { QUEST_BOSSES, type QuestBossDefinition } from './questRaidBosses'
import { createSeededRandom, shuffle } from './questRaidSeed'
import type { Fighter, QuestBattleEvent, QuestPhase } from './questRaidEvents'
import { questBeat } from './questRaidEvents'
import { pickSkill, type AllySkill } from './questRaidSkills'
import { createTavernDialogue } from './questRaidTavernDialogue'
export type QuestBattleScript = { boss: QuestBossDefinition; fighters: Fighter[]; events: QuestBattleEvent[]; duration: number; survivorIds: string[]; peaceful: boolean }

// Presentation only. All selections and rankings come exclusively from DrawResult.
export function createQuestBattleScript(result: DrawResult, participants: Participant[]): QuestBattleScript {
  const random = createSeededRandom(result.drawId + 'quest-raid-v3')
  const int = (min: number, max: number) => min + Math.floor(random() * (max - min + 1))
  const boss = QUEST_BOSSES[int(0, QUEST_BOSSES.length - 1)]
  const eligible = new Set(result.orderedIds)
  // Keep input order: result order must never leak through the opening roster.
  const fighters = participants.filter(p => eligible.has(p.id)).map(p => {
    const maxHp = int(80, 160), maxMp = int(12, 55)
    return { id: p.id, name: p.name, maxHp, hp: maxHp, maxMp, mp: maxMp }
  })
  const jobOf = Object.fromEntries(fighters.map(f => [f.id, int(0, 7)]))
  const peaceful = result.mode === 'grouping' || result.mode === 'shuffle_only'
  const survivorIds = peaceful ? fighters.map(f => f.id) : result.mode === 'ordered_list' ? result.orderedIds.slice(0, 1) : [...result.winnerIds]
  const survivors = new Set(survivorIds)
  const events: QuestBattleEvent[] = []
  const hp = Object.fromEntries(fighters.map(f => [f.id, f.hp]))
  const mp = Object.fromEntries(fighters.map(f => [f.id, f.mp]))
  let bossHp = boss.maxHp
  let t = 0
  const act = (type: QuestBattleEvent['type'], phase: QuestPhase, message: string, effectMs: number, extra: Partial<QuestBattleEvent> = {}, holdMs?: number) => {
    const duration = questBeat(message, effectMs, holdMs)
    events.push({ type, phase, at: t, duration, message, fx: effectMs, ...extra })
    t += duration
  }
  if (peaceful) {
    const dialogueRandom = createSeededRandom(result.drawId + 'quest-tavern-dialogue-v2')
    const originalOrder = fighters.map(f => f.id)
    let revealedGroupCount = 0
    for (const beat of createTavernDialogue(result, fighters, dialogueRandom)) {
      let order = beat.order
      let partyById: Record<string, number> | undefined
      if (result.mode === 'grouping') {
        const groupCall = beat.message.match(/【店員】\n「(\d+)組目は/)
        if (groupCall) revealedGroupCount = Math.max(revealedGroupCount, Number(groupCall[1]))
        if (beat.type === 'result') revealedGroupCount = result.groups?.length ?? revealedGroupCount
        if (revealedGroupCount > 0) {
          const revealedGroups = (result.groups ?? []).slice(0, revealedGroupCount)
          const assigned = revealedGroups.flat()
          const assignedSet = new Set(assigned)
          const nextPartyById: Record<string, number> = {}
          revealedGroups.forEach((group, index) => group.forEach(id => { nextPartyById[id] = index + 1 }))
          partyById = nextPartyById
          order = [...assigned, ...originalOrder.filter(id => !assignedSet.has(id))]
        }
      }
      act(beat.type, beat.phase, beat.message, beat.effectMs, {
        hostessPose: beat.pose,
        order,
        partyById,
      }, beat.holdMs)
    }
    return { boss, fighters, events, duration: t, survivorIds, peaceful }
  }

  const roster = shuffle(fighters, random)
  let turn = 0
  const nextActor = () => roster[turn++ % roster.length]
  let nextAttack = 0
  const split = (total: number, n: number) => {
    if (n <= 0) return [] as number[]
    const weights = Array.from({ length: n }, () => 0.55 + random())
    const sum = weights.reduce((a, b) => a + b, 0)
    let left = total
    return weights.map((w, i) => {
      if (i === n - 1) return Math.max(1, left)
      const v = Math.max(1, Math.round(total * w / sum))
      left -= v
      return v
    })
  }
  const record = (preferBig: boolean) => {
    const actor = nextActor()
    return { actor, skill: pickSkill(jobOf[actor.id], random, preferBig) as AllySkill }
  }
  const playAlly = (phase: QuestPhase, step: { actor: Fighter; skill: AllySkill }, chunks: number[]) => {
    const { actor, skill } = step
    const extra: Partial<QuestBattleEvent> = { actorId: actor.id, effect: skill.effect, bossHp }
    if (skill.mp) {
      mp[actor.id] = Math.max(0, mp[actor.id] - skill.mp)
      extra.mp = { [actor.id]: mp[actor.id] }
    }
    let message = `${actor.name} の ${skill.label}！`
    if (skill.kind === 'damage') {
      const damage = Math.max(1, chunks.shift() ?? int(12, 28))
      const critical = damage >= Math.round(boss.maxHp * .09)
      bossHp = Math.max(1, bossHp - damage)
      extra.damage = damage
      extra.critical = critical
      extra.bossHp = bossHp
      message += `\n${critical ? 'かいしん！ ' : ''}${damage}の ダメージ！`
    } else if (skill.kind === 'miss') {
      extra.damage = 0
      message += `\n${skill.fail}`
    } else if (skill.kind === 'stun') {
      message += `\n${skill.fail}`
    } else {
      const hurt = [...fighters].sort((a, b) => hp[a.id] / a.maxHp - hp[b.id] / b.maxHp)
      const target = hurt[0] ?? actor
      hp[target.id] = Math.min(target.maxHp, hp[target.id] + int(22, 55))
      extra.targetIds = [target.id]
      extra.hp = { [target.id]: hp[target.id] }
      message = `${actor.name} の ${skill.label}！\n${target.name} のキズが かいふくした！`
    }
    act(skill.type, phase, message, skill.fx, extra)
  }

  const pickTargets = (kind: 'one' | 'few' | 'many') => {
    const pool = shuffle(fighters, random)
    if (kind === 'one') return pool.slice(0, 1)
    if (kind === 'few') return pool.slice(0, Math.max(1, Math.min(3, Math.ceil(fighters.length * .22))))
    return pool.slice(0, Math.max(2, Math.ceil(fighters.length * .4)))
  }
  const unevenHit = (f: Fighter, smash: boolean) => {
    const roll = random()
    if (roll < .16) return 0
    if (roll < .34) return int(2, 9)
    if (!smash && roll < .8) return int(11, 27)
    return int(34, Math.max(35, Math.min(hp[f.id] - 1, smash ? 88 : 52)))
  }
  const strike = (phase: QuestPhase, targets: Fighter[], opts?: { wipe?: boolean; special?: boolean; smash?: boolean }) => {
    const attack = boss.attacks[nextAttack++ % boss.attacks.length]
    const special = opts?.special ?? attack.pose === 'special'
    const changes: Record<string, number> = {}
    for (const f of targets) {
      if (opts?.wipe) changes[f.id] = survivors.has(f.id) ? Math.max(1, hp[f.id]) : 0
      else changes[f.id] = Math.max(1, hp[f.id] - unevenHit(f, Boolean(opts?.smash)))
      hp[f.id] = changes[f.id]
    }
    const ids = targets.map(f => f.id)
    act(targets.length === 1 ? 'boss_attack' : 'boss_aoe', phase, `${boss.name} は\n${attack.message}`, special ? 980 : 780, {
      targetIds: ids, hp: changes, attackId: attack.id, effect: attack.effect, pose: special ? 'special' : 'attack',
    })
  }

  act('intro', 'INTRO', `${boss.name} が\nあらわれた！`, 420, { bossHp })

  const pre = [
    record(false), record(false),
    record(false), record(false),
    record(false), record(true),
    record(true), record(true),
    record(true), record(true),
    record(false),
  ]
  const post = [record(true), record(false)]
  const preChunks = split(Math.round(boss.maxHp * .70), pre.filter(s => s.skill.kind === 'damage').length)
  const postChunks = split(Math.round(boss.maxHp * .18), post.filter(s => s.skill.kind === 'damage').length)

  for (let round = 0; round < 3; round++) {
    playAlly('SKIRMISH', pre[round * 2], preChunks)
    playAlly('SKIRMISH', pre[round * 2 + 1], preChunks)
    strike('SKIRMISH', pickTargets(round === 0 ? 'few' : 'one'), { smash: round === 2 })
  }
  for (let round = 0; round < 2; round++) {
    playAlly('RAID', pre[6 + round * 2], preChunks)
    playAlly('RAID', pre[7 + round * 2], preChunks)
    strike('RAID', pickTargets(round === 0 ? 'many' : 'few'), { smash: round === 1 })
  }
  playAlly('RAID', pre[10], preChunks)
  const missed = fighters.filter(f => hp[f.id] === f.maxHp)
  if (missed.length) strike('RAID', missed, { smash: false })
  act('boss_enrage', 'CRISIS', `${boss.name} が\nいかりに ふるえている！`, 640, { bossHp, pose: 'special' })
  strike('CRISIS', pickTargets('few'), { smash: true, special: true })
  strike('CRISIS', pickTargets('one'), { smash: true, special: true })
  playAlly('CRISIS', post[0], postChunks)
  playAlly('CRISIS', post[1], postChunks)

  const losers = shuffle(fighters.filter(f => !survivors.has(f.id)), random)
  if (losers.length) {
    strike('FINISH', fighters, { wipe: true, special: true })
    const waves = losers.length > 16 ? 2 : 1
    const chunk = Math.ceil(losers.length / waves)
    for (let i = 0; i < waves; i++) {
      const group = losers.slice(i * chunk, (i + 1) * chunk)
      if (!group.length) continue
      act('knockout', 'FINISH', group.length === 1 ? `${group[0].name} は\nちからつきた！` : `${group.length}人の なかまが\nちからつきた！`, 420, { targetIds: group.map(f => f.id) })
    }
  }

  const finalId = result.mode === 'multi_winner' ? undefined : result.orderedIds[0]
  const lastHit = Math.max(1, bossHp)
  bossHp = 0
  act('final_strike', 'FINISH', finalId ? `${fighters.find(f => f.id === finalId)?.name} の\nきめた！ さいごのひとふり！\n${lastHit}の ダメージ！` : `のこった なかまたちの\nそうこうげき！\n${lastHit}の ダメージ！`, 860, {
    actorId: finalId, targetIds: survivorIds, bossHp: 0, critical: true, damage: lastHit, effect: 'finishing_blow',
  })
  act('boss_defeat', 'FINISH', `${boss.name} を\nたおした！`, 1100, { bossHp: 0 })
  act('result', 'RESULT', result.mode === 'single_winner' ? `${fighters.find(f => f.id === survivorIds[0])?.name} が\nえらばれた！` : 'たたかいの けっかが\nきろくされた！', 360)
  return { boss, fighters, events, duration: t, survivorIds, peaceful }
}

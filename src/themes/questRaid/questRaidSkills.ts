import type { QuestBattleEvent, QuestEffect } from './questRaidEvents'

export type AllySkill = {
  id: string
  label: string
  type: Extract<QuestBattleEvent['type'], 'player_attack' | 'player_spell' | 'player_heal' | 'player_item'>
  effect: QuestEffect
  kind: 'damage' | 'heal' | 'miss' | 'stun'
  fx: number
  mp?: number
  dmg?: [number, number]
  fail?: string
}

export const ALLY_SKILLS: Record<string, AllySkill> = {
  rocket: { id: 'rocket', label: 'げんこつロケット', type: 'player_attack', effect: 'ally_shot', kind: 'damage', fx: 480, dmg: [16, 38] },
  beam: { id: 'beam', label: 'きらきらビーム', type: 'player_spell', effect: 'ally_shot', kind: 'damage', fx: 560, mp: 6, dmg: [20, 44] },
  yank: { id: 'yank', label: 'ねっこぬき', type: 'player_attack', effect: 'ally_shot', kind: 'damage', fx: 500, dmg: [14, 34] },
  plaster: { id: 'plaster', label: 'ばんそうこう', type: 'player_heal', effect: 'ally_heal', kind: 'heal', fx: 460, mp: 3 },
  cheer: { id: 'cheer', label: 'おうえんコール', type: 'player_spell', effect: 'ally_cheer', kind: 'stun', fx: 520, fail: 'ボスは ひるんで しまった！' },
  box: { id: 'box', label: 'びっくりばこ', type: 'player_item', effect: 'ally_toss', kind: 'damage', fx: 520, dmg: [18, 40] },
  candy: { id: 'candy', label: 'こんぺいとう', type: 'player_item', effect: 'ally_toss', kind: 'damage', fx: 460, dmg: [10, 26] },
  dance: { id: 'dance', label: 'ぐるぐるダンス', type: 'player_spell', effect: 'ally_cheer', kind: 'stun', fx: 540, fail: 'ボスは リズムに あわせた！' },
  coin: { id: 'coin', label: 'ラッキーコイン', type: 'player_item', effect: 'ally_toss', kind: 'miss', fx: 420, fail: 'コインは どこかへ ころがった！' },
  spin: { id: 'spin', label: 'スーパースピン', type: 'player_attack', effect: 'ally_shot', kind: 'damage', fx: 520, dmg: [18, 42] },
  water: { id: 'water', label: 'てっぽうみず', type: 'player_item', effect: 'ally_shot', kind: 'damage', fx: 480, dmg: [12, 30] },
  nap: { id: 'nap', label: 'ひるねアタック', type: 'player_attack', effect: 'ally_cheer', kind: 'miss', fx: 420, fail: 'じぶんが ねてしまった！' },
}

const JOBS = [
  ['rocket', 'spin', 'yank'],
  ['beam', 'water', 'cheer'],
  ['plaster', 'cheer', 'beam'],
  ['candy', 'box', 'yank'],
  ['dance', 'cheer', 'spin'],
  ['box', 'coin', 'candy'],
  ['rocket', 'water', 'plaster'],
  ['nap', 'dance', 'box'],
] as const

export function pickSkill(index: number, random: () => number, preferBig: boolean) {
  const skills = JOBS[Math.abs(index) % JOBS.length].map(id => ALLY_SKILLS[id])
  const pool = preferBig ? skills.filter(s => s.kind === 'damage') : skills
  const list = pool.length ? pool : skills
  return list[Math.floor(random() * list.length)]
}

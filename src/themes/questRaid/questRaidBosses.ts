import type { QuestEffect } from './questRaidEvents'

export type BossPose = 'idle' | 'attack' | 'special'
export type QuestBossDefinition = {
  id: string
  name: string
  sprite: string
  sprites: Record<BossPose, string>
  width: number
  height: number
  maxHp: number
  attacks: { id: string; message: string; effect: QuestEffect; pose: 'attack' | 'special' }[]
  effects: { idle: string; attack: string; rage: string; death: string }
  animation: { idleFps: number; attackFps: number; deathFps: number }
}

function art(id: string, pose: BossPose) {
  return new URL(`./bosses/boss-${id}-${pose}.png`, import.meta.url).href
}

const specs = [
  ['dark-lord', 'まおうヴァルガ', [
    ['まけんを ふりぬいた！', 'slash', 'attack'],
    ['やみのいなずまを よんだ！', 'dark_bolt', 'special'],
    ['やみのはどうを はなった！', 'dark_wave', 'special'],
  ]],
  ['dragon', 'しんえんりゅう', [
    ['するどいきばで かみついた！', 'bite_impact', 'attack'],
    ['ごうかのブレスを はいた！', 'fire_breath', 'special'],
    ['だいちをゆらす おたけび！', 'shockwave', 'special'],
  ]],
  ['knight', 'くろがねのきし', [
    ['たいけんを ふりおろした！', 'slash', 'attack'],
    ['よろいのまま とっしんした！', 'charge_impact', 'attack'],
    ['せいなるたてを かかげた！', 'shield_flash', 'special'],
  ]],
  ['demon', 'まかいのあくま', [
    ['するどいつめで きりさいた！', 'slash', 'attack'],
    ['あおいごうかを はきだした！', 'blue_flame', 'special'],
    ['のろいのさけびを はなった！', 'curse_wave', 'special'],
  ]],
  ['abomination', 'よるのじゃしん', [
    ['しょくしゅを たたきつけた！', 'tentacle_slam', 'attack'],
    ['じゃがんが ひかりを はなった！', 'void_burst', 'special'],
    ['いかいのじゅもんを となえた！', 'eldritch_spell', 'special'],
  ]],
] as const satisfies readonly (readonly [string, string, readonly (readonly [string, QuestEffect, 'attack' | 'special'])[]])[]

export const QUEST_BOSSES: QuestBossDefinition[] = specs.map(([id, name, attacks]) => ({
  id,
  name,
  sprite: art(id, 'idle'),
  sprites: { idle: art(id, 'idle'), attack: art(id, 'attack'), special: art(id, 'special') },
  width: 256,
  height: 256,
  maxHp: 600,
  attacks: attacks.map(([message, effect, pose], i) => ({ id: `${id}-${i}`, message, effect, pose })),
  effects: { idle: 'step', attack: 'lunge', rage: 'red', death: 'dissolve' },
  animation: { idleFps: 4, attackFps: 10, deathFps: 10 },
}))

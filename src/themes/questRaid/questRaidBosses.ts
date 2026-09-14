export type BossPose = 'idle' | 'attack' | 'special'
export type QuestBossDefinition = {
  id: string
  name: string
  sprite: string
  sprites: Record<BossPose, string>
  width: number
  height: number
  maxHp: number
  attacks: { id: string; message: string; effect: 'fire' | 'bolt' | 'slash' | 'spell' | 'roar'; pose: 'attack' | 'special' }[]
  effects: { idle: string; attack: string; rage: string; death: string }
  animation: { idleFps: number; attackFps: number; deathFps: number }
}

function art(id: string, pose: BossPose) {
  return new URL(`./bosses/boss-${id}-${pose}.png`, import.meta.url).href
}

const specs = [
  ['dark-lord', 'まおうヴァルガ', [
    ['つえで たたいた！', 'slash', 'attack'],
    ['やみのいなずまを よんだ！', 'bolt', 'special'],
    ['やみのはどうを はなった！', 'spell', 'special'],
  ]],
  ['dragon', 'しんえんりゅう', [
    ['かみついてきた！', 'slash', 'attack'],
    ['ほのおを はいた！', 'fire', 'special'],
    ['おたけびを あげた！', 'roar', 'special'],
  ]],
  ['knight', 'くろがねのきし', [
    ['つるぎを ふりおろした！', 'slash', 'attack'],
    ['とっしんしてきた！', 'roar', 'special'],
    ['ひかりのたてを かかげた！', 'spell', 'special'],
  ]],
  ['demon', 'まかいのあくま', [
    ['つめを ふるった！', 'slash', 'attack'],
    ['あおいほのおを はいた！', 'fire', 'special'],
    ['おたけびを あげた！', 'roar', 'special'],
  ]],
  ['abomination', 'よるのじゃしん', [
    ['しょくしゅを たたきつけた！', 'slash', 'attack'],
    ['まばゆいひかりを はなった！', 'bolt', 'special'],
    ['やみのじゅもんを となえた！', 'spell', 'special'],
  ]],
] as const

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

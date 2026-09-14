export type QuestPhase = 'INTRO' | 'SKIRMISH' | 'RAID' | 'CRISIS' | 'FINISH' | 'RESULT'
export type QuestEventType = 'intro' | 'player_attack' | 'player_spell' | 'player_heal' | 'boss_attack' | 'boss_aoe' | 'near_death' | 'knockout' | 'boss_enrage' | 'final_strike' | 'boss_defeat' | 'formation' | 'result'
export type Fighter = { id: string; name: string; maxHp: number; hp: number; maxMp: number; mp: number }
export type QuestBattleEvent = {
  type: QuestEventType; phase: QuestPhase; at: number; duration: number; message: string
  actorId?: string; targetIds?: string[]; damage?: number; critical?: boolean
  attackId?: string; effect?: 'fire' | 'bolt' | 'slash' | 'spell' | 'roar'; pose?: 'idle' | 'attack' | 'special'
  hp?: Record<string, number>; mp?: Record<string, number>; bossHp?: number; order?: string[]
}
export function hpState(hp: number, maxHp: number) {
  return hp <= 0 ? 'dead' : hp / maxHp <= .25 ? 'critical' : hp / maxHp <= .5 ? 'warning' : 'normal'
}

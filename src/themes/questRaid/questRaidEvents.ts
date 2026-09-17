export type QuestPhase = 'INTRO' | 'SKIRMISH' | 'RAID' | 'CRISIS' | 'FINISH' | 'RESULT'
export type QuestEventType = 'intro' | 'player_attack' | 'player_spell' | 'player_skill' | 'player_heal' | 'player_item' | 'boss_attack' | 'boss_aoe' | 'near_death' | 'knockout' | 'boss_enrage' | 'final_strike' | 'boss_defeat' | 'formation' | 'result'
export type Fighter = { id: string; name: string; maxHp: number; hp: number; maxMp: number; mp: number }

export type QuestEffect = import('./questRaidAllyVfx').AllySkillEffect
  | 'staff_sweep'
  | 'claw_rend'
  | 'finishing_blow'
  | 'slash'
  | 'dark_bolt'
  | 'dark_wave'
  | 'bite_impact'
  | 'fire_breath'
  | 'shockwave'
  | 'charge_impact'
  | 'shield_flash'
  | 'blue_flame'
  | 'curse_wave'
  | 'tentacle_slam'
  | 'void_burst'
  | 'eldritch_spell'
  | 'ally_shot'
  | 'ally_heal'
  | 'ally_cheer'
  | 'ally_toss'
  // Available in the VFX catalogue; not selected by the current battle script.
  | 'ice_lance'
  | 'frost_nova'
  | 'meteor'
  | 'poison_mist'
  | 'water_surge'
  | 'earth_spike'
  | 'holy_nova'
  | 'soul_drain'
  | 'arcane_missile'
  | 'wind_vortex'
  | 'thunder_storm'
  | 'phoenix_flare'
  // Legacy aliases are kept so older saved/replayed data cannot break presentation.
  | 'fire'
  | 'bolt'
  | 'spell'
  | 'roar'

export type QuestBattleEvent = {
  type: QuestEventType; phase: QuestPhase; at: number; duration: number; message: string
  actorId?: string; targetIds?: string[]; damage?: number; critical?: boolean
  attackId?: string; effect?: QuestEffect; pose?: 'idle' | 'attack' | 'special'
  hostessPose?: 'idle' | 'point' | 'cheer'
  hp?: Record<string, number>; mp?: Record<string, number>; bossHp?: number; order?: string[]
  fx?: number
}
export const QUEST_TEXT_MS = 42
export const QUEST_HOLD_MS = 560
export function questBeat(message: string, effectMs: number, holdMs = QUEST_HOLD_MS) {
  return Math.max(effectMs, Array.from(message).length * QUEST_TEXT_MS) + holdMs
}
export function hpState(hp: number, maxHp: number) {
  return hp <= 0 ? 'dead' : hp / maxHp <= .25 ? 'critical' : hp / maxHp <= .5 ? 'warning' : 'normal'
}

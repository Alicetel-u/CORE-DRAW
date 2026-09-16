import type { QuestBattleEvent } from './questRaidEvents'
export class QuestRaidAudio {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private voices = new Set<OscillatorNode>()
  private enabled = true
  async unlock() {
    try {
      this.context ??= new AudioContext()
      if (!this.master) { this.master = this.context.createGain(); this.master.connect(this.context.destination) }
      this.mute(this.enabled)
      await this.context.resume()
    } catch { /* Sound is optional. */ }
  }
  mute(enabled: boolean) { this.enabled = enabled; if (this.master) this.master.gain.value = enabled ? .12 : 0 }
  cue(type: QuestBattleEvent['type'] | 'cursor' | 'confirm' | 'damage' | 'victory' | 'near_death' | 'battle_start') {
    const pitches: Record<string, number[]> = {
      cursor: [680], confirm: [440, 660], intro: [110, 165, 220], battle_start: [110, 165, 220],
      player_attack: [650, 220], player_spell: [330, 550, 880], player_heal: [300, 450, 600], player_item: [390, 280, 520],
      boss_attack: [90, 160, 55, 220], boss_aoe: [70, 140, 210, 50], damage: [180, 80], near_death: [880, 440],
      knockout: [220, 140, 70], boss_enrage: [80, 110, 80], final_strike: [440, 880, 1320],
      boss_defeat: [180, 120, 80, 40], result: [392, 494, 587, 784], victory: [392, 494, 587, 784], formation: [440],
    }
    const context = this.context, master = this.master
    if (!context || !master || !this.enabled) return
    for (const [i, frequency] of (pitches[type] ?? [440]).entries()) {
      const oscillator = context.createOscillator(), gain = context.createGain(), at = context.currentTime + i * .07
      oscillator.type = type === 'player_heal' ? 'triangle' : 'square'
      oscillator.frequency.setValueAtTime(frequency, at)
      const hold = type.startsWith('boss') || type === 'final_strike' ? .28 : .12
      gain.gain.setValueAtTime(.22, at); gain.gain.exponentialRampToValueAtTime(.001, at + hold)
      oscillator.connect(gain); gain.connect(master); this.voices.add(oscillator)
      oscillator.onended = () => { this.voices.delete(oscillator); oscillator.disconnect(); gain.disconnect() }
      oscillator.start(at); oscillator.stop(at + hold + .04)
    }
  }
  stop() { for (const voice of this.voices) { try { voice.stop() } catch { /* Already stopped. */ } } this.voices.clear() }
  dispose() { this.stop(); void this.context?.close(); this.context = null; this.master = null }
}

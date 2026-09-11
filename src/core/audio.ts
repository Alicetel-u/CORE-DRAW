// Procedural audio: no downloads or external assets.
export class DrawAudio {
  context: AudioContext | null = null
  master: GainNode | null = null
  enabled = true
  async unlock() {
    try {
      this.context ??= new AudioContext()
      if (!this.master) { this.master=this.context.createGain();this.master.connect(this.context.destination) }
      this.master.gain.value=this.enabled?.22:0
      await this.context.resume()
    } catch { /* A silent draw remains usable. */ }
  }
  mute(enabled:boolean){this.enabled=enabled;if(this.master)this.master.gain.value=enabled?.22:0}
  tone(frequency:number,duration:number,delay=0,type:OscillatorType='sine',end?:number){
    const c=this.context;if(!c||!this.master)return
    const o=c.createOscillator(), g=c.createGain(), t=c.currentTime+delay
    o.type=type;o.frequency.setValueAtTime(frequency,t)
    if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration)
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+duration)
    o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.05)
  }
  cue(phase:string){
    if(phase==='charging'){this.tone(55,2,0,'sine',160);this.tone(220,1.5)}
    if(phase==='mixing')for(let i=0;i<18;i++)this.tone(260+i*24,.12,i*.17,'triangle')
    if(phase==='selection')this.tone(180,1.3,0,'sine',38)
    if(phase==='impact'){this.tone(90,1.8,0,'sine',28);[261.63,329.63,392,523.25,783.99].forEach((f,i)=>this.tone(f,2.8,i*.09))}
  }
  dispose(){void this.context?.close()}
}

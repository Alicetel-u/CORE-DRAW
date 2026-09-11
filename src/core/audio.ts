// Short, cancellable sound events. The cinematic director owns their timing.
export class DrawAudio {
  context: AudioContext | null = null
  master: GainNode | null = null
  enabled = true
  private voices = new Set<AudioScheduledSourceNode>()
  async unlock() {
    try {
      this.context ??= new AudioContext()
      if (!this.master) { this.master=this.context.createGain();this.master.connect(this.context.destination) }
      this.master.gain.value=this.enabled?.24:0
      await this.context.resume()
    } catch { /* A silent draw remains usable. */ }
  }
  mute(enabled:boolean){this.enabled=enabled;if(this.master)this.master.gain.value=enabled?.24:0}
  private track(source:AudioScheduledSourceNode,gain:GainNode) {
    this.voices.add(source)
    source.onended=()=>{this.voices.delete(source);source.disconnect();gain.disconnect()}
  }
  tone(frequency:number,duration:number,delay=0,type:OscillatorType='sine',end?:number){
    const c=this.context;if(!c||!this.master)return
    const o=c.createOscillator(),g=c.createGain(),t=c.currentTime+delay
    o.type=type;o.frequency.setValueAtTime(frequency,t)
    if(end)o.frequency.exponentialRampToValueAtTime(end,t+duration)
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.3,t+.025);g.gain.exponentialRampToValueAtTime(.001,t+duration)
    o.connect(g);g.connect(this.master);this.track(o,g);o.start(t);o.stop(t+duration+.05)
  }
  noise(duration:number,start:number,end:number,level=.25){
    const c=this.context;if(!c||!this.master)return
    const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate),data=buffer.getChannelData(0)
    let n=92731
    for(let i=0;i<data.length;i++){n=(Math.imul(n,1664525)+1013904223)>>>0;data[i]=n/2147483648-1}
    const source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain(),t=c.currentTime
    source.buffer=buffer;filter.type='bandpass';filter.Q.value=.65
    filter.frequency.setValueAtTime(start,t);filter.frequency.exponentialRampToValueAtTime(end,t+duration)
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(level,t+duration*.18);gain.gain.exponentialRampToValueAtTime(.001,t+duration)
    source.connect(filter);filter.connect(gain);gain.connect(this.master);this.track(source,gain)
    source.onended=()=>{this.voices.delete(source);source.disconnect();filter.disconnect();gain.disconnect()}
    source.start(t);source.stop(t+duration)
  }
  cue(event:string){
    if(event==='charging'){this.tone(42,2.1,0,'sine',95);this.noise(1.3,100,500,.15)}
    if(event==='mixing'){this.tone(65,2.5,0,'sine',105);this.noise(2.65,250,1700,.35);for(let i=0;i<8;i++)this.tone(140+i*35,.18,i*.3,'triangle')}
    if(event==='selection'){this.noise(1.7,2500,80,.45);this.tone(150,1.75,0,'sine',35)}
    if(event==='impact'){this.tone(110,1.2,0,'sine',26);this.noise(.6,1800,70,.8)}
    if(event==='eject')this.noise(.65,450,4000,.5)
    if(event==='awaken'){this.noise(1,800,3000,.1);[196,293.66,392,587.33].forEach((f,i)=>this.tone(f,1.6,i*.12,'triangle'))}
    if(event==='reveal')[261.63,329.63,392,523.25].forEach((f,i)=>this.tone(f,2,i*.065))
  }
  stop(){for(const voice of this.voices){try{voice.stop()}catch{/* Already ended. */}}this.voices.clear()}
  dispose(){this.stop();void this.context?.close()}
}

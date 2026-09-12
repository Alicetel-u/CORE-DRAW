import gsap from 'gsap'
import type { DrawPhase } from './types'
import type { DrawAudio } from './audio'

/** Only this director owns narrative time. Renderers sample these values. */
export function createCinematicState() {
  return {
    time: 0, running: false, reduced: false, shot: 0,
    power: .12, shell: 0, shutter: .35, spin: 0,
    orbit: 0, absorption: 0, entries: 1,
    silence: 0, impact: 0, wave: 0, burst: 0,
    winner: 0, formation: 0, awaken: 0, readable: 0,
    wx: 0, wy: 0, wz: 0, wrx: 0, wry: 0, wrz: 0, ws: .2,
    cx: 0, cy: .65, cz: 15.5, tx: 0, ty: 0, tz: 0, fov: 43, roll: 0,
    progress: 0,
  }
}
export type CinematicState = ReturnType<typeof createCinematicState>
export const CUES = { orbit: 2.4, compression: 5.1, silence: 6.95, impact: 7.62, eject: 7.82, chase: 8.35, awaken: 10.5, readable: 12.05, end: 14.1 } as const

export function directDraw(s: CinematicState, reduced: boolean, audio: DrawAudio | null,
  phase: (p: DrawPhase) => void, reveal: () => void, finish: () => void,
  progress: (n: number) => void) {
  Object.assign(s, createCinematicState(), { running: true, reduced })
  audio?.stop()
  const tl = gsap.timeline({ onUpdate: () => progress(s.progress) })
  if (reduced) {
    tl.call(() => phase('charging'), [], 0)
      .to(s, { shell: 1.4, shutter: 1, entries: .012, winner: 1, formation: 1, awaken: 1, readable: 1,
        wz: 3.2, wy: .1, ws: 1, cy: .25, cz: 12.5, power: .35, duration: .7 }, 0)
      .call(() => { phase('reveal'); reveal() }, [], .7)
      .to(s, { progress: 100, duration: .3 }, .7)
      .call(() => { s.running = false; phase('complete'); finish() })
    return tl
  }

  tl.to(s, { time: CUES.end, progress: 100, duration: CUES.end, ease: 'none' }, 0)
    .call(() => { phase('charging'); audio?.cue('charging') }, [], 0)
    .to(s, { power: 1.15, shell: .18, shutter: .8, duration: 2.4, ease: 'sine.inOut' }, 0)
    // Continuous rotation bridges every narrative beat, including anticipation.
    .to(s, { spin: 26, orbit: 21, duration: CUES.impact + 1.2, ease: 'sine.inOut' }, 0)
    .call(() => { phase('mixing'); audio?.cue('mixing') }, [], CUES.orbit)
    .to(s, { power: 2.1, duration: 2.7, ease: 'sine.inOut' }, CUES.orbit)
    .call(() => { phase('selection'); audio?.cue('selection') }, [], CUES.compression)
    .to(s, { absorption: 1, duration: 1.65, ease: 'sine.inOut' }, CUES.compression)
    .to(s, { entries: 0, duration: .4, ease: 'sine.inOut' }, 6.35)
    .to(s, { shutter: .08, shell: .05, power: .65, duration: .65, ease: 'sine.inOut' }, 6.55)
    // Dim gently, keep the mechanism visible; never insert a black hold frame.
    .to(s, { silence: .28, duration: .4, ease: 'sine.inOut' }, CUES.silence)
    .to(s, { silence: 0, duration: .27, ease: 'sine.in' }, CUES.impact - .27)
    .call(() => { phase('impact'); audio?.cue('impact') }, [], CUES.impact)
    .set(s, { winner: 1, burst: 1 }, CUES.impact)
    .to(s, { impact: .65, power: 3.2, duration: .12, ease: 'sine.out' }, CUES.impact)
    .to(s, { impact: 0, duration: .55, ease: 'sine.out' }, CUES.impact + .12)
    .to(s, { formation: 1, duration: 3.3, ease: 'sine.inOut' }, CUES.impact)
    .to(s, { wave: 1, duration: 1.1, ease: 'power2.out' }, CUES.impact)
    .to(s, { shutter: 1, shell: 1.25, duration: .8, ease: 'sine.inOut' }, CUES.impact)
    .to(s, { power: .42, duration: 2.2, ease: 'sine.inOut' }, CUES.impact + .12)
    .call(() => audio?.cue('eject'), [], CUES.eject)
    .call(() => audio?.cue('awaken'), [], CUES.awaken)
    .to(s, { awaken: 1, duration: 1.45, ease: 'sine.inOut' }, CUES.awaken)
    .to(s, { burst: 0, duration: 2.8, ease: 'sine.out' }, 9)
    .to(s, { readable: 1, duration: .72, ease: 'sine.out' }, 11.4)
    .call(() => { phase('reveal'); audio?.cue('reveal'); reveal() }, [], CUES.readable)
    .call(() => { s.running = false; phase('complete'); finish() }, [], CUES.end)
  return tl
}

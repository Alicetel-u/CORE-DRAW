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
    winner: 0, awaken: 0, readable: 0,
    wx: 0, wy: 0, wz: 0, wrx: 0, wry: 0, wrz: 0, ws: .2,
    cx: 0, cy: .65, cz: 15.5, tx: 0, ty: 0, tz: 0, fov: 43, roll: 0,
    progress: 0,
  }
}
export type CinematicState = ReturnType<typeof createCinematicState>
export const CUES = { orbit: 2.3, compression: 5.1, silence: 7.05, impact: 7.7, eject: 7.85, chase: 8.55, awaken: 10.3, readable: 12.1, end: 14.2 } as const

export function directDraw(s: CinematicState, reduced: boolean, audio: DrawAudio | null,
  phase: (p: DrawPhase) => void, reveal: () => void, finish: () => void,
  progress: (n: number) => void) {
  Object.assign(s, createCinematicState(), { running: true, reduced })
  audio?.stop()
  const tl = gsap.timeline({ onUpdate: () => progress(s.progress) })
  if (reduced) {
    tl.call(() => phase('charging'), [], 0)
      .to(s, { shell: 1.4, shutter: 1, entries: 0, winner: 1, awaken: 1, readable: 1,
        wz: 3, wy: .1, ws: 1, cy: .25, cz: 12.5, power: .35, duration: .7 }, 0)
      .call(() => { phase('reveal'); reveal() }, [], .7)
      .to(s, { progress: 100, duration: .3 }, .7)
      .call(() => { s.running = false; phase('complete'); finish() })
    return tl
  }
  tl.to(s, { time: CUES.end, progress: 100, duration: CUES.end, ease: 'none' }, 0)
    .call(() => { phase('charging'); audio?.cue('charging') }, [], 0)
    .to(s, { power: 1.2, shell: .18, shutter: .8, duration: 2, ease: 'power2.inOut' }, 0)
    .to(s, { cx: 1.6, cy: .8, cz: 11.6, fov: 39, duration: 2.3, ease: 'power2.inOut' }, 0)
    .to(s, { spin: 2.5, duration: 2.3, ease: 'power2.in' }, 0)
    // B: hard cut to the orbit, then travel through the entries.
    .call(() => { phase('mixing'); audio?.cue('mixing') }, [], CUES.orbit)
    .set(s, { shot: 1, cx: -5.7, cy: 1.2, cz: 6.7, fov: 53, roll: -.07 }, CUES.orbit)
    .to(s, { cx: 4.7, cy: -.5, cz: 7, roll: .06, duration: 2.8, ease: 'sine.inOut' }, CUES.orbit)
    .to(s, { orbit: 13, spin: 15, power: 2.2, duration: 2.8, ease: 'power1.in' }, CUES.orbit)
    // C: compression, mechanical closure, then a genuine held shot and silence.
    .call(() => { phase('selection'); audio?.cue('selection') }, [], CUES.compression)
    .set(s, { shot: 2, cx: .5, cy: .3, cz: 10.8, roll: 0, fov: 43 }, CUES.compression)
    .to(s, { absorption: 1, orbit: 20, spin: 21, duration: 1.55, ease: 'power2.in' }, CUES.compression)
    .to(s, { cx: 0, cy: 0, cz: 8.6, duration: 1.65, ease: 'power2.out' }, CUES.compression)
    .to(s, { entries: 0, duration: .18 }, 6.45)
    .to(s, { shutter: 0, shell: 0, power: .02, duration: .4 }, 6.65)
    .set(s, { silence: 1 }, CUES.silence)
    .call(() => audio?.stop(), [], CUES.silence)
    // D: the break. The shock envelope ends in 0.42 seconds.
    .call(() => { phase('impact'); audio?.cue('impact') }, [], CUES.impact)
    .set(s, { shot: 3, silence: 0, impact: 1, burst: 1, power: 4, fov: 56, roll: .055 }, CUES.impact)
    .to(s, { impact: 0, fov: 43, roll: 0, duration: .42, ease: 'power3.out' }, CUES.impact)
    .to(s, { wave: 1, duration: .85, ease: 'power2.out' }, CUES.impact)
    .to(s, { shutter: 1, shell: 1.5, spin: 23, duration: .6, ease: 'power4.out' }, CUES.impact)
    .to(s, { power: .4, duration: 1.8 }, 8)
    .call(() => audio?.cue('eject'), [], CUES.eject)
    .set(s, { winner: 1, ws: .3, wz: .4, wry: -1.4, wrz: -.4 }, CUES.eject)
    .to(s, { wx: 2.6, wy: .7, wz: 10, ws: .85, wry: 2, wrz: .45, duration: .65, ease: 'power2.in' }, CUES.eject)
    // E: lose the ejected card across the lens, cut to a three-quarter tracking shot.
    .set(s, { shot: 4, cx: 5.2, cy: 1.8, cz: 13.5, tx: 1.6, ty: .4, tz: 5, fov: 48 }, CUES.chase)
    .set(s, { wx: 1.8, wy: .4, wz: 6, wry: -3.2, wrz: .25 }, CUES.chase)
    .to(s, { wx: 0, wy: .1, wz: 3, ws: 1, wry: 0, wrx: 0, wrz: 0, duration: 2.2, ease: 'power3.out' }, CUES.chase)
    .to(s, { cx: 0, cy: .25, cz: 12.5, tx: 0, ty: .1, tz: 3, fov: 43, duration: 2.3, ease: 'power2.inOut' }, CUES.chase)
    .call(() => audio?.cue('awaken'), [], CUES.awaken)
    .to(s, { awaken: 1, duration: 1.6, ease: 'power2.inOut' }, CUES.awaken)
    .to(s, { burst: 0, duration: 3 }, 9)
    .to(s, { readable: 1, duration: .65 }, 11.5)
    .call(() => { phase('reveal'); audio?.cue('reveal'); reveal() }, [], CUES.readable)
    .call(() => { s.running = false; phase('complete'); finish() }, [], CUES.end)
  return tl
}

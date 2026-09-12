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
      .to(s, { shell: 1.4, shutter: 1, entries: 0, winner: 1, formation: 1, awaken: 1, readable: 1,
        wz: 3.2, wy: .1, ws: 1, cy: .25, cz: 12.5, power: .35, duration: .7 }, 0)
      .call(() => { phase('reveal'); reveal() }, [], .7)
      .to(s, { progress: 100, duration: .3 }, .7)
      .call(() => { s.running = false; phase('complete'); finish() })
    return tl
  }

  tl.to(s, { time: CUES.end, progress: 100, duration: CUES.end, ease: 'none' }, 0)
    // Beat 1: establish the machine and move in slowly. Keep spatial continuity.
    .call(() => { phase('charging'); audio?.cue('charging') }, [], 0)
    .to(s, { power: 1.15, shell: .18, shutter: .8, spin: 2.4, duration: 2.3, ease: 'power2.inOut' }, 0)
    .to(s, { cx: 1.05, cy: .78, cz: 12.6, fov: 40, duration: 2.35, ease: 'power2.inOut' }, 0)

    // Beat 2: enter the orbit without teleporting the camera. One broad sweep sells the space.
    .call(() => { s.shot = 1; phase('mixing'); audio?.cue('mixing') }, [], CUES.orbit)
    .to(s, { cx: -2.9, cy: 1.05, cz: 10.15, tx: -.2, ty: .05, fov: 47, roll: -.035, duration: 1.2, ease: 'sine.inOut' }, CUES.orbit)
    .to(s, { cx: 3.15, cy: -.18, cz: 9.15, tx: .25, ty: -.05, roll: .035, duration: 1.5, ease: 'sine.inOut' }, CUES.orbit + 1.2)
    .to(s, { orbit: 13, spin: 15, power: 2.1, duration: 2.7, ease: 'power1.in' }, CUES.orbit)

    // Beat 3: come back toward a readable front angle while the entries collapse into the CORE.
    .call(() => { s.shot = 2; phase('selection'); audio?.cue('selection') }, [], CUES.compression)
    .to(s, { cx: .45, cy: .28, cz: 9.55, tx: 0, ty: 0, roll: 0, fov: 43, duration: .5, ease: 'power2.out' }, CUES.compression)
    .to(s, { cx: 0, cy: .08, cz: 8.75, duration: 1.35, ease: 'power2.out' }, CUES.compression + .45)
    .to(s, { absorption: 1, orbit: 20, spin: 21, duration: 1.45, ease: 'power2.in' }, CUES.compression)
    .to(s, { entries: 0, duration: .18 }, 6.42)
    .to(s, { shutter: 0, shell: 0, power: .02, duration: .38 }, 6.58)

    // Beat 4: hold. The pause is part of the cut rhythm, not empty time.
    .set(s, { silence: 1, shot: 3 }, CUES.silence)
    .call(() => audio?.stop(), [], CUES.silence)

    // Beat 5: break the silence in the same spatial setup. Revealed cards now leave the CORE
    // on a continuous formation value instead of switching directly into their final layout.
    .call(() => { phase('impact'); audio?.cue('impact') }, [], CUES.impact)
    .set(s, { silence: 0, impact: 1, burst: 1, power: 4, fov: 55, roll: .04 }, CUES.impact)
    .to(s, { impact: 0, fov: 43, roll: 0, duration: .42, ease: 'power3.out' }, CUES.impact)
    .to(s, { wave: 1, duration: .82, ease: 'power2.out' }, CUES.impact)
    .to(s, { shutter: 1, shell: 1.5, spin: 23, duration: .58, ease: 'power4.out' }, CUES.impact)
    .to(s, { power: .42, duration: 1.7 }, 7.95)
    .call(() => audio?.cue('eject'), [], CUES.eject)
    .set(s, { winner: 1, formation: .001, ws: .34, wz: .45, wry: -1.25, wrz: -.32 }, CUES.eject)
    .to(s, { formation: 1, duration: 2.55, ease: 'power3.out' }, CUES.eject)
    .to(s, { wx: 2.45, wy: .72, wz: 9.25, ws: .9, wry: 2.15, wrz: .42, duration: .57, ease: 'power2.in' }, CUES.eject)

    // Beat 6: follow rather than cut. The single card follows its hero arc while ensemble modes
    // use the same camera path as their formation fans outward and settles.
    .call(() => { s.shot = 4 }, [], CUES.chase)
    .to(s, { cx: 3.55, cy: 1.25, cz: 12.55, tx: 1.35, ty: .32, tz: 5.1, fov: 47, duration: .52, ease: 'power2.out' }, CUES.chase)
    .to(s, { wx: -1.35, wy: .3, wz: 5.65, wry: -2.85, wrz: .18, duration: .72, ease: 'power2.out' }, CUES.chase)
    .to(s, { wx: 0, wy: .1, wz: 3.2, ws: 1, wry: 0, wrx: 0, wrz: 0, duration: 1.55, ease: 'back.out(1.12)' }, CUES.chase + .62)
    .to(s, { cx: 0, cy: .25, cz: 12.55, tx: 0, ty: .1, tz: 3.2, fov: 43, duration: 1.75, ease: 'power2.inOut' }, CUES.chase + .45)
    .call(() => audio?.cue('awaken'), [], CUES.awaken)
    .to(s, { awaken: 1, duration: 1.45, ease: 'power2.inOut' }, CUES.awaken)
    .to(s, { burst: 0, duration: 2.8 }, 9)
    .to(s, { readable: 1, duration: .55 }, 11.55)
    .call(() => { phase('reveal'); audio?.cue('reveal'); reveal() }, [], CUES.readable)
    .call(() => { s.running = false; phase('complete'); finish() }, [], CUES.end)
  return tl
}

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { resolveDraw } from './core/drawEngine'
import type { DrawPhase, DrawResult, QualityTier } from './core/types'
import { demoParticipants } from './data/demoParticipants'
import { DrawStage } from './scene/DrawStage'

const participants = demoParticipants

export default function App() {
  const [phase, setPhase] = useState<DrawPhase>('idle')
  const [result, setResult] = useState<DrawResult | null>(null)
  const [quality, setQuality] = useState<QualityTier>('high')
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const winner = result?.winnerIds[0]
    ? participants.find((participant) => participant.id === result.winnerIds[0])
    : undefined

  useEffect(() => () => timelineRef.current?.kill(), [])

  function runDemoDraw() {
    if (phase !== 'idle' && phase !== 'complete') return

    timelineRef.current?.kill()
    const next = resolveDraw({
      drawId: crypto.randomUUID(),
      mode: 'single_winner',
      participants,
    })
    setResult(next)

    const timeline = gsap.timeline()
    timelineRef.current = timeline
    timeline
      .call(() => setPhase('charging'))
      .to({}, { duration: 1.25 })
      .call(() => setPhase('mixing'))
      .to({}, { duration: 2.4 })
      .call(() => setPhase('selection'))
      .to({}, { duration: 1.6 })
      .call(() => setPhase('impact'))
      .to({}, { duration: 0.34 })
      .call(() => setPhase('reveal'))
      .to({}, { duration: 2.7 })
      .call(() => setPhase('complete'))
  }

  function reset() {
    timelineRef.current?.kill()
    setResult(null)
    setPhase('idle')
  }

  return (
    <main className="app-shell">
      <section className="stage-shell" aria-label="CORE-DRAW cinematic preview">
        <DrawStage participants={participants} phase={phase} winnerIds={result?.winnerIds ?? []} quality={quality} />
        <div className="hud hud-top">
          <div>
            <div className="eyebrow">CORE-DRAW / CINEMATIC ENGINE</div>
            <h1>DRAW CORE</h1>
          </div>
          <div className="status-chip">{phase.toUpperCase()}</div>
        </div>

        <div className="hud hud-bottom">
          <div className="participant-count">
            <span>PARTICIPANTS</span>
            <strong>{participants.length}</strong>
          </div>

          <div className="controls">
            <select value={quality} onChange={(event) => setQuality(event.target.value as QualityTier)} aria-label="quality tier">
              <option value="lite">LITE</option>
              <option value="high">HIGH</option>
              <option value="ultra">ULTRA</option>
            </select>
            <button className="secondary" onClick={reset}>RESET</button>
            <button className="primary" onClick={runDemoDraw} disabled={phase !== 'idle' && phase !== 'complete'}>
              START DRAW
            </button>
          </div>
        </div>

        {(phase === 'reveal' || phase === 'complete') && winner && (
          <div className="winner-overlay">
            <span>WINNER</span>
            <strong>{winner.name}</strong>
          </div>
        )}
      </section>
    </main>
  )
}

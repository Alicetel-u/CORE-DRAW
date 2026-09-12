import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Vignette } from '@react-three/postprocessing'
import type { BloomEffect } from 'postprocessing'
import { Component, useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import type { DrawMode, Participant, QualityTier } from '../core/types'
import type { CinematicState } from '../core/cinematic'
import { CoreReactor } from './CoreReactor'
import { ParticipantCard } from './ParticipantCard'
import { CinematicVFX } from './CinematicVFX'

function CameraDirector({ cinematic: s, mode }: { cinematic: CinematicState; mode: DrawMode }) {
  const { size } = useThree()
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, clock, gl }) => {
    const cam = camera as THREE.PerspectiveCamera
    const portrait = size.width / size.height < .85
    const drift = !s.running && !s.winner && !s.reduced ? Math.sin(clock.elapsedTime * .15) * .055 : 0
    const shake = s.reduced ? 0 : s.impact
    const portraitOffset = portrait ? (s.winner ? 2.7 : 3.8) : 0
    const ensembleOffset = s.winner && mode !== 'single_winner' ? (portrait ? 4.2 : 3.2) : 0
    cam.position.set(s.cx * (portrait ? .65 : 1) + Math.sin(s.time * 151) * shake * .065 + drift, s.cy + Math.sin(s.time * 113) * shake * .045, s.cz + portraitOffset + ensembleOffset)
    target.set(s.tx, s.ty, s.tz)
    cam.up.set(Math.sin(s.roll), Math.cos(s.roll), 0)
    cam.lookAt(target)
    const fov = s.fov + (portrait ? 6 : 0)
    if (cam.fov !== fov) {
      cam.fov = fov
      cam.updateProjectionMatrix()
    }
    gl.toneMappingExposure = (1.08 - s.silence * .92) * (1 + s.impact * .45)
  })
  return null
}

function PostFX({ cinematic: s }: { cinematic: CinematicState }) {
  const bloom = useRef<BloomEffect>(null)
  const offset = useMemo(() => new THREE.Vector2(), [])
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = .38 + s.impact * 2.3 + s.awaken * .16
    offset.set(s.impact * .005, s.impact * .0015)
  })
  return <EffectComposer multisampling={0}><Bloom ref={bloom} intensity={.38} luminanceThreshold={.88} mipmapBlur /><ChromaticAberration offset={offset} radialModulation modulationOffset={.15} /><Vignette offset={.15} darkness={.55} /></EffectComposer>
}

function Scene({ participants, winnerIds, groups, cinematic: s, quality, mode }: { participants: Participant[]; winnerIds: string[]; groups?: string[][]; cinematic: CinematicState; quality: QualityTier; mode: DrawMode }) {
  const size = useThree((v) => v.size)
  const portrait = size.width / size.height < .85
  const groupMeta = useMemo(() => {
    const map = new Map<string, { groupIndex: number; groupPosition: number; groupSize: number; groupCount: number }>()
    ;(groups ?? []).forEach((group, groupIndex) => group.forEach((id, groupPosition) => map.set(id, { groupIndex, groupPosition, groupSize: group.length, groupCount: groups?.length ?? 0 })))
    return map
  }, [groups])
  const revealTotal = mode === 'multi_winner' || mode === 'top_n_ordered' ? winnerIds.length : participants.length

  return <>
    <CameraDirector cinematic={s} mode={mode} />
    <ambientLight intensity={.28} />
    <hemisphereLight args={['#b9d8e5', '#111820', .7]} />
    <directionalLight position={[3, 5, 7]} intensity={3.4} color="#d6e8ef" />
    <directionalLight position={[-5, 2, 5]} intensity={2.1} color="#86abc1" />
    <pointLight position={[-3, 1, 4]} intensity={18} color="#86bad0" />
    <pointLight position={[2, -2, -1]} intensity={12} color="#d2b27d" />
    <pointLight position={[0, 0, 7]} intensity={10} color="#dbeaf0" distance={24} decay={2} />
    {quality === 'ultra' && <pointLight position={[0, 5, 1]} intensity={16} color="#eef7fb" />}
    <Environment resolution={64} frames={1} environmentIntensity={.9}>
      <Lightformer position={[0, 4, 3]} scale={[6, 2.4, 1]} intensity={4} color="#dceaf0" />
      <Lightformer position={[-4, 0, 2]} rotation={[0, Math.PI / 2, 0]} scale={[2.5, 7, 1]} intensity={3} color="#88a8ba" />
      <Lightformer position={[4, -2, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[2.5, 4, 1]} intensity={2.5} color="#d6b88c" />
    </Environment>
    <CoreReactor cinematic={s} />
    {participants.map((p, i) => {
      const meta = groupMeta.get(p.id)
      return <ParticipantCard key={p.id} participant={p} index={i} resultIndex={i} total={participants.length} revealTotal={Math.max(1, revealTotal)} isWinner={winnerIds.includes(p.id)} mode={mode} cinematic={s} portrait={portrait} groupIndex={meta?.groupIndex} groupPosition={meta?.groupPosition} groupSize={meta?.groupSize} groupCount={meta?.groupCount} />
    })}
    <CinematicVFX cinematic={s} quality={quality} />
    {quality !== 'lite' && <PostFX cinematic={s} />}
  </>
}

class StageBoundary extends Component<{ children: ReactNode; winner?: Participant }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Fallback winner={this.props.winner} /> : this.props.children }
}

function Fallback({ winner }: { winner?: Participant }) {
  return <div className="fallback-core"><span>◇</span><small>2D MODE</small>{winner && <strong>{winner.name}</strong>}</div>
}

export function DrawStage({ participants, winnerIds, groups, cinematic, quality = 'high', revealed, mode }: { participants: Participant[]; winnerIds: string[]; groups?: string[][]; cinematic: CinematicState; quality?: QualityTier; revealed: boolean; mode: DrawMode }) {
  const winner = revealed ? participants.find((p) => p.id === winnerIds[0]) : undefined
  return <StageBoundary winner={winner}><Canvas dpr={quality === 'ultra' ? [1, 2] : quality === 'high' ? [1, 1.5] : [.75, 1]} camera={{ position: [0, .65, 15.5], fov: 43, near: .1, far: 100 }} gl={{ antialias: quality === 'ultra', alpha: true, powerPreference: 'high-performance' }} fallback={<Fallback winner={winner} />}>
    <Scene participants={participants} winnerIds={winnerIds} groups={groups} cinematic={cinematic} quality={quality} mode={mode} />
  </Canvas></StageBoundary>
}

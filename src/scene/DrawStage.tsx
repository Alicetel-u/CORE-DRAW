import { Environment, Float, Stars } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Bloom, ChromaticAberration, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Vector2 } from 'three'
import type { DrawPhase, Participant, QualityTier } from '../core/types'
import { CoreReactor } from './CoreReactor'
import { ParticipantCard } from './ParticipantCard'

interface Props {
  participants: Participant[]
  phase: DrawPhase
  winnerIds: string[]
  quality?: QualityTier
}

export function DrawStage({ participants, phase, winnerIds, quality = 'high' }: Props) {
  const active = phase !== 'idle' && phase !== 'complete'
  const dpr: [number, number] = quality === 'ultra' ? [1, 2] : quality === 'high' ? [1, 1.5] : [0.75, 1]

  return (
    <Canvas
      dpr={dpr}
      camera={{ position: [0, 1.2, 12.5], fov: 46, near: 0.1, far: 100 }}
      gl={{ antialias: quality !== 'lite', alpha: false, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#03050c']} />
      <fog attach="fog" args={['#03050c', 13, 30]} />
      <ambientLight intensity={0.26} />
      <pointLight position={[0, 3, 3]} intensity={active ? 26 : 10} color="#4f8cff" distance={22} />
      <pointLight position={[-6, -2, 1]} intensity={8} color="#8b5cf6" distance={18} />
      <pointLight position={[6, 2, -1]} intensity={6} color="#22d3ee" distance={18} />

      <Stars radius={35} depth={22} count={quality === 'lite' ? 700 : 1800} factor={2.2} fade speed={active ? 1.2 : 0.25} />

      <Float speed={active ? 2.1 : 0.7} rotationIntensity={0.22} floatIntensity={0.35}>
        <CoreReactor active={active} />
      </Float>

      {participants.map((participant, index) => (
        <ParticipantCard
          key={participant.id}
          participant={participant}
          index={index}
          total={participants.length}
          phase={phase}
          isWinner={winnerIds.includes(participant.id)}
        />
      ))}

      {quality !== 'lite' && <Environment preset="city" environmentIntensity={0.18} />}

      <EffectComposer multisampling={quality === 'ultra' ? 4 : 0}>
        <Bloom intensity={phase === 'impact' ? 2.8 : 1.05} luminanceThreshold={0.15} mipmapBlur />
        {quality === 'ultra' && (
          <ChromaticAberration offset={new Vector2(phase === 'impact' ? 0.006 : 0.0005, 0.0005)} radialModulation />
        )}
        <Noise blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.08} />
        <Vignette offset={0.18} darkness={0.72} />
      </EffectComposer>
    </Canvas>
  )
}

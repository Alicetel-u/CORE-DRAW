import { RoundedBox, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DrawPhase, Participant } from '../core/types'

function hueFromSeed(seed: string) {
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0
  return Math.abs(hash) % 360
}

interface Props {
  participant: Participant
  index: number
  total: number
  phase: DrawPhase
  isWinner: boolean
}

export function ParticipantCard({ participant, index, total, phase, isWinner }: Props) {
  const group = useRef<THREE.Group>(null)
  const hue = useMemo(() => hueFromSeed(participant.seed ?? participant.id), [participant])
  const accent = `hsl(${hue} 85% 65%)`

  useFrame((state, delta) => {
    const node = group.current
    if (!node) return

    const angle = (index / total) * Math.PI * 2 + state.clock.elapsedTime * (phase === 'mixing' ? 1.2 : 0.14)
    const radius = phase === 'selection' ? 4.4 : 6.2
    const target = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle * 1.7) * 1.1, Math.sin(angle) * radius)

    if (phase === 'reveal' || phase === 'complete') {
      if (isWinner) target.set(0, 0, 2.35)
      else target.multiplyScalar(1.55)
    }

    node.position.lerp(target, 1 - Math.pow(0.001, delta))
    node.lookAt(0, 0, 0)
    if (isWinner && (phase === 'reveal' || phase === 'complete')) {
      node.rotation.set(0, 0, Math.sin(state.clock.elapsedTime * 2) * 0.025)
      node.scale.lerp(new THREE.Vector3(1.55, 1.55, 1.55), 0.08)
    } else {
      node.scale.lerp(new THREE.Vector3(1, 1, 1), 0.08)
    }
  })

  return (
    <group ref={group}>
      <RoundedBox args={[2.15, 3.1, 0.12]} radius={0.14} smoothness={5}>
        <meshPhysicalMaterial
          color="#071020"
          emissive={accent}
          emissiveIntensity={isWinner && phase === 'reveal' ? 1.5 : 0.18}
          metalness={0.72}
          roughness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.08}
        />
      </RoundedBox>
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[1.82, 2.72]} />
        <meshBasicMaterial color={accent} transparent opacity={0.075} />
      </mesh>
      <Text position={[0, 0.2, 0.15]} fontSize={0.28} maxWidth={1.7} textAlign="center" anchorX="center" anchorY="middle">
        {participant.name}
        <meshBasicMaterial color="#ffffff" />
      </Text>
      <Text position={[0, -1.05, 0.15]} fontSize={0.13} letterSpacing={0.12}>
        NO. {String(participant.number ?? index + 1).padStart(2, '0')}
        <meshBasicMaterial color={accent} />
      </Text>
    </group>
  )
}

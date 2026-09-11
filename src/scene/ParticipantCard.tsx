import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DrawPhase, Participant } from '../core/types'

export function ParticipantCard({ participant, index, total, phase }: { participant: Participant; index: number; total: number; phase: DrawPhase; isWinner: boolean }) {
  const group = useRef<THREE.Group>(null)
  const angle = useRef(index / total * Math.PI * 2)
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ clock }, dt) => {
    const node = group.current
    if (!node) return
    angle.current += dt * (phase === 'mixing' ? 2.6 : .075)
    const a = angle.current
    const hidden = ['selection','impact','reveal','complete'].includes(phase)
    const radius = hidden ? .2 : 3.7 + (index % 3) * .22
    target.set(Math.cos(a)*radius, Math.sin(a)*radius*.55, Math.sin(a)*1.4-1)
    node.position.lerp(target, 1-Math.exp(-dt*4))
    node.rotation.set(0,0,Math.sin(clock.elapsedTime*.5+index)*.13)
    const s = hidden ? .001 : .8
    node.scale.setScalar(THREE.MathUtils.damp(node.scale.x,s,5,dt))
  })
  return <group ref={group} name={participant.id}>
    <mesh><boxGeometry args={[.48,.7,.035]}/><meshStandardMaterial color="#0b1d2b" metalness={.7} roughness={.3}/></mesh>
    <mesh position={[0,0,.022]}><planeGeometry args={[.44,.66]}/><meshBasicMaterial color="#5188a0" wireframe transparent opacity={.5}/></mesh>
    <mesh position={[0,.04,.03]} rotation={[0,0,Math.PI/4]}><planeGeometry args={[.13,.13]}/><meshBasicMaterial color="#9bdaf0" transparent opacity={.8}/></mesh>
    <mesh position={[0,-.2,.03]}><planeGeometry args={[.24,.015]}/><meshBasicMaterial color="#79afc2" /></mesh>
  </group>
}

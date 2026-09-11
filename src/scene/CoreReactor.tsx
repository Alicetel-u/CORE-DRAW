import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export function CoreReactor({ active }: { active: boolean }) {
  const group = useRef<THREE.Group>(null)
  const glow = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!group.current || !glow.current) return
    group.current.rotation.y += delta * (active ? 1.6 : 0.35)
    group.current.rotation.x += delta * 0.12
    const pulse = 1 + Math.sin(state.clock.elapsedTime * (active ? 6 : 2)) * (active ? 0.08 : 0.025)
    glow.current.scale.setScalar(pulse)
  })

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshPhysicalMaterial
          color="#101a3c"
          emissive="#3578ff"
          emissiveIntensity={active ? 4 : 1.2}
          metalness={0.78}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>
      <mesh ref={glow} scale={1.28}>
        <icosahedronGeometry args={[1.05, 1]} />
        <meshBasicMaterial color="#63b8ff" transparent opacity={active ? 0.12 : 0.04} wireframe />
      </mesh>
      {[1.55, 1.85, 2.15].map((radius, index) => (
        <mesh key={radius} rotation={[Math.PI / (2.5 + index), index * 0.8, 0]}>
          <torusGeometry args={[radius, 0.018, 8, 96]} />
          <meshBasicMaterial color={index === 1 ? '#a78bfa' : '#60a5fa'} transparent opacity={0.45} />
        </mesh>
      ))}
    </group>
  )
}

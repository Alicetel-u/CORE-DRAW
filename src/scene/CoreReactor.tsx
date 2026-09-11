import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DrawPhase } from '../core/types'

export function CoreReactor({ phase, reduced = false }: { phase: DrawPhase; reduced?: boolean }) {
  const root = useRef<THREE.Group>(null)
  const crystal = useRef<THREE.Group>(null)
  const rings = useRef<THREE.Group>(null)
  const active = ['charging', 'mixing', 'selection'].includes(phase)
  const gold = ['impact', 'reveal', 'complete'].includes(phase)
  const color = gold ? '#ffd28a' : '#85e8ff'
  const shards = useMemo(() => Array.from({ length: 12 }, (_, i) => i * Math.PI / 6), [])
  useFrame(({ clock }, dt) => {
    if (!root.current || !crystal.current || !rings.current) return
    const t = clock.elapsedTime
    const speed = reduced ? .1 : phase === 'mixing' ? 2.8 : active ? 1 : .16
    crystal.current.rotation.y += dt * speed
    crystal.current.rotation.z = Math.sin(t * .4) * .12
    rings.current.rotation.z += dt * speed * .3
    rings.current.rotation.y = Math.sin(t * .2) * .18
    const s = phase === 'selection' ? .55 : gold ? .82 : active ? 1.12 : 1
    root.current.scale.lerp(new THREE.Vector3(s,s,s), 1 - Math.exp(-dt * 3))
  })
  return <group ref={root}>
    <group ref={crystal} rotation={[.15,0,.12]}>
      <mesh><octahedronGeometry args={[1.18,0]} /><meshPhysicalMaterial color="#0a2637" emissive={color} emissiveIntensity={active ? .6 : .12} metalness={.85} roughness={.2} flatShading /></mesh>
      <mesh scale={1.015}><octahedronGeometry args={[1.18,0]} /><meshBasicMaterial color={color} wireframe transparent opacity={.8} /></mesh>
      <mesh scale={.48}><octahedronGeometry args={[1.18,0]} /><meshBasicMaterial color={color} /></mesh>
      {shards.map((a,i) => <mesh key={i} position={[Math.cos(a)*1.65, Math.sin(a)*1.65,0]} rotation={[0,0,a]}><boxGeometry args={[.13,.35,.12]} /><meshStandardMaterial color="#304453" metalness={.9} roughness={.3} emissive={color} emissiveIntensity={.22}/></mesh>)}
    </group>
    <group ref={rings} rotation={[.3,-.3,0]}>
      {[2.05,2.25,2.7].map((r,i) => <group key={r} rotation={[i*.6,i*.35,i*.7]}>
        <mesh><torusGeometry args={[r,.012,6,160]} /><meshBasicMaterial color={color} transparent opacity={i===2?.2:.6}/></mesh>
        <mesh rotation={[0,0,1]}><torusGeometry args={[r,.035,6,100,Math.PI*.62]} /><meshBasicMaterial color={color}/></mesh>
      </group>)}
      {Array.from({length:60},(_,i)=> <mesh key={i} position={[Math.cos(i*Math.PI/30)*2.45,Math.sin(i*Math.PI/30)*2.45,0]} rotation={[0,0,i*Math.PI/30]}><boxGeometry args={[i%5===0?.16:.055,.012,.015]}/><meshBasicMaterial color={color} transparent opacity={i%5===0?.65:.25}/></mesh>)}
    </group>
  </group>
}

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Participant } from '../core/types'
import type { CinematicState } from '../core/cinematic'
import { hologram, identity, nameTexture, plate } from './design'

export function ParticipantCard({ participant, index, total, isWinner, cinematic: s, portrait }: {
  participant: Participant; index: number; total: number; isWinner: boolean; cinematic: CinematicState; portrait: boolean
}) {
  const root = useRef<THREE.Group>(null)
  const armor = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Group>(null)
  const glyph = useRef<THREE.Group>(null)
  const label = useRef<THREE.MeshBasicMaterial>(null)
  const frame = useRef<THREE.MeshPhysicalMaterial>(null)
  const design = useMemo(() => identity(participant.id), [participant.id])
  const resources = useMemo(() => {
    const color = new THREE.Color().setHSL(design.hue, .42, .58)
    return {
      color,
      steel: new THREE.Color('#24292f'),
      goldMetal: new THREE.Color('#8f7449'),
      goldGlow: new THREE.Color('#d9ad65'),
      body: plate(2.14,3.22,.24,.22),
      back: plate(2.02,3.08,.22,.1),
      glass: plate(1.78,2.82,.2,.06),
      corner: plate(.36,.82,.1,.14),
      shader: hologram(color,design.seed),
      texture: nameTexture(participant.name, participant.number ?? index+1),
    }
  }, [design, participant.name, participant.number, index])
  useEffect(() => () => {
    resources.body.dispose(); resources.back.dispose(); resources.glass.dispose(); resources.corner.dispose(); resources.shader.dispose(); resources.texture.dispose()
  }, [resources])
  useFrame(({clock}) => {
    const node=root.current
    if(!node)return
    const hero=isWinner && s.winner>0
    node.visible=hero || s.entries>.01
    if(!node.visible)return
    const idle=s.running||s.winner>0||s.reduced?0:clock.elapsedTime*.045
    if(hero) {
      node.position.set(s.wx,s.wy,s.wz)
      node.rotation.set(s.wrx,s.wry,s.wrz)
      node.scale.setScalar(s.ws)
    } else {
      const a=index/total*Math.PI*2 + s.orbit + idle
      const r=(portrait?3:4.5)+(index%3)*.32
      const collapse=1-s.absorption
      node.position.set(Math.cos(a)*r*collapse,Math.sin(a)*(portrait?3.6:2.35)*collapse,Math.sin(a*.9+index)*1.4*collapse-.8)
      // Rotate enough to expose the edge and rear shell. The cards should read as objects, not billboards.
      node.rotation.set(.16*Math.sin(a*.7), Math.sin(a)*.95+Math.cos(a*.35)*.18, Math.cos(a)*.12+s.absorption*1.2)
      node.scale.setScalar((.24+(index%3)*.015)*Math.max(.04,collapse)*s.entries)
    }
    const awakening=hero?s.awaken:0
    resources.shader.uniforms.uTime.value=s.running?s.time:clock.elapsedTime*.22
    resources.shader.uniforms.uAwaken.value=awakening
    if(frame.current) {
      frame.current.color.copy(resources.steel).lerp(resources.goldMetal,awakening)
      frame.current.emissive.copy(resources.color).lerp(resources.goldGlow,awakening)
      frame.current.emissiveIntensity=.018+awakening*.1
      frame.current.roughness=.28-awakening*.045
    }
    if(label.current)label.current.opacity=hero?s.readable:0
    if(armor.current)armor.current.children.forEach((part,i)=>{
      const x=i%2===0?-1:1, y=i<2?1:-1
      part.position.set(x*(.87+awakening*.19), y*(1.23+awakening*.13), .16+awakening*.12)
      part.rotation.z=x*y*awakening*.2
    })
    if(halo.current){halo.current.visible=awakening>.01;halo.current.scale.setScalar(.65+awakening*.7);halo.current.rotation.z=awakening*.5}
    if(glyph.current){glyph.current.position.z=.31+awakening*.14;glyph.current.rotation.z=design.variant*.25+awakening*Math.PI*.5}
  })
  return <group ref={root} name={`entry-${participant.id}`}>
    {/* Thick machined outer shell. Most of the card is visible by reflected light, not emission. */}
    <mesh geometry={resources.body} position={[0,0,-.11]}>
      <meshPhysicalMaterial ref={frame} color="#24292f" metalness={.94} roughness={.28} clearcoat={.28} clearcoatRoughness={.2} emissive={resources.color} emissiveIntensity={.018}/>
    </mesh>
    <mesh geometry={resources.back} position={[0,0,-.16]} rotation={[0,Math.PI,0]}>
      <meshPhysicalMaterial color="#11161b" metalness={.88} roughness={.34} clearcoat={.18}/>
    </mesh>

    {/* Raised rails make the silhouette and side profile readable while the card spins. */}
    <mesh position={[-1.02,0,.03]}><boxGeometry args={[.11,2.54,.26]}/><meshPhysicalMaterial color="#45494d" metalness={.96} roughness={.23}/></mesh>
    <mesh position={[1.02,0,.03]}><boxGeometry args={[.11,2.54,.26]}/><meshPhysicalMaterial color="#45494d" metalness={.96} roughness={.23}/></mesh>
    <mesh position={[0,1.48,.03]}><boxGeometry args={[1.58,.1,.26]}/><meshPhysicalMaterial color="#383d42" metalness={.94} roughness={.25}/></mesh>
    <mesh position={[0,-1.48,.03]}><boxGeometry args={[1.58,.1,.26]}/><meshPhysicalMaterial color="#383d42" metalness={.94} roughness={.25}/></mesh>

    {/* Opaque black glass sits inside the shell. It reflects the environment instead of reading as a glowing screen. */}
    <mesh geometry={resources.glass} position={[0,0,.12]}>
      <meshPhysicalMaterial color="#05080b" metalness={.2} roughness={.12} clearcoat={1} clearcoatRoughness={.055} envMapIntensity={1.35}/>
    </mesh>
    <mesh position={[0,0,.205]} material={resources.shader}><planeGeometry args={[1.7,2.72]}/></mesh>

    <group ref={glyph} position={[0,.48,.31]}>
      <mesh><ringGeometry args={[.37,.395,design.sides]}/><meshStandardMaterial color="#c2ccd1" emissive={resources.color} emissiveIntensity={.16} metalness={.82} roughness={.25}/></mesh>
      <mesh rotation={[0,0,Math.PI/design.sides]}><ringGeometry args={[.25,.27,design.sides]}/><meshStandardMaterial color="#616b72" metalness={.9} roughness={.22}/></mesh>
      <mesh rotation={[0,0,Math.PI/4]}><boxGeometry args={[.115,.115,.05]}/><meshStandardMaterial color="#d9d5ca" metalness={.75} roughness={.2}/></mesh>
    </group>

    <group ref={armor}>{[0,1,2,3].map(i=><group key={i}>
      <mesh geometry={resources.corner}><meshPhysicalMaterial color="#74787d" metalness={.96} roughness={.22} clearcoat={.18}/></mesh>
      <mesh position={[0,0,.16]}><boxGeometry args={[.04,.4,.04]}/><meshBasicMaterial color={resources.color} transparent opacity={.55} toneMapped={false}/></mesh>
    </group>)}</group>

    <mesh position={[0,-.58,.315]}><planeGeometry args={[1.7,.85]}/><meshBasicMaterial ref={label} map={resources.texture} transparent opacity={0} depthWrite={false} toneMapped={false}/></mesh>
    <mesh position={[0,1.12,.315]}><boxGeometry args={[.7,.018,.025]}/><meshStandardMaterial color="#9aa3a8" emissive={resources.color} emissiveIntensity={.08} metalness={.8}/></mesh>
    <mesh position={[0,-1.23,.315]}><boxGeometry args={[.7,.018,.025]}/><meshStandardMaterial color="#9aa3a8" emissive={resources.color} emissiveIntensity={.08} metalness={.8}/></mesh>

    <group position={[0,0,-.255]} rotation={[0,Math.PI,0]}>
      <mesh><ringGeometry args={[.58,.615,6]}/><meshStandardMaterial color="#626b70" metalness={.92} roughness={.24}/></mesh>
      <mesh rotation={[0,0,Math.PI/6]}><ringGeometry args={[.35,.38,3]}/><meshStandardMaterial color="#8b9295" metalness={.9} roughness={.2}/></mesh>
      {[0,1,2].map(i=><mesh key={i} position={[0,-.95+i*.09,0]}><boxGeometry args={[.5-i*.12,.014,.025]}/><meshStandardMaterial color="#6c7377" metalness={.85} roughness={.28}/></mesh>)}
    </group>

    <group ref={halo} position={[0,.15,-.34]} visible={false}>
      <mesh><ringGeometry args={[1.45,1.47,96]}/><meshBasicMaterial color="#dfb86f" transparent opacity={.6} side={THREE.DoubleSide} toneMapped={false}/></mesh>
      <mesh rotation={[0,0,.2]}><ringGeometry args={[1.57,1.61,6]}/><meshBasicMaterial color="#e3c085" transparent opacity={.24} side={THREE.DoubleSide}/></mesh>
      {Array.from({length:6},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/3)*1.8,Math.sin(i*Math.PI/3)*1.8,0]} rotation={[.2,i,.4]}><tetrahedronGeometry args={[.07]}/><meshStandardMaterial color="#edcd88" emissive="#b89445" emissiveIntensity={.2} metalness={.8} roughness={.2}/></mesh>)}
    </group>
  </group>
}

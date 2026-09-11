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
  const frame = useRef<THREE.MeshStandardMaterial>(null)
  const design = useMemo(() => identity(participant.id), [participant.id])
  const resources = useMemo(() => {
    const color = new THREE.Color().setHSL(design.hue, .45, .62)
    return { color, gold: new THREE.Color('#d1af72'), body: plate(2.05,3.15,.25,.12), glass: plate(1.85,2.94,.22,.04), corner: plate(.32,.75,.1,.1), shader: hologram(color,design.seed), texture: nameTexture(participant.name, participant.number ?? index+1) }
  }, [design, participant.name, participant.number, index])
  useEffect(() => () => {
    resources.body.dispose(); resources.glass.dispose(); resources.corner.dispose(); resources.shader.dispose(); resources.texture.dispose()
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
      node.rotation.set(.12*Math.sin(a), Math.sin(a)*.6, Math.cos(a)*.14+s.absorption*2)
      node.scale.setScalar((.23+ (index%3)*.015)*Math.max(.04,collapse)*s.entries)
    }
    const awakening=hero?s.awaken:0
    resources.shader.uniforms.uTime.value=s.running?s.time:clock.elapsedTime*.22
    resources.shader.uniforms.uAwaken.value=awakening
    if(frame.current) {
      frame.current.color.copy(resources.color).lerp(resources.gold,awakening)
      frame.current.emissive.copy(resources.color).lerp(resources.gold,awakening)
      frame.current.emissiveIntensity=.035+awakening*.23
    }
    if(label.current)label.current.opacity=hero?s.readable:0
    if(armor.current)armor.current.children.forEach((part,i)=>{
      const x=i%2===0?-1:1, y=i<2?1:-1
      part.position.set(x*(.84+awakening*.2), y*(1.2+awakening*.14), .12+awakening*.13)
      part.rotation.z=x*y*awakening*.23
    })
    if(halo.current){halo.current.visible=awakening>.01;halo.current.scale.setScalar(.65+awakening*.7);halo.current.rotation.z=awakening*.5}
    if(glyph.current){glyph.current.position.z=.2+awakening*.18;glyph.current.rotation.z=design.variant*.25+awakening*Math.PI*.5}
  })
  return <group ref={root} name={`entry-${participant.id}`}>
    <mesh geometry={resources.body}><meshStandardMaterial ref={frame} color={resources.color} metalness={.87} roughness={.24}/></mesh>
    <mesh geometry={resources.glass} position={[0,0,.14]}><meshPhysicalMaterial color="#05090f" metalness={.55} roughness={.17} clearcoat={1} clearcoatRoughness={.1}/></mesh>
    <mesh position={[0,0,.215]} material={resources.shader}><planeGeometry args={[1.78,2.87]}/></mesh>
    <group ref={glyph} position={[0,.48,.24]}>
      <mesh><ringGeometry args={[.37,.39,design.sides]}/><meshBasicMaterial color={resources.color} toneMapped={false}/></mesh>
      <mesh rotation={[0,0,Math.PI/design.sides]}><ringGeometry args={[.25,.265,design.sides]}/><meshBasicMaterial color={resources.color}/></mesh>
      <mesh rotation={[0,0,Math.PI/4]}><planeGeometry args={[.115,.115]}/><meshBasicMaterial color="#f8ecd7" toneMapped={false}/></mesh>
    </group>
    <group ref={armor}>{[0,1,2,3].map(i=><group key={i}>
      <mesh geometry={resources.corner}><meshStandardMaterial color="#8f9297" metalness={.94} roughness={.2}/></mesh>
      <mesh position={[0,0,.13]}><boxGeometry args={[.04,.4,.035]}/><meshBasicMaterial color={resources.color} toneMapped={false}/></mesh>
    </group>)}</group>
    <mesh position={[0,-.58,.24]}><planeGeometry args={[1.75,.875]}/><meshBasicMaterial ref={label} map={resources.texture} transparent opacity={0} depthWrite={false} toneMapped={false}/></mesh>
    <mesh position={[0,1.12,.24]}><planeGeometry args={[.7,.015]}/><meshBasicMaterial color={resources.color}/></mesh>
    <mesh position={[0,-1.23,.24]}><planeGeometry args={[.7,.015]}/><meshBasicMaterial color={resources.color}/></mesh>
    <group position={[0,0,-.055]} rotation={[0,Math.PI,0]}>
      <mesh><ringGeometry args={[.58,.6,6]}/><meshBasicMaterial color={resources.color}/></mesh>
      <mesh rotation={[0,0,Math.PI/6]}><ringGeometry args={[.35,.37,3]}/><meshBasicMaterial color={resources.color}/></mesh>
      {[0,1,2].map(i=><mesh key={i} position={[0,-.95+i*.09,0]}><planeGeometry args={[.5-i*.12,.014]}/><meshBasicMaterial color={resources.color}/></mesh>)}
    </group>
    <group ref={halo} position={[0,.15,-.22]} visible={false}>
      <mesh><ringGeometry args={[1.45,1.465,96]}/><meshBasicMaterial color="#dfb86f" transparent opacity={.7} side={THREE.DoubleSide} toneMapped={false}/></mesh>
      <mesh rotation={[0,0,.2]}><ringGeometry args={[1.57,1.61,6]}/><meshBasicMaterial color="#e3c085" transparent opacity={.28} side={THREE.DoubleSide}/></mesh>
      {Array.from({length:6},(_,i)=><mesh key={i} position={[Math.cos(i*Math.PI/3)*1.8,Math.sin(i*Math.PI/3)*1.8,0]} rotation={[.2,i,.4]}><tetrahedronGeometry args={[.07]}/><meshStandardMaterial color="#edcd88" emissive="#b89445" emissiveIntensity={.25} metalness={.8} roughness={.2}/></mesh>)}
    </group>
  </group>
}

import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DrawMode, Participant } from '../core/types'
import type { CinematicState } from '../core/cinematic'
import { resultLayout } from './resultLayout'
import { hologram, identity, nameTexture, plate } from './design'

const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

function resultNumberTexture(number: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 512, 512)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const text = String(number)
  const size = text.length >= 2 ? 300 : 360
  ctx.font = `900 ${size}px "Noto Sans JP", sans-serif`
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#5a4100'
  ctx.lineWidth = 22
  ctx.shadowColor = 'rgba(255,224,112,.55)'
  ctx.shadowBlur = 34
  ctx.strokeText(text, 256, 266)
  ctx.fillStyle = '#fff2a8'
  ctx.fillText(text, 256, 266)
  ctx.shadowBlur = 0
  ctx.strokeStyle = 'rgba(255,255,255,.75)'
  ctx.lineWidth = 4
  ctx.strokeText(text, 256, 266)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

export function ParticipantCard({ participant, index, resultIndex, total, revealTotal, isWinner, mode, cinematic: s, portrait, revealed, groupIndex = 0, groupPosition = 0, groupSize = 1, groupCount = 1, maxGroupSize = 1 }: {
  participant: Participant
  index: number
  resultIndex: number
  total: number
  revealTotal: number
  isWinner: boolean
  mode: DrawMode
  cinematic: CinematicState
  portrait: boolean
  revealed: boolean
  groupIndex?: number
  groupPosition?: number
  groupSize?: number
  maxGroupSize?: number
  groupCount?: number
}) {
  const root = useRef<THREE.Group>(null)
  const armor = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Group>(null)
  const glyph = useRef<THREE.Group>(null)
  const label = useRef<THREE.MeshBasicMaterial>(null)
  const frame = useRef<THREE.MeshPhysicalMaterial>(null)
  const design = useMemo(() => identity(participant.id), [participant.id])

  const cardCopy = useMemo(() => {
    if (mode === 'single_winner') return { kicker: 'WINNER', number: 1, footer: 'CORE / CHOSEN' }
    if (mode === 'multi_winner') return { kicker: 'WINNER', number: resultIndex + 1, footer: 'MULTI DRAW / SELECTED' }
    if (mode === 'top_n_ordered') return { kicker: 'RANK', number: resultIndex + 1, footer: 'TOP-N / FINAL RANK' }
    if (mode === 'ordered_list') return { kicker: 'ORDER', number: resultIndex + 1, footer: 'ORDERED LIST / FINAL' }
    if (mode === 'shuffle_only') return { kicker: 'ORDER', number: resultIndex + 1, footer: 'SHUFFLE / FINAL ORDER' }
    return { kicker: `TEAM ${String(groupIndex + 1).padStart(2, '0')}`, number: groupPosition + 1, footer: 'GROUPING / MEMBER' }
  }, [mode, resultIndex, groupIndex, groupPosition])

  const resultMarkNumber = mode === 'grouping'
    ? groupIndex + 1
    : mode === 'ordered_list' || mode === 'shuffle_only' || mode === 'top_n_ordered'
      ? resultIndex + 1
      : null
  const showResultNumber = revealed && resultMarkNumber !== null

  const resources = useMemo(() => {
    const color = new THREE.Color().setHSL(design.hue, .46, .64)
    return {
      color,
      steel: new THREE.Color('#46515a'),
      goldMetal: new THREE.Color('#9c8052'),
      goldGlow: new THREE.Color('#e0b56e'),
      body: plate(2.14, 3.22, .24, .22),
      back: plate(2.02, 3.08, .22, .1),
      glass: plate(1.78, 2.82, .2, .06),
      corner: plate(.36, .82, .1, .14),
      shader: hologram(color, design.seed),
      texture: nameTexture(participant.name, cardCopy.number, cardCopy.kicker, cardCopy.footer),
      resultNumber: resultMarkNumber === null ? null : resultNumberTexture(resultMarkNumber),
    }
  }, [design, participant.name, cardCopy, resultMarkNumber])

  useEffect(() => () => {
    resources.body.dispose()
    resources.back.dispose()
    resources.glass.dispose()
    resources.corner.dispose()
    resources.shader.dispose()
    resources.texture.dispose()
    resources.resultNumber?.dispose()
  }, [resources])

  useFrame(({ clock }) => {
    const node = root.current
    if (!node) return
    const ensembleReveal = mode === 'ordered_list' || mode === 'shuffle_only' || mode === 'grouping'
    const targetReveal = isWinner || ensembleReveal
    const hero = targetReveal && s.winner > 0
    node.visible = hero ? s.formation > .0001 : s.entries > .01 && s.winner === 0
    if (!node.visible) return
    const idle = s.running || s.winner > 0 || s.reduced ? 0 : clock.elapsedTime * .045

    if (hero) {
      if (mode === 'single_winner') {
        const t = clamp01(s.formation)
        const arc = Math.sin(t * Math.PI)
        node.position.set(arc * .6, .1 * t + arc * .2, 2.1 + 1.1 * t + arc * .7)
        node.rotation.set(arc * -.08, arc * .32, arc * -.08)
        node.scale.setScalar(t)
      } else {
        const target = resultLayout(resultIndex, Math.max(1, revealTotal), portrait, mode === 'grouping', groupIndex, groupPosition, groupCount, maxGroupSize)
        const t = clamp01(s.formation)
        // Shared depth, no crossing arcs; card size and cell spacing grow together.
        node.position.set(target.x * t, target.y * t, 2.1 + 1.1 * t)
        node.rotation.set(0, 0, 0)
        node.scale.setScalar(target.scale * t)

      }
    } else {
      const a = index / total * Math.PI * 2 + s.orbit + idle
      const r = (portrait ? 3 : 4.5) + (index % 3) * .32
      const collapse = 1 - s.absorption
      node.position.set(Math.cos(a) * r * collapse, Math.sin(a) * (portrait ? 3.6 : 2.35) * collapse, Math.sin(a * .9 + index) * 1.4 * collapse - .8)
      node.rotation.set(.14 * Math.sin(a * .7), Math.sin(a) * .82 + Math.cos(a * .35) * .14, Math.cos(a) * .1 + s.absorption * 1.2)
      node.scale.setScalar((.255 + (index % 3) * .016) * Math.max(.04, collapse) * s.entries)
    }

    const awakening = hero ? s.awaken : 0
    const cardReadability = mode === 'single_winner'
      ? s.readable
      : Math.max(s.readable, clamp01((s.formation - .7) / .3) * .94)
    resources.shader.uniforms.uTime.value = s.reduced ? 0 : clock.elapsedTime * .22
    resources.shader.uniforms.uAwaken.value = awakening
    if (frame.current) {
      frame.current.color.copy(resources.steel).lerp(resources.goldMetal, awakening)
      frame.current.emissive.copy(resources.color).lerp(resources.goldGlow, awakening)
      frame.current.emissiveIntensity = .035 + awakening * .11
      frame.current.roughness = .24 - awakening * .035
    }
    if (label.current) label.current.opacity = hero ? cardReadability : 0
    if (armor.current) armor.current.children.forEach((part, i) => {
      const x = i % 2 === 0 ? -1 : 1
      const y = i < 2 ? 1 : -1
      part.position.set(x * (.87 + awakening * .19), y * (1.23 + awakening * .13), .16 + awakening * .12)
      part.rotation.z = x * y * awakening * .2
    })
    if (halo.current) {
      halo.current.visible = awakening > .01 && mode === 'single_winner'
      halo.current.scale.setScalar(.65 + awakening * .7)
      halo.current.rotation.z = awakening * .5
    }
    if (glyph.current) {
      glyph.current.position.z = .31 + awakening * .14
      glyph.current.rotation.z = design.variant * .25 + awakening * Math.PI * .5
    }
  })

  return <group ref={root} name={`entry-${participant.id}`}>
    <mesh geometry={resources.body} position={[0, 0, -.11]}><meshPhysicalMaterial ref={frame} color="#46515a" metalness={.9} roughness={.24} clearcoat={.4} clearcoatRoughness={.16} envMapIntensity={1.45} emissive={resources.color} emissiveIntensity={.035} /></mesh>
    <mesh geometry={resources.back} position={[0, 0, -.16]} rotation={[0, Math.PI, 0]}><meshPhysicalMaterial color="#263039" metalness={.82} roughness={.3} clearcoat={.22} envMapIntensity={1.2} /></mesh>
    <mesh position={[-1.02, 0, .03]}><boxGeometry args={[.12, 2.54, .27]} /><meshPhysicalMaterial color="#77848d" metalness={.92} roughness={.2} envMapIntensity={1.5} /></mesh>
    <mesh position={[1.02, 0, .03]}><boxGeometry args={[.12, 2.54, .27]} /><meshPhysicalMaterial color="#77848d" metalness={.92} roughness={.2} envMapIntensity={1.5} /></mesh>
    <mesh position={[0, 1.48, .03]}><boxGeometry args={[1.58, .11, .27]} /><meshPhysicalMaterial color="#66727b" metalness={.9} roughness={.22} envMapIntensity={1.4} /></mesh>
    <mesh position={[0, -1.48, .03]}><boxGeometry args={[1.58, .11, .27]} /><meshPhysicalMaterial color="#66727b" metalness={.9} roughness={.22} envMapIntensity={1.4} /></mesh>
    <mesh geometry={resources.glass} position={[0, 0, .12]}><meshPhysicalMaterial color="#111c24" metalness={.12} roughness={.1} clearcoat={1} clearcoatRoughness={.04} envMapIntensity={1.8} /></mesh>
    <mesh position={[0, 0, .235]} material={resources.shader}><planeGeometry args={[1.7, 2.72]} /></mesh>
    <group ref={glyph} position={[0, .48, .31]} visible={!showResultNumber}>
      <mesh><ringGeometry args={[.37, .4, design.sides]} /><meshStandardMaterial color="#e1e9ec" emissive={resources.color} emissiveIntensity={.28} metalness={.72} roughness={.22} /></mesh>
      <mesh rotation={[0, 0, Math.PI / design.sides]}><ringGeometry args={[.25, .272, design.sides]} /><meshStandardMaterial color="#8a99a1" emissive={resources.color} emissiveIntensity={.12} metalness={.86} roughness={.2} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[.115, .115, .05]} /><meshStandardMaterial color="#f0ece1" metalness={.62} roughness={.18} /></mesh>
    </group>
    {resources.resultNumber && <mesh position={[0, .5, .34]} visible={showResultNumber}>
      <planeGeometry args={[1.08, 1.08]} />
      <meshBasicMaterial map={resources.resultNumber} transparent depthWrite={false} toneMapped={false} />
    </mesh>}
    <group ref={armor}>{[0, 1, 2, 3].map((i) => <group key={i}><mesh geometry={resources.corner}><meshPhysicalMaterial color="#929ca3" metalness={.93} roughness={.2} clearcoat={.22} envMapIntensity={1.4} /></mesh><mesh position={[0, 0, .16]}><boxGeometry args={[.045, .4, .045]} /><meshBasicMaterial color={resources.color} transparent opacity={.72} toneMapped={false} /></mesh></group>)}</group>
    <mesh position={[0, -.48, .315]}><planeGeometry args={[1.84, 1.08]} /><meshBasicMaterial ref={label} map={resources.texture} transparent opacity={0} depthWrite={false} toneMapped={false} /></mesh>
    <mesh position={[0, 1.12, .315]}><boxGeometry args={[.78, .022, .03]} /><meshStandardMaterial color="#d2dce0" emissive={resources.color} emissiveIntensity={.18} metalness={.7} /></mesh>
    <mesh position={[0, -1.23, .315]}><boxGeometry args={[.78, .022, .03]} /><meshStandardMaterial color="#d2dce0" emissive={resources.color} emissiveIntensity={.18} metalness={.7} /></mesh>
    <group position={[0, 0, -.255]} rotation={[0, Math.PI, 0]}>
      <mesh><ringGeometry args={[.58, .615, 6]} /><meshStandardMaterial color="#88969d" metalness={.88} roughness={.22} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 6]}><ringGeometry args={[.35, .38, 3]} /><meshStandardMaterial color="#b1babf" metalness={.84} roughness={.18} /></mesh>
      {[0, 1, 2].map((i) => <mesh key={i} position={[0, -.95 + i * .09, 0]}><boxGeometry args={[.5 - i * .12, .014, .025]} /><meshStandardMaterial color="#818b90" metalness={.82} roughness={.24} /></mesh>)}
    </group>
    <group ref={halo} position={[0, .15, -.34]} visible={false}>
      <mesh><ringGeometry args={[1.45, 1.47, 192]} /><meshBasicMaterial color="#dfb86f" transparent opacity={.6} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      <mesh rotation={[0, 0, .2]}><ringGeometry args={[1.57, 1.61, 6]} /><meshBasicMaterial color="#e3c085" transparent opacity={.24} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 1.8, Math.sin(i * Math.PI / 3) * 1.8, 0]} rotation={[.2, i, .4]}><tetrahedronGeometry args={[.07]} /><meshStandardMaterial color="#edcd88" emissive="#b89445" emissiveIntensity={.2} metalness={.8} roughness={.2} /></mesh>)}
    </group>
  </group>
}

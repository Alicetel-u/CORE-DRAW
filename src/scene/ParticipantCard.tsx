import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { DrawMode, Participant } from '../core/types'
import type { CinematicState } from '../core/cinematic'
import { hologram, identity, nameTexture, plate } from './design'

const GOLDEN_ANGLE = 2.399963229728653
const clamp01 = (value: number) => Math.max(0, Math.min(1, value))

export function ParticipantCard({ participant, index, resultIndex, total, revealTotal, isWinner, mode, cinematic: s, portrait, groupIndex = 0, groupPosition = 0, groupSize = 1, groupCount = 1 }: {
  participant: Participant
  index: number
  resultIndex: number
  total: number
  revealTotal: number
  isWinner: boolean
  mode: DrawMode
  cinematic: CinematicState
  portrait: boolean
  groupIndex?: number
  groupPosition?: number
  groupSize?: number
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
    }
  }, [design, participant.name, cardCopy])

  useEffect(() => () => {
    resources.body.dispose()
    resources.back.dispose()
    resources.glass.dispose()
    resources.corner.dispose()
    resources.shader.dispose()
    resources.texture.dispose()
  }, [resources])

  useFrame(({ clock }) => {
    const node = root.current
    if (!node) return
    const ensembleReveal = mode === 'ordered_list' || mode === 'shuffle_only' || mode === 'grouping'
    const targetReveal = isWinner || ensembleReveal
    const hero = targetReveal && s.winner > 0
    node.visible = hero || s.entries > .01
    if (!node.visible) return
    const idle = s.running || s.winner > 0 || s.reduced ? 0 : clock.elapsedTime * .045

    if (hero) {
      if (mode === 'single_winner') {
        node.position.set(s.wx, s.wy, s.wz)
        node.rotation.set(s.wrx, s.wry, s.wrz)
        node.scale.setScalar(s.ws)
      } else {
        const count = Math.max(1, revealTotal)
        const normalizedIndex = count <= 1 ? 0 : Math.min(resultIndex, count - 1) / (count - 1)
        const delay = normalizedIndex * .085
        const t = clamp01((s.formation - delay) / Math.max(.001, 1 - delay))
        const arc = Math.sin(t * Math.PI)
        const launchAngle = resultIndex * GOLDEN_ANGLE + groupIndex * .31
        let finalX = 0
        let finalY = 0
        let finalScale = .48
        let finalRz = 0

        if (mode === 'grouping') {
          const spacingX = portrait ? 1.7 : Math.max(2.25, 3.1 - Math.max(0, groupCount - 2) * .25)
          const spacingY = portrait ? 1.25 : 1.55
          finalX = (groupIndex - (groupCount - 1) / 2) * spacingX
          finalY = ((groupSize - 1) / 2 - groupPosition) * spacingY
          finalScale = Math.max(.13, Math.min(
            portrait ? .54 : .7,
            (portrait ? 4.4 : 8.8) / Math.max(2, groupCount * 2.05),
            (portrait ? 5.3 : 6.8) / Math.max(2, groupSize * 2.25),
          ))
        } else {
          const highlightMode = mode === 'multi_winner' || mode === 'top_n_ordered'
          const maxCols = portrait ? (highlightMode ? 2 : 3) : (highlightMode ? 4 : 5)
          const cols = Math.min(maxCols, count)
          const rows = Math.ceil(count / cols)
          const col = resultIndex % cols
          const row = Math.floor(resultIndex / cols)
          const spacingX = portrait ? 1.45 : (highlightMode ? 2.45 : 1.95)
          const spacingY = portrait ? 1.7 : (highlightMode ? 2.05 : 1.9)
          finalX = (col - (cols - 1) / 2) * spacingX
          finalY = ((rows - 1) / 2 - row) * spacingY
          const limit = highlightMode ? (portrait ? .7 : .92) : (portrait ? .48 : .62)
          finalScale = Math.max(.12, Math.min(
            limit,
            (portrait ? 4.4 : 9.2) / Math.max(2, cols * 2.05),
            (portrait ? 5.6 : 7.1) / Math.max(2, rows * 2.55),
          ))
          finalRz = mode === 'top_n_ordered' ? (col - (cols - 1) / 2) * -.035 : 0
        }

        const curveX = Math.cos(launchAngle) * arc * (portrait ? .5 : .78)
        const curveY = Math.sin(launchAngle) * arc * (portrait ? .42 : .62)
        const curveZ = arc * (portrait ? 1.05 : 1.55)
        node.position.set(
          finalX * t + curveX,
          finalY * t + curveY,
          THREE.MathUtils.lerp(.38, 3.2 + resultIndex * .002, t) + curveZ,
        )
        node.rotation.set(
          THREE.MathUtils.lerp((resultIndex % 3 - 1) * .34, 0, t),
          THREE.MathUtils.lerp((resultIndex % 2 ? 1 : -1) * 1.08, 0, t),
          THREE.MathUtils.lerp((resultIndex % 2 ? 1 : -1) * .28, finalRz, t),
        )
        const scale = THREE.MathUtils.lerp(.008, finalScale, t) * (1 + arc * .1)
        node.scale.setScalar(scale)
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
    resources.shader.uniforms.uTime.value = s.running ? s.time : clock.elapsedTime * .22
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
      halo.current.visible = awakening > .01 && (mode === 'single_winner' || isWinner)
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
    <mesh position={[0, 0, .205]} material={resources.shader}><planeGeometry args={[1.7, 2.72]} /></mesh>
    <group ref={glyph} position={[0, .48, .31]}>
      <mesh><ringGeometry args={[.37, .4, design.sides]} /><meshStandardMaterial color="#e1e9ec" emissive={resources.color} emissiveIntensity={.28} metalness={.72} roughness={.22} /></mesh>
      <mesh rotation={[0, 0, Math.PI / design.sides]}><ringGeometry args={[.25, .272, design.sides]} /><meshStandardMaterial color="#8a99a1" emissive={resources.color} emissiveIntensity={.12} metalness={.86} roughness={.2} /></mesh>
      <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[.115, .115, .05]} /><meshStandardMaterial color="#f0ece1" metalness={.62} roughness={.18} /></mesh>
    </group>
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
      <mesh><ringGeometry args={[1.45, 1.47, 96]} /><meshBasicMaterial color="#dfb86f" transparent opacity={.6} side={THREE.DoubleSide} toneMapped={false} /></mesh>
      <mesh rotation={[0, 0, .2]}><ringGeometry args={[1.57, 1.61, 6]} /><meshBasicMaterial color="#e3c085" transparent opacity={.24} side={THREE.DoubleSide} /></mesh>
      {Array.from({ length: 6 }, (_, i) => <mesh key={i} position={[Math.cos(i * Math.PI / 3) * 1.8, Math.sin(i * Math.PI / 3) * 1.8, 0]} rotation={[.2, i, .4]}><tetrahedronGeometry args={[.07]} /><meshStandardMaterial color="#edcd88" emissive="#b89445" emissiveIntensity={.2} metalness={.8} roughness={.2} /></mesh>)}
    </group>
  </group>
}

import { useEffect, useMemo, useRef, useState } from 'react'
import type { DrawResult, Participant } from '../../core/types'
import type { QuestBattleScript } from './questRaidBattle'
import type { BossPose } from './questRaidBosses'
import type { QuestFrame } from './questRaidDirector'
import { QuestRaidRoster } from './QuestRaidRoster'
import { QuestRaidHud } from './QuestRaidHud'
import { QuestRaidResult } from './QuestRaidResult'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

const FIELD_BG = new URL('./bosses/battle-bg.png', import.meta.url).href

function px(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  px(ctx, x, y, s, color)
  px(ctx, x - s * 2, y, s, color)
  px(ctx, x + s * 2, y, s, color)
  px(ctx, x, y - s * 2, s, color)
  px(ctx, x, y + s * 2, s, color)
}

function boltPath(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, cell: number, seed: number, color: string) {
  ctx.fillStyle = color
  let x = x0, y = y0
  const steps = 10
  for (let i = 1; i <= steps; i++) {
    const nx = x0 + (x1 - x0) * i / steps + Math.sin(i * 1.7 + seed) * 22
    const ny = y0 + (y1 - y0) * i / steps
    const xMin = Math.round(Math.min(x, nx)), yMin = Math.round(Math.min(y, ny))
    ctx.fillRect(xMin, Math.round(y), Math.max(cell, Math.abs(nx - x)), cell)
    ctx.fillRect(Math.round(nx), yMin, cell, Math.max(cell, Math.abs(ny - y)))
    if (i % 3 === 0) {
      const bx = nx + Math.sin(seed + i) * 28
      const by = ny + 18
      ctx.fillRect(Math.round(Math.min(nx, bx)), Math.round(ny), Math.max(cell, Math.abs(bx - nx)), cell)
      ctx.fillRect(Math.round(bx), Math.round(ny), cell, Math.max(cell, by - ny))
    }
    x = nx
    y = ny
  }
}

function paintEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  effect: 'fire' | 'bolt' | 'slash' | 'spell' | 'roar' | undefined,
  age: number,
  duration: number,
  cx: number,
  cy: number,
  size: number,
) {
  if (!effect) return
  const p = Math.min(1, age / Math.max(1, duration))
  const flash = p < .18 ? 1 - p / .18 : p > .82 ? (1 - p) / .18 : .35
  const cell = Math.max(3, Math.round(size / 42))
  const t = age / 30

  if (effect === 'fire') {
    ctx.fillStyle = `rgba(255,70,0,${0.18 + flash * .28})`
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < 64; i++) {
      const rise = ((i * 41 + t * 22) % 120) / 120
      const x = cx - size * .4 + (i % 12) * size * .07 + Math.sin(t * .8 + i) * 10
      const y = cy + size * .58 - rise * (size * 1.15 + h * .15)
      const s = cell + (i % 4) + (rise < .2 ? 3 : 0)
      px(ctx, x, y, s, i % 5 === 0 ? '#fff6c0' : i % 2 ? '#ff9a1a' : '#e22710')
    }
    for (let i = 0; i < 18; i++) star(ctx, cx + Math.sin(i * 1.3 + t) * size * .5, cy - riseStar(i, t) * size, cell, '#ffe08a')
  } else if (effect === 'bolt') {
    ctx.fillStyle = `rgba(220,240,255,${flash * .55})`
    ctx.fillRect(0, 0, w, h)
    boltPath(ctx, cx, 0, cx + 8, h * .92, cell + 1, t, '#ffffff')
    boltPath(ctx, cx - size * .22, 0, cx - size * .1, h * .85, cell, t + 2, '#9ad8ff')
    boltPath(ctx, cx + size * .24, 0, cx + size * .12, h * .88, cell, t + 4, '#c4eeff')
    for (let i = 0; i < 22; i++) star(ctx, (i * 97 + age * 3) % w, (i * 53 + age * 2) % h, cell, i % 2 ? '#fff' : '#7fd4ff')
  } else if (effect === 'slash') {
    ctx.fillStyle = `rgba(255,255,255,${flash * .22})`
    ctx.fillRect(0, 0, w, h)
    const slashes = [[-size * .45, -size * .2, size * .95, size * .7], [size * .4, -size * .28, -size * .9, size * .75], [-size * .1, -size * .4, size * .15, size * .95]]
    for (const [sx, sy, dx, dy] of slashes) {
      for (let i = 0; i < 22; i++) {
        const u = i / 21
        px(ctx, cx + sx + dx * u, cy + sy + dy * u, cell + (i % 3 === 0 ? 3 : 1), i % 2 ? '#fff' : '#d7ecff')
      }
    }
    for (let i = 0; i < 16; i++) star(ctx, cx + Math.cos(i) * size * .55, cy + Math.sin(i * 1.4) * size * .4, cell, '#fff')
  } else if (effect === 'spell') {
    ctx.fillStyle = `rgba(70,20,140,${0.16 + flash * .2})`
    ctx.fillRect(0, 0, w, h)
    const gy = cy + size * .38
    for (let r = 1; r <= 5; r++) {
      const rad = size * (.12 + r * .08) * (.4 + p)
      ctx.strokeStyle = r % 2 ? '#ffe66f' : '#c9a0ff'
      ctx.lineWidth = cell
      ctx.beginPath()
      ctx.ellipse(cx, gy, rad, rad * .32, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2 + t * .25
      const rad = size * .34
      ctx.strokeStyle = '#ffe66f'
      ctx.lineWidth = Math.max(2, cell - 1)
      ctx.beginPath()
      ctx.moveTo(cx, gy)
      ctx.lineTo(cx + Math.cos(a) * rad, gy + Math.sin(a) * rad * .32)
      ctx.stroke()
    }
    for (let i = 0; i < 36; i++) {
      const rise = ((i * 29 + t * 16) % 100) / 100
      px(ctx, cx + Math.sin(i + t) * size * .5, gy - rise * size, cell, i % 3 ? '#b388ff' : '#fff4a8')
    }
    for (let i = 0; i < 10; i++) star(ctx, cx + Math.cos(i * .7 + t) * size * .6, cy + Math.sin(i + t) * size * .35, cell + 1, '#fff')
  } else if (effect === 'roar') {
    ctx.fillStyle = `rgba(255,200,40,${flash * .28})`
    ctx.fillRect(0, 0, w, h)
    ctx.strokeStyle = '#ffe66f'
    ctx.lineWidth = cell + 1
    for (let r = 1; r <= 6; r++) {
      const rad = size * .1 * r + p * size * .7
      ctx.globalAlpha = Math.max(0, 1 - r / 7 - p * .3)
      ctx.beginPath()
      ctx.arc(cx, cy + size * .05, rad, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2
      const len = size * (.2 + p * .55)
      ctx.fillStyle = '#fff3b0'
      ctx.fillRect(Math.round(cx + Math.cos(a) * size * .12), Math.round(cy + Math.sin(a) * size * .12), Math.max(cell, Math.round(Math.cos(a) * len)), Math.max(cell, Math.round(Math.sin(a) * len * .4)))
    }
    for (let i = 0; i < 24; i++) px(ctx, cx + Math.sin(i * 2 + t) * size * .7, h * .82 + (i % 5) * 6, cell, '#c4a06a')
  }
}

function riseStar(i: number, t: number) {
  return ((i * 17 + t * 9) % 80) / 80
}

function poseOf(frame: QuestFrame | null): BossPose {
  const event = frame?.event
  if (!event) return 'idle'
  if (event.pose) return event.pose
  if (event.type === 'boss_enrage') return 'special'
  if (event.type === 'boss_attack' || event.type === 'boss_aoe') return event.effect === 'slash' ? 'attack' : 'special'
  return 'idle'
}

function paint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  script: QuestBattleScript | null,
  frame: QuestFrame | null,
  reduced: boolean,
  sprites: Record<BossPose, HTMLImageElement | null>,
  palettes: HTMLCanvasElement[],
  background: HTMLImageElement | null,
) {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, h)
  if (background) ctx.drawImage(background, 0, 0, w, h)
  else {
    ctx.fillStyle = '#08101c'
    ctx.fillRect(0, 0, w, h)
  }

  const elapsed = frame?.elapsed ?? 0
  if (!reduced) {
    ctx.fillStyle = `rgba(255,120,30,${0.04 + Math.sin(elapsed / 180) * 0.03})`
    ctx.fillRect(0, h * .42, w * .22, h * .4)
    ctx.fillRect(w * .78, h * .42, w * .22, h * .4)
  }

  if (!script || script.peaceful || !frame) return

  const { event, bossHp } = frame
  const age = elapsed - event.at
  const settled = event.type === 'result'
  const hit = !settled && ['player_attack', 'player_spell', 'final_strike'].includes(event.type) && age < event.duration
  const attacking = !settled && ['boss_attack', 'boss_aoe'].includes(event.type) && age < event.duration
  const death = event.type === 'boss_defeat'
  const rage = !settled && !death && bossHp <= script.boss.maxHp * .3
  const step = settled || death || reduced ? 0 : Math.floor(elapsed / (1000 / (rage ? 6 : script.boss.animation.idleFps))) % 2
  const size = Math.min(w * .52, h * .78)
  const x = (w - size) / 2 + (!reduced && hit ? (Math.floor(age / 50) % 2 ? -size * .018 : size * .018) : 0)
  const y = h * .86 - size + (reduced || settled ? 0 : attacking ? (Math.floor(age / 90) % 2) * size * .015 : step * size * .01)
  const cx = x + size / 2
  const cy = y + size / 2

  if (rage && !reduced) {
    ctx.fillStyle = 'rgba(180,20,20,0.16)'
    ctx.fillRect(0, 0, w, h)
  }

  const sprite = sprites[poseOf(frame)] ?? sprites.idle
  ctx.save()
  if (settled) ctx.globalAlpha = .55
  else if (death) ctx.globalAlpha = Math.max(0, 1 - age / event.duration)
  if (sprite) ctx.drawImage(sprite, x, y, size, size)
  if (!reduced && !settled && sprite && ((hit && age < 70) || rage || death && age < 220)) {
    const mask = palettes[hit && age < 70 ? 0 : 1]
    if (mask) ctx.drawImage(mask, x, y, size, size)
  }
  ctx.restore()

  if (death && !settled && !reduced) {
    for (let i = 0; i < 40; i++) {
      if ((i * 47 + age) % 110 < age / event.duration * 90) {
        px(ctx, x + (i * 53 % size), y + (i * 29 % size), Math.max(4, size / 28), '#08101c')
      }
    }
  }

  if (attacking && !reduced) paintEffects(ctx, w, h, event.effect, age, event.duration, cx, cy, size)
  if (hit && !reduced && event.type === 'final_strike') {
    ctx.fillStyle = 'rgba(255,255,220,0.18)'
    ctx.fillRect(0, 0, w, h)
  }
}

export function QuestRaidStage({ script, frame, participants, reduced, result, revealed }: {
  script: QuestBattleScript | null
  frame: QuestFrame | null
  participants: Participant[]
  reduced: boolean
  result?: DrawResult | null
  revealed?: boolean
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const sprites = useRef<Record<BossPose, HTMLImageElement | null>>({ idle: null, attack: null, special: null })
  const background = useRef<HTMLImageElement | null>(null)
  const palettes = useRef<HTMLCanvasElement[]>([])
  const [view, setView] = useState({ w: 640, h: 360 })
  const [art, setArt] = useState(0)
  const idleFighters = useMemo(() => participants.map(p => ({ ...p, maxHp: 100, hp: 100, maxMp: 20, mp: 20 })), [participants])

  useEffect(() => {
    const img = new Image()
    img.src = FIELD_BG
    img.onload = () => { background.current = img; setArt(n => n + 1) }
  }, [])

  useEffect(() => {
    sprites.current = { idle: null, attack: null, special: null }
    palettes.current = []
    if (!script) return
    let alive = true
    const poses: BossPose[] = ['idle', 'attack', 'special']
    for (const pose of poses) {
      const img = new Image()
      img.src = script.boss.sprites[pose]
      img.onload = () => {
        if (!alive) return
        sprites.current[pose] = img
        if (pose === 'idle') {
          palettes.current = ['#ffffffbb', '#db34343a'].map(color => {
            const mask = document.createElement('canvas')
            mask.width = img.width || 256
            mask.height = img.height || 256
            const m = mask.getContext('2d')!
            m.drawImage(img, 0, 0)
            m.globalCompositeOperation = 'source-atop'
            m.fillStyle = color
            m.fillRect(0, 0, mask.width, mask.height)
            return mask
          })
        }
        setArt(n => n + 1)
      }
    }
    return () => { alive = false }
  }, [script])

  useEffect(() => {
    const box = field.current
    if (!box) return
    const apply = () => {
      const r = box.getBoundingClientRect()
      setView({ w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) })
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const node = canvas.current
    const ctx = node?.getContext('2d')
    if (!node || !ctx) return
    if (node.width !== view.w) node.width = view.w
    if (node.height !== view.h) node.height = view.h
    paint(ctx, view.w, view.h, script, frame, reduced, sprites.current, palettes.current, background.current)
  }, [view, frame, script, reduced, art])

  const event = frame?.event ?? { type: 'intro' as const, phase: 'INTRO' as const, at: 0, duration: 0, message: 'なかまは そろった。\nぼうけんを はじめよう！' }
  const age = frame ? frame.elapsed - event.at : 9999
  const fighters = frame?.fighters ?? script?.fighters ?? idleFighters
  const shake = !reduced && event.type.startsWith('boss_') && event.type !== 'boss_defeat' && event.type !== 'result' && age < 180
  const highlight = age < Math.max(220, event.duration)
  const density = densityFor(fighters.length)

  return <div className={`qr-stage qr-density-${density} ${reduced ? 'qr-reduced' : ''} ${shake ? 'qr-shake' : ''}`}>
    <QuestRaidRoster
      fighters={fighters}
      criticalIds={highlight ? frame?.criticalIds ?? [] : []}
      actorId={highlight ? event.actorId : undefined}
      targetIds={highlight ? event.targetIds : undefined}
      reduced={reduced}
    />
    <div className="qr-main">
      <div className="qr-boss-area" ref={field}>
        <canvas ref={canvas} aria-label={script && !script.peaceful ? script.boss.name : 'QUEST RAID'} />
        <div className="qr-battle-info">{script?.peaceful ? 'へんせい' : `せいぞん ${fighters.filter(f => f.hp > 0).length}`}<span>{script && !script.peaceful ? script.boss.name : 'QUEST RAID'}</span></div>
        {revealed && result && <QuestRaidResult result={result} participants={participants} />}
      </div>
      <QuestRaidHud event={event} age={age} reduced={reduced} />
    </div>
  </div>
}

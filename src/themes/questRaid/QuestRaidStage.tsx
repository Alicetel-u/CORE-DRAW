import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DrawResult, Participant } from '../../core/types'
import type { QuestBattleScript } from './questRaidBattle'
import type { BossPose } from './questRaidBosses'
import type { QuestEffect } from './questRaidEvents'
import type { QuestFrame } from './questRaidDirector'
import { QuestRaidRoster } from './QuestRaidRoster'
import { QuestRaidHud } from './QuestRaidHud'
import { QuestRaidResult } from './QuestRaidResult'
import { QuestRaidBossHp } from './QuestRaidBossHp'

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
  const steps = 12
  for (let i = 1; i <= steps; i++) {
    const nx = x0 + (x1 - x0) * i / steps + Math.sin(i * 1.73 + seed) * 20
    const ny = y0 + (y1 - y0) * i / steps
    ctx.fillRect(Math.round(Math.min(x, nx)), Math.round(y), Math.max(cell, Math.abs(nx - x)), cell)
    ctx.fillRect(Math.round(nx), Math.round(Math.min(y, ny)), cell, Math.max(cell, Math.abs(ny - y)))
    if (i % 3 === 0) {
      const bx = nx + Math.sin(seed + i * 1.4) * 32
      const by = ny + 18
      ctx.fillRect(Math.round(Math.min(nx, bx)), Math.round(ny), Math.max(cell, Math.abs(bx - nx)), cell)
      ctx.fillRect(Math.round(bx), Math.round(ny), cell, Math.max(cell, by - ny))
    }
    x = nx
    y = ny
  }
}

function screenFlash(ctx: CanvasRenderingContext2D, w: number, h: number, color: string, alpha: number) {
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha))
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

function radialGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, inner: string, outer: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, inner)
  gradient.addColorStop(1, outer)
  ctx.fillStyle = gradient
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2)
}

function ring(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, width: number, color: string, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function polygon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation: number, color: string, width: number, alpha = 1) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  for (let i = 0; i <= sides; i++) {
    const a = rotation + i / sides * Math.PI * 2
    const px = x + Math.cos(a) * radius
    const py = y + Math.sin(a) * radius
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.restore()
}

function normalizeEffect(effect: QuestEffect): QuestEffect {
  if (effect === 'fire') return 'fire_breath'
  if (effect === 'bolt') return 'dark_bolt'
  if (effect === 'spell') return 'eldritch_spell'
  if (effect === 'roar') return 'shockwave'
  return effect
}

function paintEffects(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  rawEffect: QuestEffect | undefined,
  age: number,
  duration: number,
  cx: number,
  cy: number,
  size: number,
) {
  if (!rawEffect) return
  const effect = normalizeEffect(rawEffect)
  const p = Math.min(1, Math.max(0, age / Math.max(1, duration)))
  const flash = p < .16 ? 1 - p / .16 : p > .82 ? (1 - p) / .18 : .22
  const cell = Math.max(3, Math.round(size / 44))
  const t = age / 32

  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  if (effect === 'slash') {
    screenFlash(ctx, w, h, '#f2f8ff', flash * .2)
    ctx.lineCap = 'square'
    const slashes = [
      [-.42, -.3, .44, .38],
      [.32, -.34, -.5, .35],
      [-.2, -.42, .2, .48],
    ]
    for (let s = 0; s < slashes.length; s++) {
      const [sx, sy, ex, ey] = slashes[s]
      ctx.strokeStyle = s === 1 ? '#9fd6ff' : '#ffffff'
      ctx.lineWidth = cell + (s === 0 ? 4 : 2)
      ctx.globalAlpha = Math.max(.18, 1 - p)
      ctx.beginPath()
      ctx.moveTo(cx + sx * size, cy + sy * size)
      ctx.lineTo(cx + ex * size, cy + ey * size)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    for (let i = 0; i < 26; i++) {
      const a = i * 2.17 + t
      const r = size * (.18 + ((i * 29) % 100) / 190)
      star(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .72, cell + i % 2, i % 3 ? '#d8efff' : '#ffffff')
    }
  } else if (effect === 'bite_impact') {
    screenFlash(ctx, w, h, '#fff4e8', flash * .24)
    radialGlow(ctx, cx, cy, size * .42, 'rgba(255,220,180,.42)', 'rgba(255,80,30,0)')
    ctx.strokeStyle = '#fff2d6'
    ctx.lineWidth = cell + 4
    for (const dir of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(cx - size * .36, cy + dir * size * .32)
      for (let i = 1; i <= 7; i++) {
        const u = i / 7
        ctx.lineTo(cx - size * .36 + u * size * .72, cy + dir * size * (.32 - u * .27) + Math.sin(i * 2.4) * cell * 1.4)
      }
      ctx.stroke()
    }
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2
      px(ctx, cx + Math.cos(a) * size * (.2 + p * .3), cy + Math.sin(a) * size * (.14 + p * .22), cell + i % 3, i % 2 ? '#ffc27d' : '#ffffff')
    }
  } else if (effect === 'dark_bolt') {
    screenFlash(ctx, w, h, '#6f35ff', flash * .28)
    radialGlow(ctx, cx, cy, size * .58, 'rgba(140,70,255,.35)', 'rgba(15,0,45,0)')
    boltPath(ctx, cx, 0, cx + size * .02, h * .94, cell + 2, t, '#ffffff')
    boltPath(ctx, cx - size * .2, 0, cx - size * .08, h * .86, cell + 1, t + 2, '#a36dff')
    boltPath(ctx, cx + size * .2, 0, cx + size * .1, h * .88, cell, t + 4, '#6124d9')
    for (let i = 0; i < 32; i++) {
      const x = (i * 83 + age * 2.6) % w
      const y = (i * 47 + age * 1.5) % h
      star(ctx, x, y, cell, i % 4 ? '#9e78ff' : '#ffffff')
    }
  } else if (effect === 'dark_wave') {
    screenFlash(ctx, w, h, '#230033', .12 + flash * .12)
    radialGlow(ctx, cx, cy, size * .72, 'rgba(130,45,200,.3)', 'rgba(10,0,30,0)')
    for (let i = 0; i < 7; i++) {
      const q = (p + i * .16) % 1
      ring(ctx, cx, cy, size * (.12 + q * .88), size * (.05 + q * .32), cell + (i % 2), i % 2 ? '#7b39c8' : '#d79cff', 1 - q)
    }
    for (let i = 0; i < 46; i++) {
      const a = i * 2.39 + t * .12
      const q = ((i * 31 + t * 8) % 100) / 100
      px(ctx, cx + Math.cos(a) * size * q * .72, cy + Math.sin(a) * size * q * .3, cell + i % 2, i % 3 ? '#6d2b9c' : '#d8a1ff')
    }
  } else if (effect === 'fire_breath') {
    screenFlash(ctx, w, h, '#ff6a00', .08 + flash * .16)
    const mouthX = cx - size * .2
    const mouthY = cy - size * .08
    for (let i = 0; i < 92; i++) {
      const q = ((i * 37 + t * 10) % 100) / 100
      const spread = q * size * .38
      const x = mouthX - q * Math.max(size * .9, w * .7)
      const y = mouthY + Math.sin(i * 1.7 + t) * spread * .44 + (i % 5 - 2) * cell
      const s = cell + Math.round((1 - q) * 7) + i % 3
      const color = i % 7 === 0 ? '#fff4b0' : i % 3 === 0 ? '#ffd341' : i % 2 ? '#ff8a18' : '#e7350c'
      px(ctx, x, y, s, color)
    }
    radialGlow(ctx, mouthX - size * .28, mouthY, size * .42, 'rgba(255,220,80,.35)', 'rgba(255,60,0,0)')
    for (let i = 0; i < 18; i++) star(ctx, mouthX - ((i * 67 + age * 1.6) % Math.max(1, w)), mouthY + Math.sin(i + t) * size * .22, cell, '#ffd36c')
  } else if (effect === 'shockwave') {
    screenFlash(ctx, w, h, '#fff0a6', flash * .14)
    for (let i = 0; i < 8; i++) {
      const q = (p * 1.45 + i * .12) % 1
      ring(ctx, cx, cy + size * .02, size * (.08 + q * .92), size * (.06 + q * .72), cell + 1, i % 2 ? '#ffe36f' : '#ffffff', 1 - q)
    }
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2
      const r = size * (.18 + p * .72)
      px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r * .7, cell + i % 3, i % 2 ? '#d7bc68' : '#fff0aa')
    }
  } else if (effect === 'charge_impact') {
    screenFlash(ctx, w, h, '#eaf4ff', flash * .2)
    ctx.lineWidth = cell
    for (let i = 0; i < 30; i++) {
      const y = h * .18 + ((i * 53 + t * 23) % Math.max(1, h * .72))
      const len = size * (.18 + (i % 6) * .06)
      ctx.strokeStyle = i % 4 === 0 ? '#ffffff' : '#8eb8d8'
      ctx.globalAlpha = .35 + (i % 3) * .15
      ctx.beginPath()
      ctx.moveTo(w - ((age * 4 + i * 71) % Math.max(1, w)), y)
      ctx.lineTo(w - ((age * 4 + i * 71) % Math.max(1, w)) - len, y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    const impactX = w * .16
    const impactY = cy
    radialGlow(ctx, impactX, impactY, size * .34, 'rgba(255,255,255,.5)', 'rgba(80,140,180,0)')
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2
      const r = size * (.08 + p * .42)
      star(ctx, impactX + Math.cos(a) * r, impactY + Math.sin(a) * r, cell, i % 2 ? '#c9e9ff' : '#ffffff')
    }
  } else if (effect === 'shield_flash') {
    screenFlash(ctx, w, h, '#e8f8ff', flash * .18)
    radialGlow(ctx, cx, cy, size * .6, 'rgba(120,205,255,.28)', 'rgba(20,80,180,0)')
    const q = .86 + Math.sin(t * .38) * .04
    polygon(ctx, cx, cy, size * .38 * q, 6, Math.PI / 6, '#d9f4ff', cell + 2, .95)
    polygon(ctx, cx, cy, size * .29 * q, 6, Math.PI / 6, '#6ec9ff', cell, .85)
    ctx.strokeStyle = '#ffe99a'
    ctx.lineWidth = cell + 1
    ctx.beginPath(); ctx.moveTo(cx - size * .32, cy); ctx.lineTo(cx + size * .32, cy); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx, cy - size * .32); ctx.lineTo(cx, cy + size * .32); ctx.stroke()
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + t * .08
      star(ctx, cx + Math.cos(a) * size * .46, cy + Math.sin(a) * size * .46, cell, i % 3 ? '#9bdbff' : '#fff4b0')
    }
  } else if (effect === 'blue_flame') {
    screenFlash(ctx, w, h, '#126bff', .08 + flash * .18)
    radialGlow(ctx, cx, cy, size * .6, 'rgba(50,140,255,.28)', 'rgba(0,30,100,0)')
    for (let i = 0; i < 78; i++) {
      const rise = ((i * 41 + t * 17) % 120) / 120
      const x = cx + Math.sin(i * 1.31 + t * .3) * size * (.16 + rise * .42)
      const y = cy + size * .48 - rise * size * 1.12
      const s = cell + i % 4 + (rise < .18 ? 3 : 0)
      const color = i % 7 === 0 ? '#effcff' : i % 3 === 0 ? '#70dfff' : i % 2 ? '#188dff' : '#2948d7'
      px(ctx, x, y, s, color)
    }
    for (let i = 0; i < 22; i++) star(ctx, cx + Math.sin(i * 1.9 + t) * size * .48, cy - ((i * 23 + t * 7) % 100) / 100 * size, cell, '#a8ecff')
  } else if (effect === 'curse_wave') {
    screenFlash(ctx, w, h, '#40105f', .12 + flash * .12)
    radialGlow(ctx, cx, cy, size * .7, 'rgba(135,40,190,.3)', 'rgba(20,0,35,0)')
    for (let i = 0; i < 6; i++) {
      const q = (p + i * .18) % 1
      ring(ctx, cx, cy, size * (.1 + q * .78), size * (.08 + q * .58), cell, i % 2 ? '#b663e8' : '#61258e', 1 - q)
    }
    for (let i = 0; i < 20; i++) {
      const a = i / 20 * Math.PI * 2 - t * .07
      const r = size * (.22 + (i % 4) * .07)
      const x = cx + Math.cos(a) * r
      const y = cy + Math.sin(a) * r * .72
      polygon(ctx, x, y, cell * 2.3, 4, Math.PI / 4 + a, i % 3 ? '#9b4dcc' : '#e0a8ff', Math.max(1, cell - 1), .8)
    }
  } else if (effect === 'tentacle_slam') {
    screenFlash(ctx, w, h, '#bca0cf', flash * .14)
    ctx.lineCap = 'square'
    for (let k = 0; k < 4; k++) {
      ctx.strokeStyle = k % 2 ? '#7d4a82' : '#b07cae'
      ctx.lineWidth = cell * (3 + k % 2)
      ctx.beginPath()
      const startX = cx + (k - 1.5) * size * .13
      ctx.moveTo(startX, cy - size * .16)
      for (let i = 1; i <= 6; i++) {
        const u = i / 6
        ctx.lineTo(startX + Math.sin(i * 1.8 + k + t * .08) * size * .12, cy - size * .16 + u * size * .72)
      }
      ctx.stroke()
    }
    const groundY = cy + size * .42
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = i % 2 ? '#d9b6d5' : '#73506f'
      ctx.lineWidth = cell
      ctx.beginPath()
      ctx.moveTo(cx, groundY)
      ctx.lineTo(cx + Math.cos(i / 9 * Math.PI * 2) * size * (.2 + p * .46), groundY + Math.sin(i / 9 * Math.PI * 2) * size * .12)
      ctx.stroke()
    }
    for (let i = 0; i < 28; i++) px(ctx, cx + Math.sin(i * 2.3) * size * .56, groundY - ((i * 19 + t * 5) % 30), cell + i % 3, '#b997b1')
  } else if (effect === 'void_burst') {
    screenFlash(ctx, w, h, '#f8f0ff', flash * .42)
    radialGlow(ctx, cx, cy - size * .08, size * .74, 'rgba(255,255,255,.66)', 'rgba(110,30,190,0)')
    const ox = cx
    const oy = cy - size * .08
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2 + t * .025
      const r0 = size * .11
      const r1 = size * (.28 + p * .64 + (i % 3) * .03)
      ctx.strokeStyle = i % 4 === 0 ? '#ffffff' : i % 2 ? '#d8a0ff' : '#8e4ada'
      ctx.lineWidth = cell + (i % 3)
      ctx.globalAlpha = .45 + (i % 2) * .25
      ctx.beginPath(); ctx.moveTo(ox + Math.cos(a) * r0, oy + Math.sin(a) * r0); ctx.lineTo(ox + Math.cos(a) * r1, oy + Math.sin(a) * r1); ctx.stroke()
    }
    ctx.globalAlpha = 1
    ring(ctx, ox, oy, size * (.18 + p * .52), size * (.12 + p * .38), cell + 2, '#ffffff', 1 - p * .55)
  } else if (effect === 'eldritch_spell') {
    screenFlash(ctx, w, h, '#401060', .1 + flash * .1)
    const gy = cy + size * .34
    radialGlow(ctx, cx, gy, size * .72, 'rgba(95,255,160,.2)', 'rgba(45,0,75,0)')
    for (let r = 1; r <= 5; r++) {
      const spin = t * (r % 2 ? .018 : -.014)
      polygon(ctx, cx, gy, size * (.1 + r * .075) * (.72 + p * .35), r % 2 ? 6 : 8, spin, r % 2 ? '#8dffb4' : '#c76cff', cell, .75)
    }
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * Math.PI * 2 + t * .05
      const r = size * (.18 + (i % 5) * .065)
      const x = cx + Math.cos(a) * r
      const y = gy + Math.sin(a) * r * .42
      star(ctx, x, y, cell, i % 3 ? '#8dffb4' : '#e5b0ff')
    }
    for (let i = 0; i < 34; i++) {
      const rise = ((i * 29 + t * 11) % 100) / 100
      px(ctx, cx + Math.sin(i * 1.4 + t) * size * .52, gy - rise * size * .9, cell, i % 2 ? '#62d99c' : '#a951d1')
    }
  } else if (effect === 'ally_shot') {
    ctx.fillStyle = 'rgba(255, 214, 90, 0.16)'
    ctx.fillRect(0, 0, w * .28, h)
    const q = Math.min(1, p * 1.25)
    const x0 = 8, y0 = h * .72
    const x1 = cx, y1 = cy
    ctx.strokeStyle = '#ffe66f'
    ctx.lineWidth = cell + 3
    ctx.globalAlpha = .9
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q); ctx.stroke()
    ctx.strokeStyle = '#fff8d0'
    ctx.lineWidth = cell
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q); ctx.stroke()
    star(ctx, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, cell + 3, '#ffffff')
    if (q > .7) radialGlow(ctx, cx, cy, size * .22, 'rgba(255,230,140,.45)', 'rgba(255,200,60,0)')
  } else if (effect === 'ally_heal') {
    ctx.fillStyle = 'rgba(90, 255, 160, 0.12)'
    ctx.fillRect(0, 0, w * .32, h)
    for (let i = 0; i < 20; i++) {
      const x = 10 + (i * 37 + t * 6) % (w * .28)
      const y = h * .2 + ((i * 53 + t * 11) % (h * .7))
      star(ctx, x, y, cell + i % 2, i % 2 ? '#7dff92' : '#e8ffe8')
    }
  } else if (effect === 'ally_cheer') {
    ctx.fillStyle = 'rgba(255, 180, 230, 0.12)'
    ctx.fillRect(0, 0, w * .32, h)
    for (let i = 0; i < 14; i++) star(ctx, 16 + (i * 29) % (w * .26), h * .25 + Math.sin(i + t * .2) * h * .2, cell + 2, i % 2 ? '#ffe66f' : '#ff9ad4')
  } else if (effect === 'ally_toss') {
    ctx.fillStyle = 'rgba(255, 214, 90, 0.1)'
    ctx.fillRect(0, 0, w * .28, h)
    const q = Math.min(1, p * 1.35)
    const x = 12 + q * (cx - 12)
    const y = h * .78 - q * (h * .78 - cy) - Math.sin(q * Math.PI) * 56
    px(ctx, x, y, cell + 4, '#ffe66f')
    star(ctx, x, y, cell + 1, '#ffffff')
  }

  ctx.restore()
}

function poseOf(frame: QuestFrame | null, age = 0): BossPose {
  const event = frame?.event
  if (!event) return 'idle'
  const fx = event.fx ?? event.duration
  if (fx > 0 && age >= fx && event.type !== 'boss_defeat' && event.type !== 'result' && event.type !== 'boss_enrage') return 'idle'
  if (event.pose) return event.pose
  if (event.type === 'boss_enrage') return 'special'
  if (event.type === 'boss_attack' || event.type === 'boss_aoe') {
    const effect = event.effect ? normalizeEffect(event.effect) : undefined
    return effect === 'slash' || effect === 'bite_impact' || effect === 'charge_impact' || effect === 'tentacle_slam' ? 'attack' : 'special'
  }
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
  const fx = event.fx ?? event.duration
  const settled = event.type === 'result'
  const hit = !settled && ['player_attack', 'player_spell', 'player_heal', 'player_item', 'final_strike'].includes(event.type) && age < fx
  const attacking = !settled && ['boss_attack', 'boss_aoe'].includes(event.type) && age < fx
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

  const sprite = sprites[poseOf(frame, age)] ?? sprites.idle
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

  if (attacking && !reduced) paintEffects(ctx, w, h, event.effect, age, fx, cx, cy, size)
  if (hit && !reduced) paintEffects(ctx, w, h, event.effect ?? 'ally_shot', age, fx, cx, cy, size)
  if (hit && !reduced && event.type === 'final_strike') {
    ctx.fillStyle = 'rgba(255,236,150,0.14)'
    ctx.fillRect(0, 0, w * .34, h)
  }
}

export function QuestRaidStage({ script, frame, participants, reduced, result, revealed, action }: {
  script: QuestBattleScript | null
  frame: QuestFrame | null
  participants: Participant[]
  reduced: boolean
  result?: DrawResult | null
  revealed?: boolean
  action?: ReactNode
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
      <QuestRaidBossHp
        name={script && !script.peaceful ? script.boss.name : 'QUEST RAID'}
        hp={frame?.bossHp ?? script?.boss.maxHp ?? 0}
        maxHp={script?.boss.maxHp ?? 0}
        alive={fighters.filter(f => f.hp > 0).length}
        reduced={reduced}
        peaceful={Boolean(script?.peaceful)}
      />
      <div className="qr-boss-area" ref={field}>
        <canvas ref={canvas} aria-label={script && !script.peaceful ? script.boss.name : 'QUEST RAID'} />
        {action}
        {revealed && result && <QuestRaidResult result={result} participants={participants} />}
      </div>
      <QuestRaidHud event={event} age={age} reduced={reduced} />
    </div>
  </div>
}

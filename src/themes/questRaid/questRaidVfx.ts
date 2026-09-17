import type { QuestEffect } from './questRaidEvents'

export type ModernQuestEffect = Exclude<QuestEffect, 'fire' | 'bolt' | 'spell' | 'roar'>
type EffectInfo = { label: string; family: string; boss: string; pose: 'attack' | 'special'; reserved?: boolean }

/** One catalogue for battle rendering and the development preview. Reserved entries
 * are deliberately not added to the battle's skill/selection tables. */
export const QUEST_VFX = {
  slash: { label: '三日月の斬撃', family: '物理', boss: 'knight', pose: 'attack' },
  dark_bolt: { label: '冥雷', family: '闇', boss: 'dark-lord', pose: 'special' },
  dark_wave: { label: '闇の奔流', family: '闇', boss: 'dark-lord', pose: 'special' },
  bite_impact: { label: '竜牙の一撃', family: '物理', boss: 'dragon', pose: 'attack' },
  fire_breath: { label: '灼熱のブレス', family: '炎', boss: 'dragon', pose: 'special' },
  shockwave: { label: '大地の咆哮', family: '物理', boss: 'dragon', pose: 'special' },
  charge_impact: { label: '鉄騎の突進', family: '物理', boss: 'knight', pose: 'attack' },
  shield_flash: { label: '聖盾の加護', family: '光', boss: 'knight', pose: 'special' },
  blue_flame: { label: '蒼炎の噴出', family: '炎', boss: 'demon', pose: 'special' },
  curse_wave: { label: '怨霊の呪波', family: '闇', boss: 'demon', pose: 'special' },
  tentacle_slam: { label: '触手の強襲', family: '異界', boss: 'abomination', pose: 'attack' },
  void_burst: { label: '邪眼の崩壊', family: '異界', boss: 'abomination', pose: 'special' },
  eldritch_spell: { label: '異界の門', family: '異界', boss: 'abomination', pose: 'special' },
  ally_shot: { label: '彗星弾', family: '味方', boss: 'knight', pose: 'attack' },
  ally_heal: { label: '癒やしの芽吹き', family: '味方', boss: 'knight', pose: 'special' },
  ally_cheer: { label: '祝福の花舞', family: '味方', boss: 'demon', pose: 'special' },
  ally_toss: { label: '魔晶の投擲', family: '味方', boss: 'abomination', pose: 'attack' },
  ice_lance: { label: '氷晶の槍', family: '氷', boss: 'knight', pose: 'special', reserved: true },
  frost_nova: { label: '氷結の花冠', family: '氷', boss: 'dragon', pose: 'special', reserved: true },
  meteor: { label: '隕石落下', family: '炎', boss: 'dragon', pose: 'special', reserved: true },
  poison_mist: { label: '瘴気の沼', family: '毒', boss: 'abomination', pose: 'special', reserved: true },
  water_surge: { label: '蒼海のうねり', family: '水', boss: 'dragon', pose: 'special', reserved: true },
  earth_spike: { label: '地殻の牙', family: '大地', boss: 'knight', pose: 'special', reserved: true },
  holy_nova: { label: '暁の開花', family: '光', boss: 'knight', pose: 'special', reserved: true },
  soul_drain: { label: '魂の収奪', family: '闇', boss: 'demon', pose: 'special', reserved: true },
  arcane_missile: { label: '魔導の追尾弾', family: '魔法', boss: 'dark-lord', pose: 'special', reserved: true },
  wind_vortex: { label: '翠風の渦', family: '風', boss: 'dragon', pose: 'special', reserved: true },
  thunder_storm: { label: '雷雲の裁き', family: '雷', boss: 'dark-lord', pose: 'special', reserved: true },
  phoenix_flare: { label: '不死鳥の翼', family: '炎', boss: 'demon', pose: 'special', reserved: true },
} as const satisfies Record<ModernQuestEffect, EffectInfo>

export function normalizeEffect(effect: QuestEffect): ModernQuestEffect {
  if (effect === 'fire') return 'fire_breath'
  if (effect === 'bolt') return 'dark_bolt'
  if (effect === 'spell') return 'eldritch_spell'
  if (effect === 'roar') return 'shockwave'
  return effect
}

type Ctx = CanvasRenderingContext2D
type Palette = readonly [string, string, string]
const FIRE: Palette = ['#a51f24', '#ff741d', '#fff2a1']
const BLUE: Palette = ['#1837a7', '#168ff4', '#c5f9ff']
const VOID: Palette = ['#35144e', '#a44dd9', '#f2ccff']
const GOLD: Palette = ['#ad6627', '#f2bf54', '#fff3cb']
const ICE: Palette = ['#2157a0', '#53c1ea', '#e4ffff']
const JADE: Palette = ['#125448', '#55cd9a', '#d4ffe5']
const clamp = (v: number) => Math.max(0, Math.min(1, v))
const smooth = (v: number) => { const x = clamp(v); return x * x * (3 - 2 * x) }
const noise = (i: number) => { const v = Math.sin(i * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v) }
const TAU = Math.PI * 2

function gradient(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, colors: Palette) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, colors[0]); g.addColorStop(.56, colors[1]); g.addColorStop(1, colors[2])
  return g
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = .5, sy = 1) {
  if (r <= 0 || alpha <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sy); ctx.globalAlpha *= alpha
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
  g.addColorStop(0, color); g.addColorStop(.28, color + '99'); g.addColorStop(1, color + '00')
  ctx.fillStyle = g; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.restore()
}

/** Irregular, shaded cloud silhouettes, not a spray of square particles. */
function cloud(ctx: Ctx, x: number, y: number, r: number, seed: number, color: string, alpha: number, sy = .65) {
  if (r <= 0 || alpha <= 0) return
  ctx.save(); ctx.translate(x, y); ctx.scale(1, sy); ctx.globalAlpha *= alpha
  const g = ctx.createRadialGradient(-r * .2, -r * .3, r * .08, 0, 0, r * 1.25)
  g.addColorStop(0, color + 'c0'); g.addColorStop(.6, color + '70'); g.addColorStop(1, color + '00')
  ctx.fillStyle = g; ctx.beginPath()
  for (let k = 0; k < 12; k++) {
    const a = k / 12 * TAU, radius = r * (.82 + noise(seed + k) * .3)
    const x1 = Math.cos(a) * radius, y1 = Math.sin(a) * radius
    if (!k) ctx.moveTo(x1, y1)
    else ctx.quadraticCurveTo(Math.cos(a - .25) * radius * 1.17, Math.sin(a - .25) * radius * 1.17, x1, y1)
  }
  ctx.closePath(); ctx.fill(); ctx.restore()
}

function smoke(ctx: Ctx, x: number, y: number, radius: number, p: number, color = '#716b80', count = 8) {
  for (let i = 0; i < count; i++) {
    const a = i * 2.4, spread = radius * (.25 + p * .9)
    cloud(ctx, x + Math.cos(a) * spread, y + Math.sin(a) * spread * .25 - p * radius * noise(i + 5),
      radius * (.28 + noise(i) * .25) * (.7 + p), i * 13, color, (1 - p) * .72)
  }
}

/** A filled, tapered crescent with a distinct edge and shaded trailing mass. */
function crescent(ctx: Ctx, x: number, y: number, r: number, angle: number, colors: Palette, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.globalAlpha *= alpha
  ctx.fillStyle = gradient(ctx, -r, r * .35, r * .5, -r * .48, colors)
  ctx.beginPath(); ctx.moveTo(-r, r * .4)
  ctx.bezierCurveTo(-r * .5, -r * 1.12, r * .87, -r * .9, r, r * .13)
  ctx.bezierCurveTo(r * .5, -r * .45, -r * .22, -r * .42, -r, r * .4)
  ctx.fill()
  ctx.fillStyle = colors[2]; ctx.globalAlpha *= .85
  ctx.beginPath(); ctx.moveTo(-r, r * .4)
  ctx.bezierCurveTo(-r * .38, -r * .98, r * .9, -r * .82, r, r * .13)
  ctx.bezierCurveTo(r * .72, -r * .71, -r * .23, -r * .67, -r, r * .4)
  ctx.fill(); ctx.restore()
}

/** Faceted fragments double as stone, ice and magic crystals. */
function crystal(ctx: Ctx, x: number, y: number, r: number, angle: number, colors: Palette, length = 2.4) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  ctx.fillStyle = colors[0]; ctx.beginPath(); ctx.moveTo(0, -r * length)
  ctx.lineTo(r, -r * .2); ctx.lineTo(r * .65, r); ctx.lineTo(-r * .65, r); ctx.lineTo(-r, -r * .2); ctx.closePath(); ctx.fill()
  ctx.fillStyle = colors[1]; ctx.beginPath(); ctx.moveTo(0, -r * length); ctx.lineTo(r, -r * .2); ctx.lineTo(0, r * .72); ctx.closePath(); ctx.fill()
  ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.moveTo(0, -r * length); ctx.lineTo(0, r * .72); ctx.lineTo(-r * .65, -r * .05); ctx.closePath(); ctx.fill()
  ctx.restore()
}

function debris(ctx: Ctx, x: number, y: number, s: number, p: number, colors: Palette, count = 7) {
  ctx.save(); ctx.globalAlpha *= 1 - smooth((p - .62) / .38)
  for (let i = 0; i < count; i++) {
    const a = i * 2.399 + .4, distance = s * (.15 + noise(i) * .48) * Math.sin(p * Math.PI * .65)
    crystal(ctx, x + Math.cos(a) * distance, y + Math.sin(a) * distance * .6 + p * p * s * .22,
      s * (.016 + noise(i + 8) * .018), a + p * 3, colors, 1.3)
  }
  ctx.restore()
}

function impact(ctx: Ctx, x: number, y: number, s: number, p: number, colors: Palette) {
  const burst = Math.sin(clamp(p * 1.45) * Math.PI)
  glow(ctx, x, y, s * (.18 + p * .42), colors[1], burst * .45)
  for (let k = 0; k < 3; k++) crescent(ctx, x, y, s * (.14 + p * .36), k * TAU / 3 + p * .4, colors, burst * .7)
  debris(ctx, x, y, s, p, colors)
}

/** Tongues of fire have a dark outer body, orange/blue middle and a hot core. */
function flame(ctx: Ctx, x: number, y: number, r: number, angle: number, phase: number, colors: Palette) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  const bend = Math.sin(phase) * r * .6
  for (let layer = 0; layer < 3; layer++) {
    const k = 1 - layer * .27
    ctx.save(); ctx.scale(k, k); ctx.fillStyle = colors[layer]
    ctx.beginPath(); ctx.moveTo(-r * .48, r * .38)
    ctx.bezierCurveTo(-r * 1.08, -r * .25, -r * .2 + bend, -r * 1.45, bend, -r * 2.65)
    ctx.bezierCurveTo(r * .9 + bend, -r * 1.45, r * .1, -r * .75, r * .72, -r * 1.12)
    ctx.bezierCurveTo(r * 1.02, -.1 * r, r * .56, r * .6, -r * .48, r * .38)
    ctx.fill(); ctx.restore()
  }
  ctx.restore()
}

function breath(ctx: Ctx, x: number, y: number, s: number, p: number, colors: Palette, direction: number) {
  const reach = s * (1.05 + smooth(p / .28) * .5)
  ctx.save(); ctx.translate(x, y); ctx.scale(direction, 1)
  glow(ctx, reach * .45, 0, reach * .65, colors[1], .26, .45)
  // Continuous tapered body prevents isolated flames from reading as particles.
  ctx.fillStyle = gradient(ctx, reach, s * .15, 0, 0, colors)
  ctx.beginPath(); ctx.moveTo(0, -s * .035)
  ctx.bezierCurveTo(reach * .3, -s * .11, reach * .65, -s * .32, reach, -s * .12)
  ctx.bezierCurveTo(reach * .82, s * .27, reach * .3, s * .15, 0, s * .035); ctx.fill()
  for (let i = 0; i < 14; i++) {
    const q = (i / 14 + p * 1.8) % 1
    const spread = s * (.018 + q * .14)
    flame(ctx, q * reach, Math.sin(i * 2.3 + p * 12) * spread, s * (.035 + q * .065), Math.PI / 2, i + p * 16, colors)
  }
  smoke(ctx, reach * .9, -s * .1, s * .22, p, colors[0], 5)
  ctx.restore()
}

function shield(ctx: Ctx, x: number, y: number, s: number, p: number) {
  const r = s * (.33 + Math.sin(p * Math.PI) * .045)
  glow(ctx, x, y, r * 1.8, ICE[1], .35)
  ctx.save(); ctx.translate(x, y)
  for (let k = 0; k < 3; k++) {
    const scale = 1 - k * .13
    ctx.save(); ctx.scale(scale, scale)
    ctx.fillStyle = k === 0 ? gradient(ctx, -r, -r, r, r, GOLD) : k === 1 ? '#183e7ddb' : gradient(ctx, -r, r, r, -r, ICE)
    ctx.globalAlpha *= k === 2 ? .62 : .94
    ctx.beginPath(); ctx.moveTo(0, -r * 1.2); ctx.lineTo(r * .83, -r * .68)
    ctx.bezierCurveTo(r * .86, r * .38, r * .45, r * .83, 0, r * 1.2)
    ctx.bezierCurveTo(-r * .45, r * .83, -r * .86, r * .38, -r * .83, -r * .68); ctx.closePath(); ctx.fill(); ctx.restore()
  }
  crystal(ctx, 0, -r * .12, r * .16, 0, GOLD, 2)
  // A broad travelling reflection on the shield face.
  crescent(ctx, 0, 0, r * .72, -.6 + p * .7, ICE, .5)
  ctx.restore()
}

function portal(ctx: Ctx, x: number, y: number, s: number, p: number, colors: Palette, flat = false) {
  const r = s * (.2 + Math.sin(p * Math.PI) * .28)
  ctx.save(); ctx.translate(x, y); ctx.scale(1, flat ? .38 : .82)
  glow(ctx, 0, 0, r * 1.55, colors[1], .35)
  ctx.fillStyle = gradient(ctx, -r, -r, r, r, [colors[0], '#100e25', '#060816'])
  ctx.beginPath(); ctx.ellipse(0, 0, r * .8, r * .8, 0, 0, TAU); ctx.fill()
  for (let i = 0; i < 5; i++) {
    crescent(ctx, 0, 0, r * (1 - i * .09), p * 3 + i * 1.6, colors, .78 - i * .1)
  }
  ctx.restore()
}

function ghost(ctx: Ctx, x: number, y: number, r: number, angle: number, colors: Palette) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  ctx.fillStyle = gradient(ctx, 0, r * 2, 0, -r, colors)
  ctx.beginPath(); ctx.moveTo(-r * .7, 0)
  ctx.bezierCurveTo(-r * 1.2, -r * 1.65, r * 1.2, -r * 1.65, r * .7, 0)
  ctx.bezierCurveTo(r * .2, r, r, r * 1.4, 0, r * 2.2)
  ctx.bezierCurveTo(r * .2, r, -r * .9, r * .9, -r * .7, 0); ctx.fill()
  ctx.fillStyle = colors[0]
  for (const dir of [-1, 1]) { ctx.beginPath(); ctx.ellipse(dir * r * .28, -r * .3, r * .15, r * .24, dir * .25, 0, TAU); ctx.fill() }
  ctx.restore()
}

function leaf(ctx: Ctx, x: number, y: number, r: number, angle: number, colors: Palette) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  ctx.fillStyle = gradient(ctx, -r, r, r, -r, colors)
  ctx.beginPath(); ctx.moveTo(0, r); ctx.bezierCurveTo(-r * 1.4, r * .2, -r * .3, -r, 0, -r * 1.8)
  ctx.bezierCurveTo(r * 1.1, -r * .6, r * .8, r * .7, 0, r); ctx.fill()
  ctx.fillStyle = colors[2]; ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(-r * .16, -r * .4, 0, -r * 1.8); ctx.quadraticCurveTo(r * .2, -r * .2, 0, r); ctx.fill()
  ctx.restore()
}

function lightning(ctx: Ctx, x: number, y: number, s: number, p: number, colors: Palette) {
  const strike = smooth(p / .16), seed = Math.floor(p * 9)
  glow(ctx, x, y, s * .48, colors[1], .36)
  // Filled zig-zag ribbons with a broad ionised sheath and narrow luminous core.
  for (let layer = 0; layer < 3; layer++) {
    const thickness = s * [.08, .034, .012][layer]
    ctx.fillStyle = colors[layer]; ctx.globalAlpha *= layer === 0 ? .65 : 1
    ctx.beginPath()
    for (let j = 0; j <= 7; j++) {
      const xx = x + (noise(j + seed * 7) - .5) * s * .3
      const yy = y - s * .88 + j / 7 * s * .88 * strike
      if (!j) ctx.moveTo(xx - thickness, yy); else ctx.lineTo(xx - thickness, yy)
    }
    for (let j = 7; j >= 0; j--) ctx.lineTo(x + (noise(j + seed * 7) - .5) * s * .3 + thickness, y - s * .88 + j / 7 * s * .88 * strike)
    ctx.closePath(); ctx.fill()
  }
  impact(ctx, x, y, s * .65, p, colors)
  smoke(ctx, x, y, s * .3, p, colors[0], 5)
}

export type QuestVfxOptions = { bossId?: string }

/** Stateless, bounded Canvas VFX. Progress alone determines the frame: no timers,
 * random calls, image allocations or changes to combat state. Saves/restores all
 * Canvas state and clips to the field so effects cannot cover the party/result UI. */
export function paintQuestEffect(
  ctx: Ctx, w: number, h: number, rawEffect: QuestEffect | undefined,
  age: number, duration: number, cx: number, cy: number, size: number, options: QuestVfxOptions = {},
) {
  if (!rawEffect || ![w, h, age, duration, cx, cy, size].every(Number.isFinite) || w <= 0 || h <= 0 || size <= 0 || duration <= 0 || age <= 0 || age >= duration) return
  const effect = normalizeEffect(rawEffect), p = age / duration, s = size
  const alpha = smooth(p / .1) * (1 - smooth((p - .68) / .32))
  ctx.save()
  try {
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); ctx.globalAlpha *= alpha
    // Keep the character's pixelated image separate from smoothly shaded VFX.
    ctx.globalCompositeOperation = 'source-over'
    switch (effect) {
      case 'slash': {
        const claw = options.bossId === 'demon'
        const count = claw ? 3 : 2
        for (let i = 0; i < count; i++) {
          const q = clamp((p - i * .09) / .7)
          crescent(ctx, cx + (claw ? (i - 1) * s * .1 : 0), cy, s * (.25 + smooth(q) * .3),
            -.7 + q * 1.25 + (claw ? 0 : i * 2.5), claw ? FIRE : ICE, Math.sin(q * Math.PI))
        }
        impact(ctx, cx, cy + s * .08, s * .5, p, claw ? FIRE : ICE)
        break
      }
      case 'bite_impact': {
        const close = smooth(p / .32), r = s * .29
        glow(ctx, cx, cy, s * .48, '#ffc28a', .25)
        for (const dir of [-1, 1]) {
          ctx.save(); ctx.translate(cx, cy + dir * s * (.3 - close * .24)); ctx.scale(1, -dir)
          crescent(ctx, 0, r * .1, r * 1.05, 0, FIRE, .6)
          for (let i = 0; i < 5; i++) crystal(ctx, (i - 2) * r * .32, Math.abs(i - 2) * r * .09, r * .13, Math.PI + (i - 2) * .1, ['#a56944', '#f7d6a0', '#fff8df'], 2.8)
          ctx.restore()
        }
        if (p > .25) impact(ctx, cx, cy, s * .8, (p - .25) / .75, GOLD)
        break
      }
      case 'fire_breath':
        // The adopted dragon faces right: the flame starts at its open mouth.
        breath(ctx, cx + s * .24, cy - s * .19, s * .8, p, FIRE, 1); break
      case 'blue_flame':
        breath(ctx, cx - s * .05, cy - s * .09, s * .75, p, BLUE, -1); break
      case 'dark_bolt':
        cloud(ctx, cx, cy - s * .6, s * .37, 6, VOID[0], .8)
        lightning(ctx, cx - s * .25, cy + s * .3, s, p, VOID); break
      case 'thunder_storm':
        for (let i = 0; i < 3; i++) {
          const x = cx + (i - 1) * s * .38
          cloud(ctx, x, cy - s * .55, s * .32, i + 15, '#293857', .85)
          ctx.save(); ctx.globalAlpha *= .75; lightning(ctx, x, cy + s * .28, s * .84, clamp((p - i * .08) / .84), GOLD); ctx.restore()
        }
        break
      case 'dark_wave':
      case 'curse_wave': {
        portal(ctx, cx, cy + s * .16, s, p, VOID, true)
        for (let i = 0; i < 7; i++) {
          const q = (p + i / 7) % 1, a = i * 2.4 + p
          const x = cx + Math.cos(a) * s * (.2 + q * .6), y = cy + Math.sin(a) * s * .25 - q * s * .2
          if (effect === 'curse_wave') ghost(ctx, x, y, s * (.055 + q * .04), a * .25, VOID)
          else cloud(ctx, x, y, s * (.17 + q * .13), i, VOID[1], (1 - q) * .65)
        }
        break
      }
      case 'shockwave':
      case 'charge_impact': {
        const x = effect === 'charge_impact' ? cx - smooth(p / .4) * s * .45 : cx, y = cy + s * .37
        ctx.save(); ctx.translate(x, y); ctx.scale(1, .35)
        for (let i = 0; i < 3; i++) crescent(ctx, 0, 0, s * (.23 + p * .95), i * 2.1, GOLD, .8)
        ctx.restore(); smoke(ctx, x, y, s * .55, p, '#bc9d7a'); debris(ctx, x, y, s * 1.2, p, ['#493b45', '#8e7b83', '#c5aea1'], 10)
        if (effect === 'charge_impact') crescent(ctx, x, cy, s * .48, -Math.PI / 2, ICE, .75)
        break
      }
      case 'shield_flash': shield(ctx, cx - s * .12, cy + s * .05, s, p); break
      case 'tentacle_slam': {
        const slam = smooth(p / .32), ground = cy + s * .4
        smoke(ctx, cx, ground, s * .46, p, '#957b99')
        for (let i = 0; i < 3; i++) {
          const x = cx + (i - 1) * s * .25, endX = x - s * (.22 + i * .06), endY = ground - (1 - slam) * s * .5
          ctx.fillStyle = gradient(ctx, x, cy, endX, endY, ['#432451', '#9e57b2', '#edabd7'])
          ctx.beginPath(); ctx.moveTo(x - s * .07, cy + s * .15)
          ctx.bezierCurveTo(x - s * .35, cy - s * .38, endX - s * .24, endY - s * .3, endX, endY)
          ctx.bezierCurveTo(endX + s * .13, endY + s * .07, x + s * .04, cy - s * .2, x + s * .065, cy + s * .15); ctx.closePath(); ctx.fill()
          for (let k = 0; k < 4; k++) {
            ctx.fillStyle = '#ecc0d9'; ctx.beginPath(); ctx.ellipse(endX + k * s * .035, endY - k * s * .036, s * .019, s * .011, -.7, 0, TAU); ctx.fill()
          }
        }
        debris(ctx, cx - s * .2, ground, s, p, VOID); break
      }
      case 'void_burst':
        portal(ctx, cx, cy - s * .05, s * (1.1 - p * .4), p, VOID)
        impact(ctx, cx, cy - s * .05, s * 1.35, p, VOID); break
      case 'eldritch_spell':
        portal(ctx, cx, cy + s * .3, s * 1.2, p, JADE, true)
        for (let i = 0; i < 5; i++) {
          const a = i * TAU / 5 + p * 2
          ghost(ctx, cx + Math.cos(a) * s * .35, cy + s * .15 - Math.sin(p * Math.PI) * s * (.3 + i * .09), s * .075, Math.sin(a) * .3, i % 2 ? JADE : VOID)
        }
        break
      case 'ally_shot':
      case 'arcane_missile':
      case 'ally_toss': {
        const count = effect === 'arcane_missile' ? 3 : 1, colors = effect === 'arcane_missile' ? VOID : GOLD
        for (let i = 0; i < count; i++) {
          const q = smooth((p - i * .06) / .65), x0 = Math.max(s * .1, cx - s * 1.1), y0 = cy + s * .35
          const x = x0 + (cx - x0) * q, y = y0 + (cy - y0) * q - Math.sin(q * Math.PI) * s * (effect === 'ally_toss' ? .65 : .16 + i * .16)
          if (q < 1) {
            glow(ctx, x, y, s * .22, colors[1], .45)
            if (effect === 'ally_toss') crystal(ctx, x, y, s * .075, p * 9, colors, 1.5)
            else flame(ctx, x, y, s * .068, -Math.PI / 2 - .22, p * 12 + i, colors)
          }
          if (p > .45 + i * .06) impact(ctx, cx, cy, s * .7, clamp((p - .45 - i * .06) / .5), colors)
        }
        break
      }
      case 'ally_heal':
      case 'ally_cheer': {
        const colors: Palette = effect === 'ally_heal' ? JADE : ['#9e3774', '#f18bb5', '#ffedcf']
        const x = Math.max(s * .25, cx - s * .9), y = cy + s * .25
        glow(ctx, x, y, s * .65, colors[1], .26)
        for (let i = 0; i < 9; i++) {
          const q = (p * .75 + i / 9) % 1, angle = i * 2.399 + p * 2
          leaf(ctx, x + Math.sin(angle) * s * (.12 + q * .22), y - q * s * .85, s * (.024 + Math.sin(q * Math.PI) * .025), angle, colors)
        }
        for (let i = 0; i < 3; i++) crescent(ctx, x, y - p * s * .3, s * (.18 + i * .085), p * 2 + i * 2, colors, .48)
        break
      }
      case 'ice_lance':
      case 'frost_nova': {
        const count = effect === 'ice_lance' ? 3 : 9, rise = smooth(p / .38)
        glow(ctx, cx, cy, s * .75, ICE[1], .26)
        for (let i = 0; i < count; i++) {
          const a = effect === 'ice_lance' ? -.6 : i * TAU / count
          const x = effect === 'ice_lance' ? cx + (i - 1) * s * .17 - (1 - rise) * s * .5 : cx + Math.sin(a) * s * .25 * rise
          const y = effect === 'ice_lance' ? cy + (i - 1) * s * .06 : cy + Math.cos(a) * s * .2 * rise
          crystal(ctx, x, y, s * (.055 + rise * .04), a, ICE, effect === 'ice_lance' ? 4 : 3)
        }
        smoke(ctx, cx, cy + s * .3, s * .4, p, '#abdfeb'); debris(ctx, cx, cy, s, p, ICE); break
      }
      case 'meteor': {
        const q = smooth(p / .48), x = cx + (1 - q) * s * .8, y = cy - (1 - q) * s * 1.2
        if (p < .55) {
          flame(ctx, x, y, s * .22, .6, p * 14, FIRE)
          crystal(ctx, x, y + s * .03, s * .13, -.5, ['#453642', '#9f5146', '#ffac61'], 1.4)
        }
        if (p > .36) { const hit = (p - .36) / .64; impact(ctx, cx, cy + s * .1, s * 1.4, hit, FIRE); smoke(ctx, cx, cy + s * .25, s * .65, hit, '#766074') }
        break
      }
      case 'poison_mist':
        portal(ctx, cx, cy + s * .35, s, p, ['#28482f', '#a0c83d', '#efff98'], true)
        for (let i = 0; i < 9; i++) cloud(ctx, cx + Math.sin(i * 2.4) * s * .4, cy + s * .25 - ((p + i / 9) % 1) * s * .65, s * (.16 + noise(i) * .14), i, i % 2 ? '#658e43' : '#a1b958', .56)
        break
      case 'water_surge':
      case 'wind_vortex': {
        const water = effect === 'water_surge', colors = water ? ICE : JADE
        for (let i = 0; i < 5; i++) {
          const y = cy + s * .35 - i * s * .14, r = s * (.22 + i * .055)
          ctx.save(); ctx.translate(cx + Math.sin(p * 5 + i) * s * .08, y); ctx.scale(1, water ? .55 : .4)
          crescent(ctx, 0, 0, r, p * 5 + i * .9, colors, .7); ctx.restore()
          if (water) cloud(ctx, cx + Math.cos(i + p * 5) * r, y, s * .1, i, '#d4f5ff', .48)
          else leaf(ctx, cx + Math.cos(i + p * 6) * r, y, s * .04, p * 6 + i, JADE)
        }
        break
      }
      case 'earth_spike': {
        const rise = smooth(p / .32), colors: Palette = ['#493f4e', '#9b7861', '#dec197']
        smoke(ctx, cx, cy + s * .4, s * .62, p, '#9e8778')
        for (let i = 0; i < 5; i++) crystal(ctx, cx + (i - 2) * s * .14, cy + s * .4, s * (.065 + noise(i) * .035) * rise, (i - 2) * .16, colors, 3 + noise(i + 1) * 2)
        debris(ctx, cx, cy + s * .35, s * 1.2, p, colors); break
      }
      case 'holy_nova':
      case 'phoenix_flare': {
        const colors = effect === 'holy_nova' ? GOLD : FIRE, open = smooth(p / .32)
        glow(ctx, cx, cy, s * .8, colors[1], .36)
        for (const dir of [-1, 1]) for (let i = 0; i < 6; i++) {
          const a = dir * (.35 + i * .19) * open
          leaf(ctx, cx + dir * i * s * .06 * open, cy - s * .04 + i * s * .026, s * (.16 - i * .014), a, colors)
        }
        if (effect === 'phoenix_flare') flame(ctx, cx, cy + s * .1, s * .11, Math.PI, p * 8, FIRE)
        else crystal(ctx, cx, cy, s * .09, 0, GOLD, 2.8)
        break
      }
      case 'soul_drain':
        for (let i = 0; i < 5; i++) {
          const q = (p + i * .16) % 1, a = q * Math.PI * 1.3 + i
          ghost(ctx, cx - s * (1 - q), cy + Math.sin(a) * s * .28, s * (.04 + (1 - q) * .045), -Math.PI / 2, JADE)
        }
        portal(ctx, cx, cy, s * .6, p, VOID); break
      default: { const exhaustive: never = effect; return exhaustive }
    }
  } finally { ctx.restore() }
}

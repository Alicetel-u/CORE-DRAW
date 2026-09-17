/** Skill-specific silhouettes: no common projectile substitutes for the skill. */
export const ALLY_SKILL_VFX = {
  rocket_fist: { label: 'げんこつロケット', family: '味方', boss: 'knight', pose: 'attack' },
  starlight_beam: { label: 'きらきらビーム', family: '味方', boss: 'dark-lord', pose: 'special' },
  root_upheaval: { label: 'ねっこぬき', family: '味方', boss: 'abomination', pose: 'attack' },
  healing_bandage: { label: 'ばんそうこう', family: '味方', boss: 'knight', pose: 'special' },
  rally_call: { label: 'おうえんコール', family: '味方', boss: 'dragon', pose: 'special' },
  surprise_box: { label: 'びっくりばこ', family: '味方', boss: 'demon', pose: 'attack' },
  sugar_stars: { label: 'こんぺいとう', family: '味方', boss: 'abomination', pose: 'attack' },
  rhythm_dance: { label: 'ぐるぐるダンス', family: '味方', boss: 'dragon', pose: 'special' },
  lucky_coin: { label: 'ラッキーコイン', family: '味方', boss: 'knight', pose: 'attack' },
  spinning_strike: { label: 'スーパースピン', family: '味方', boss: 'demon', pose: 'attack' },
  water_cannon: { label: 'てっぽうみず', family: '味方', boss: 'dragon', pose: 'attack' },
  sleepy_dream: { label: 'ひるねアタック', family: '味方', boss: 'abomination', pose: 'special' },
} as const
export type AllySkillEffect = keyof typeof ALLY_SKILL_VFX
export function isAllySkillEffect(id: string): id is AllySkillEffect { return Object.hasOwn(ALLY_SKILL_VFX, id) }
export const SUPPORT_EFFECTS = new Set<string>(['healing_bandage', 'rally_call', 'rhythm_dance', 'lucky_coin', 'sleepy_dream', 'ally_heal', 'ally_cheer'])
/** Contact timing within each visual, used for the boss flash/shake only. */
export const ALLY_IMPACT_START: Partial<Record<AllySkillEffect, number>> = {
  rocket_fist: .48, starlight_beam: .24, root_upheaval: .32, surprise_box: .4,
  sugar_stars: .6, spinning_strike: .5, water_cannon: .24,
}
type Ctx = CanvasRenderingContext2D
const TAU = Math.PI * 2
const clamp = (p: number) => Math.max(0, Math.min(1, p))
const ease = (p: number) => { const q = clamp(p); return q * q * (3 - 2 * q) }
function polygon(ctx: Ctx, points: number[][], color: string | CanvasGradient) {
  ctx.fillStyle = color; ctx.beginPath(); points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill()
}
function shade(ctx: Ctx, x: number, y: number, r: number, colors: string[]) {
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
  colors.forEach((color, i) => g.addColorStop(i / (colors.length - 1), color)); return g
}
function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string | CanvasGradient, angle = 0) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), angle, 0, TAU); ctx.fill()
}
function soft(ctx: Ctx, x: number, y: number, r: number, color: string, alpha = .5) {
  ctx.save(); ctx.globalAlpha *= alpha
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color + 'b0'); g.addColorStop(.35, color + '50'); g.addColorStop(1, color + '00')
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore()
}
function rounded(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, color: string | CanvasGradient) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill()
}
function sweet(ctx: Ctx, x: number, y: number, r: number, spin: number, light: string, dark: string, tips = 7) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin)
  const points = Array.from({ length: tips * 2 }, (_, i) => { const a = i / tips * Math.PI, d = r * (i % 2 ? .7 : 1); return [Math.cos(a) * d, Math.sin(a) * d] })
  polygon(ctx, points, shade(ctx, 0, 0, r, ['#fff5df', light, dark]))
  polygon(ctx, [[-r * .45, -r * .24], [-r * .03, -r * .65], [r * .3, -r * .26], [-r * .05, r * .13]], '#ffffffa0'); ctx.restore()
}
function ribbon(ctx: Ctx, x: number, y: number, r: number, spin: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin)
  ctx.fillStyle = shade(ctx, 0, 0, r, [color + '00', color, '#fff9dc'])
  ctx.beginPath(); ctx.moveTo(-r, r * .3); ctx.bezierCurveTo(-r * .6, -r * .85, r * .8, -r * .72, r, r * .2)
  ctx.bezierCurveTo(r * .48, -r * .34, -r * .4, -r * .27, -r, r * .3); ctx.fill(); ctx.restore()
}
function note(ctx: Ctx, x: number, y: number, r: number, angle: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); oval(ctx, -r * .25, r * .4, r * .48, r * .32, color, -.4)
  polygon(ctx, [[0, r * .35], [0, -r], [r * .85, -r * .72], [r * .7, -r * .2], [r * .2, -r * .55], [r * .2, r * .35]], color); ctx.restore()
}
function impact(ctx: Ctx, x: number, y: number, s: number, p: number, color: string) {
  ctx.save(); ctx.globalAlpha *= Math.sin(clamp(p) * Math.PI); soft(ctx, x, y, s * (.25 + p * .25), color)
  for (let i = 0; i < 3; i++) ribbon(ctx, x, y, s * (.12 + p * .34), i * 2.1 + p, color)
  ctx.restore()
}
function glove(ctx: Ctx, x: number, y: number, r: number, angle: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  rounded(ctx, -r * .86, -r * .45, r * 1.05, r * .92, r * .18, '#273e74'); rounded(ctx, -r * .67, -r * .4, r * .83, r * .78, r * .16, '#6d93d2')
  rounded(ctx, -r * .27, -r * .62, r * 1.08, r * 1.08, r * .24, shade(ctx, 0, 0, r, ['#fff2b9', '#e9ac66', '#a6604a']))
  for (let i = 0; i < 4; i++) rounded(ctx, r * .18, -r * .63 + i * r * .26, r * .72, r * .22, r * .08, i < 2 ? '#ffdf9a' : '#e8af71')
  rounded(ctx, -r * .16, r * .06, r * .7, r * .42, r * .16, '#ffc882')
  polygon(ctx, [[-.18 * r, .15 * r], [.37 * r, .15 * r], [.25 * r, .24 * r], [-.12 * r, .24 * r]], '#fff0b8'); ctx.restore()
}
function bandage(ctx: Ctx, x: number, y: number, r: number, angle: number) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
  rounded(ctx, -r, -r * .32, r * 2, r * .64, r * .24, shade(ctx, 0, 0, r, ['#fff1d2', '#edc999', '#bf946d']))
  rounded(ctx, -r * .35, -r * .26, r * .7, r * .52, r * .06, '#fffbeb')
  rounded(ctx, -r * .07, -r * .2, r * .14, r * .4, 1, '#ea7c89'); rounded(ctx, -r * .2, -r * .07, r * .4, r * .14, 1, '#ea7c89')
  for (const dir of [-1, 1]) for (let i = 0; i < 3; i++) oval(ctx, dir * r * (.52 + i * .12), 0, r * .027, r * .065, '#b28e6c')
  ctx.restore()
}
function shoe(ctx: Ctx, x: number, y: number, r: number, angle: number, color: string) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.fillStyle = shade(ctx, 0, 0, r, ['#f9e6c8', color, '#342c52'])
  ctx.beginPath(); ctx.moveTo(-r * .5, -r); ctx.lineTo(r * .1, -r)
  ctx.bezierCurveTo(r * .16, -r * .1, r * .9, -r * .15, r * .9, r * .35); ctx.quadraticCurveTo(r * .7, r * .62, -r * .5, r * .4); ctx.closePath(); ctx.fill()
  rounded(ctx, -r * .53, r * .28, r * 1.44, r * .18, r * .07, '#fff0cb'); ctx.restore()
}

/** Called inside the clipped, alpha-enveloped parent renderer. */
export function paintAllySkill(ctx: Ctx, effect: AllySkillEffect, p: number, cx: number, cy: number, s: number) {
  const left = Math.max(s * .25, cx - s * .95), floor = cy + s * .36
  switch (effect) {
    case 'rocket_fist': {
      const q = ease(p / .58), x = left + (cx - left) * q, y = cy + s * .15 * (1 - q)
      if (p < .73) {
        ctx.save(); ctx.globalAlpha *= 1 - ease((p - .58) / .15); soft(ctx, x - s * .12, y, s * .32, '#ffa45b')
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = ['#df5238', '#ffa441', '#fff0b0'][i]; ctx.beginPath(); ctx.moveTo(x - s * .08, y - s * (.085 - i * .018))
          ctx.quadraticCurveTo(x - s * .46, y - s * .14, x - s * (.62 - i * .1), y)
          ctx.quadraticCurveTo(x - s * .44, y + s * .14, x - s * .08, y + s * (.085 - i * .018)); ctx.fill()
        }
        glove(ctx, x, y, s * .18, -.1); ctx.restore()
      }
      if (p > .48) impact(ctx, cx + s * .05, cy, s, (p - .48) / .52, '#ffd490'); break
    }
    case 'starlight_beam': {
      const q = ease(p / .26), r = s * (.035 + Math.sin(p * Math.PI) * .1), end = left + (cx + s * .28 - left) * q
      soft(ctx, left, cy, s * .4, '#ffe5a8', .7)
      polygon(ctx, [[left, cy - r * .55], [end, cy - r], [end + s * .05, cy], [end, cy + r], [left, cy + r * .55]], shade(ctx, cx, cy, s * .5, ['#b173f900', '#bba4ffbb', '#fff2c2']))
      polygon(ctx, [[left, cy - r * .18], [end, cy - r * .32], [end + s * .08, cy], [end, cy + r * .32], [left, cy + r * .18]], '#fff9e7')
      sweet(ctx, left, cy, s * .13, p * 2, '#e7c9ff', '#8054b2', 4)
      if (q > .7) { sweet(ctx, end, cy, s * (.1 + p * .09), -p, '#fff2ab', '#d39c69', 4); soft(ctx, end, cy, s * .32, '#ffe8ae') }; break
    }
    case 'root_upheaval': {
      const growth = ease(p / .32), pull = ease((p - .32) / .5)
      for (let i = 0; i < 5; i++) {
        const x = cx + (i - 2) * s * .13, y = floor - pull * s * (.34 + i % 2 * .1), height = s * (.23 + i % 3 * .1) * growth
        ctx.fillStyle = shade(ctx, x, y - height * .5, s * .16, ['#d1b873', '#8c6745', '#453d32'])
        ctx.beginPath(); ctx.moveTo(x - s * .07, y + s * .12)
        ctx.bezierCurveTo(x - s * .17, y - height * .25, x + s * .2, y - height * .7, x + s * .02, y - height)
        ctx.bezierCurveTo(x - s * .1, y - height * .55, x + s * .02, y - height * .2, x + s * .07, y + s * .12); ctx.closePath(); ctx.fill()
        for (const dir of [-1, 1]) {
          polygon(ctx, [[x, y - height * .6], [x + dir * s * .16, y - height * .8], [x + dir * s * .11, y - height * .45]], dir < 0 ? '#4c955c' : '#9ec779')
          polygon(ctx, [[x, y + s * .03], [x + dir * s * .17, y + s * .16], [x + dir * s * .04, y - s * .03]], '#8c6947')
        }
      }
      for (let i = 0; i < 7; i++) { const x = cx + Math.cos(i * 2.4) * s * (.16 + p * .43), y = floor - Math.sin(p * Math.PI) * s * (.1 + i % 3 * .08); polygon(ctx, [[x, y - s * .035], [x + s * .045, y], [x + s * .025, y + s * .038], [x - s * .04, y + s * .02]], i % 2 ? '#967052' : '#c4a072') }; break
    }
    case 'healing_bandage': {
      const y = cy + s * .1 - p * s * .18, r = s * (.15 + ease(p / .22) * .08)
      soft(ctx, left, y, s * .48, '#8cf2b9', .55); bandage(ctx, left, y, r, -.65); bandage(ctx, left, y, r, .65)
      for (let i = 0; i < 3; i++) ribbon(ctx, left, floor - p * s * .24, s * (.18 + i * .055), p * 2 + i * 2.1, '#a5edb8'); break
    }
    case 'rally_call': {
      const r = s * .2, x = left, y = cy + s * .04
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.18 + Math.sin(p * 12) * .04)
      rounded(ctx, -r * .25, r * .16, r * .3, r * .66, r * .08, '#5c4c91')
      polygon(ctx, [[-r * .7, -r * .32], [r * .64, -r * .86], [r * .64, r * .86], [-r * .7, r * .32]], shade(ctx, 0, 0, r, ['#fff4bd', '#eebc73', '#c27a52']))
      oval(ctx, r * .63, 0, r * .22, r * .88, '#ffe3b1'); oval(ctx, r * .64, 0, r * .14, r * .62, '#7e4970'); ctx.restore()
      for (let i = 0; i < 3; i++) { const q = (p + i * .24) % 1; ctx.save(); ctx.globalAlpha *= (1 - q) * .65; ribbon(ctx, x + s * (.28 + q * .8), y, s * (.18 + q * .24), Math.PI / 2, '#ffd19c'); ctx.restore() }
      note(ctx, x + s * .2, y - s * .27 - p * s * .12, s * .07, -.2, '#ffd593'); break
    }
    case 'surprise_box': {
      const q = ease(p / .28), x = left + (cx - left) * q, y = floor - Math.sin(q * Math.PI) * s * .35, r = s * .15, open = ease((p - .26) / .2)
      ctx.save(); ctx.translate(x, y)
      polygon(ctx, [[-r, -r * .65], [r * .65, -r * .65], [r * .65, r], [-r, r]], shade(ctx, 0, 0, r, ['#cc73b2', '#8c477e', '#552c64']))
      polygon(ctx, [[r * .65, -r * .65], [r, -r], [r, r * .65], [r * .65, r]], '#663769'); rounded(ctx, -r * .27, -r * .65, r * .33, r * 1.65, 1, '#f6cf80')
      ctx.save(); ctx.translate(-r, -r * .65); ctx.rotate(-open * 1.15); rounded(ctx, 0, -r * .22, r * 1.85, r * .3, r * .05, '#e4a879'); rounded(ctx, r * .74, -r * .25, r * .32, r * .35, 1, '#ffe7a1'); ctx.restore()
      if (open > 0) { const headY = -r * .65 - open * s * .36
        for (let i = 0; i < 4; i++) oval(ctx, -r * .1, headY + i * open * s * .078, r * .36, r * .1, i % 2 ? '#e5dd9c' : '#86719b')
        sweet(ctx, -r * .1, headY - r * .35, r * .88, p * 3, '#ffe09f', '#db866f', 5)
        oval(ctx, -r * .37, headY - r * .4, r * .08, r * .12, '#593659'); oval(ctx, r * .13, headY - r * .4, r * .08, r * .12, '#593659')
      }
      ctx.restore(); if (p > .4) impact(ctx, x, y - s * .35, s * .65, (p - .4) / .6, '#f5b2d1'); break
    }
    case 'sugar_stars': {
      const colors = [['#ffd6e8', '#d278a5'], ['#b9f0ee', '#5b9da8'], ['#ffe6a1', '#c29556']]
      for (let i = 0; i < 3; i++) { const q = ease((p - i * .08) / .68), x = left + (cx - left) * q, y = floor - q * s * .3 - Math.sin(q * Math.PI) * s * (.42 + i * .13)
        sweet(ctx, x, y, s * (.07 + i * .016), p * 5 + i, colors[i][0], colors[i][1], 9)
        if (q > .9) impact(ctx, cx, cy + (i - 1) * s * .1, s * .42, (q - .9) * 10, colors[i][0])
      }; break
    }
    case 'rhythm_dance': {
      const x = left + s * .13, y = floor - s * .13; soft(ctx, x, y, s * .4, '#f1add5', .35)
      for (let i = 0; i < 2; i++) { const a = p * TAU * 1.4 + i * Math.PI; shoe(ctx, x + Math.cos(a) * s * .14, y + Math.sin(a) * s * .11, s * .085, a * .35, i ? '#718cd1' : '#d279a9'); ribbon(ctx, x, y, s * (.28 + i * .06), a, i ? '#9ebbf1' : '#f3aed2') }
      for (let i = 0; i < 3; i++) note(ctx, x + Math.sin(p * 5 + i * 2) * s * .25, cy - s * (.14 + i * .08), s * .055, Math.sin(i + p * 8) * .3, i % 2 ? '#adcbfa' : '#ffc2df'); break
    }
    case 'lucky_coin': {
      const q = ease(p), x = left + (cx + s * .62 - left) * q, y = floor - Math.sin(q * Math.PI) * s * .9, r = s * .11
      ctx.save(); ctx.translate(x, y); ctx.rotate(p * 5); ctx.scale(.25 + Math.abs(Math.cos(p * 12)) * .75, 1)
      oval(ctx, r * .08, 0, r, r, '#a5692e'); oval(ctx, 0, 0, r, r, shade(ctx, 0, 0, r, ['#fff4bc', '#f4cc65', '#c48b38'])); oval(ctx, 0, 0, r * .77, r * .77, '#c78f3e'); oval(ctx, 0, 0, r * .66, r * .66, '#f4d787')
      sweet(ctx, 0, 0, r * .48, 0, '#fff2b1', '#c48e45', 5); ctx.restore(); break
    }
    case 'spinning_strike': {
      const x = left + (cx - left) * ease(p / .6), y = cy + s * .12
      for (let i = 0; i < 4; i++) ribbon(ctx, x, y, s * (.22 + i * .035), p * 14 + i * 1.4, i % 2 ? '#83dcd4' : '#d5f6ce')
      shoe(ctx, x + Math.cos(p * 14) * s * .22, y + Math.sin(p * 14) * s * .16, s * .1, p * 14 + Math.PI / 2, '#76ada7')
      if (p > .5) impact(ctx, cx, cy, s * .75, (p - .5) * 2, '#a6e6cf'); break
    }
    case 'water_cannon': {
      const reach = ease(p / .24), end = left + (cx + s * .12 - left) * reach, thickness = s * (.07 + Math.sin(p * Math.PI) * .06)
      ctx.fillStyle = shade(ctx, cx, cy, s * .35, ['#2566a4', '#56b9e6', '#e0fcff']); ctx.beginPath(); ctx.moveTo(left, cy + s * .18)
      ctx.bezierCurveTo(left + s * .3, cy - thickness, end - s * .2, cy + Math.sin(p * 16) * thickness, end, cy - thickness)
      ctx.quadraticCurveTo(end + s * .19, cy, end, cy + thickness)
      ctx.bezierCurveTo(end - s * .3, cy + thickness, left + s * .2, cy + s * .32, left, cy + s * .24); ctx.fill()
      for (let i = 0; i < 5; i++) { const q = (p + i * .18) % 1, a = i * 1.3 - Math.PI; ctx.save(); ctx.globalAlpha *= 1 - q; oval(ctx, end + Math.cos(a) * q * s * .3, cy + Math.sin(a) * q * s * .4, s * .025, s * .07, i % 2 ? '#a6e6fa' : '#e4fcff', a); ctx.restore() }
      ribbon(ctx, end, cy, s * .23, p * 4, '#e3faff'); break
    }
    case 'sleepy_dream': {
      const x = left + s * .12, y = floor - s * .07, r = s * .22
      ctx.save(); ctx.translate(x, y); ctx.rotate(-.12); rounded(ctx, -r, -r * .5, r * 2, r, r * .3, shade(ctx, 0, 0, r, ['#e6e9ff', '#a8b8dc', '#7385b2'])); rounded(ctx, -r * .82, -r * .33, r * 1.64, r * .62, r * .22, '#dce3fa'); ctx.restore()
      ctx.save(); ctx.translate(x - r * .35, y - r * 1.6); ctx.fillStyle = '#ffe4a0'; ctx.beginPath(); ctx.arc(0, 0, r * .5, .6, 5.2); ctx.quadraticCurveTo(-r * .24, 0, Math.cos(.6) * r * .5, Math.sin(.6) * r * .5); ctx.fill(); ctx.restore()
      ctx.font = `italic bold ${Math.max(10, s * .08)}px Georgia, serif`; ctx.fillStyle = '#c9d5ff'
      for (let i = 0; i < 3; i++) { const q = (p * .6 + i * .25) % 1; ctx.save(); ctx.globalAlpha *= 1 - q; ctx.fillText('Z', x + q * s * .28, y - s * .24 - q * s * .5); ctx.restore() }; break
    }
    default: { const exhaustive: never = effect; return exhaustive }
  }
}

type Ctx = CanvasRenderingContext2D
const clamp = (p: number) => Math.max(0, Math.min(1, p))
const smooth = (p: number) => { const q = clamp(p); return q * q * (3 - 2 * q) }
const random = (i: number) => { const n = Math.sin(i * 127.1 + 13.7) * 43758.5453; return n - Math.floor(n) }

export function defeatProgress(age: number, duration: number) { return duration > 0 ? clamp(age / duration) : 1 }
export function defeatBannerOpacity(age: number, duration: number, reduced: boolean) {
  return reduced ? 1 : smooth((defeatProgress(age, duration) - .43) / .17)
}

function halo(ctx: Ctx, x: number, y: number, rx: number, ry: number, color: string, alpha: number) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.globalAlpha *= Math.max(0, alpha)
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx)
  g.addColorStop(0, color + 'c0'); g.addColorStop(.32, color + '80'); g.addColorStop(1, color + '00')
  ctx.fillStyle = g; ctx.fillRect(-rx, -rx, rx * 2, rx * 2); ctx.restore()
}

/** Single finale, fitted to the existing boss_defeat event. No battle timers are
 * created. PNGs are only sampled, never edited. The same time gives the same image. */
export function paintQuestBossDefeat(
  ctx: Ctx, w: number, h: number, sprite: CanvasImageSource | null, silhouette: CanvasImageSource | null,
  age: number, duration: number, x: number, y: number, size: number, reduced: boolean,
) {
  if (![w, h, age, duration, x, y, size].every(Number.isFinite) || w <= 0 || h <= 0 || size <= 0 || duration <= 0 || age < 0) return
  const p = defeatProgress(age, duration), cx = x + size / 2, cy = y + size / 2
  ctx.save()
  try {
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip(); ctx.globalCompositeOperation = 'source-over'
    if (reduced) {
      if (sprite && p < .6) { ctx.globalAlpha *= 1 - p / .6; ctx.drawImage(sprite, x, y, size, size) }
      return
    }
    // Darken the arena, then let the original background return after the burst.
    ctx.fillStyle = `rgba(8,5,22,${Math.sin(p * Math.PI) * .35})`; ctx.fillRect(0, 0, w, h)
    const collapse = smooth((p - .11) / .44)
    if (sprite && p < .56) {
      ctx.save(); ctx.globalAlpha *= 1 - collapse
      ctx.drawImage(sprite, x, y, size, size); ctx.restore()
      if (silhouette) {
        ctx.save(); ctx.globalAlpha *= (1 - smooth((p - .12) / .3)) * .92
        ctx.drawImage(silhouette, x, y, size, size); ctx.restore()
      }
    }
    // Wide, irregular wisps peel from the character silhouette. No opaque squares.
    if (silhouette && p > .12 && p < .78) {
      const q = smooth((p - .12) / .66)
      for (let i = 0; i < 22; i++) {
        const a = i / 22, lift = q * size * (.18 + random(i) * .52)
        const shift = Math.sin(i * 2.4) * q * size * .23
        ctx.save(); ctx.globalAlpha *= (1 - q) * .45
        ctx.beginPath(); ctx.rect(x - size * .3, y + a * size - lift, size * 1.6, size / 22 * .8); ctx.clip()
        ctx.drawImage(silhouette, x + shift, y - lift, size, size); ctx.restore()
      }
    }
    const bloom = Math.sin(clamp((p - .03) / .73) * Math.PI)
    halo(ctx, cx, cy, size * (.25 + p * .4), size * .8, '#dab8ff', bloom * .62)
    halo(ctx, cx, cy + size * .34, size * (.28 + p * .9), size * .15, '#ffe8b2', bloom * .75)
    if (p > .13) {
      const q = clamp((p - .13) / .75)
      for (let i = 0; i < 9; i++) {
        const a = i * 2.399, r = size * (.1 + q * .46), vx = cx + Math.cos(a) * r, vy = cy + Math.sin(a) * r * .3 - q * size * (.2 + random(i) * .35)
        ctx.save(); ctx.translate(vx, vy); ctx.rotate(Math.sin(a) * .7); ctx.globalAlpha *= Math.sin(q * Math.PI) * .7
        const r1 = size * (.025 + random(i + 4) * .028)
        const g = ctx.createLinearGradient(0, r1 * 2, 0, -r1 * 3)
        g.addColorStop(0, '#d692ef00'); g.addColorStop(.5, '#c5a8ee'); g.addColorStop(1, '#fff3ce')
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, r1 * 3)
        ctx.bezierCurveTo(-r1 * 1.5, r1, -r1 * .6, -r1 * 2, 0, -r1 * 3)
        ctx.bezierCurveTo(r1 * .9, -r1, r1 * 1.1, 0, 0, r1 * 3); ctx.fill(); ctx.restore()
      }
    }
    // One smooth flash, not repeated strobing.
    const flash = .18 * Math.max(0, 1 - Math.abs(p - .15) / .1)
    if (flash > 0) { ctx.fillStyle = `rgba(255,239,209,${flash})`; ctx.fillRect(0, 0, w, h) }
  } finally { ctx.restore() }
}

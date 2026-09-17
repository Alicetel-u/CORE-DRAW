import { QUEST_VFX, paintQuestEffect, type ModernQuestEffect } from '../themes/questRaid/questRaidVfx'
import type { QuestEffect } from '../themes/questRaid/questRaidEvents'

/** Runs in a real browser Canvas; intentionally separate from game startup. */
export function verifyQuestVfx() {
  const canvas = document.createElement('canvas'); canvas.width = 360; canvas.height = 240
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const ids = Object.keys(QUEST_VFX) as ModernQuestEffect[]
  const assert = (ok: boolean, message: string) => { if (!ok) throw new Error(message) }
  const pixels = () => ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const digest = (data: Uint8ClampedArray) => { let hash = 2166136261; for (const byte of data) hash = Math.imul(hash ^ byte, 16777619); return hash }
  const render = (id: QuestEffect, age: number, duration = 1000, w = 360, h = 240) => {
    ctx.clearRect(0, 0, 360, 240)
    paintQuestEffect(ctx, w, h, id, age, duration, 180, 110, 160)
    return pixels()
  }
  let frames = 0
  const started = performance.now()
  for (const id of ids) {
    for (const age of [0, -1, 1000, 1400]) assert(render(id, age).every(v => v === 0), `${id}: effect leaks beyond its lifetime`)
    for (const duration of [0, -1, NaN, Infinity]) assert(render(id, 200, duration).every(v => v === 0), `${id}: invalid duration draws pixels`)
    const hashes = new Set<number>()
    for (const age of [80, 200, 420, 640, 880]) {
      const data = render(id, age), hash = digest(data)
      assert(data.some((v, i) => i % 4 === 3 && v > 0), `${id}: empty frame at ${age}`)
      assert(hash === digest(render(id, age)), `${id}: replay is not deterministic`)
      hashes.add(hash); frames += 2
    }
    assert(hashes.size === 5, `${id}: animation is static`)
    // Every effect restores the caller's composite, alpha, transform and style.
    ctx.save(); ctx.globalAlpha = .61; ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#123456'; ctx.translate(3, 5)
    paintQuestEffect(ctx, 360, 240, id, 400, 1000, 180, 110, 160)
    const m = ctx.getTransform()
    assert(Math.abs(ctx.globalAlpha - .61) < .001 && ctx.globalCompositeOperation === 'multiply' && ctx.fillStyle === '#123456' && m.e === 3 && m.f === 5, `${id}: Canvas state leak`)
    ctx.restore()
    const clipped = render(id, 420, 1000, 90, 80)
    assert(clipped.every((v, i) => i % 4 !== 3 || i / 4 % 360 < 90 && Math.floor(i / 4 / 360) < 80 || v === 0), `${id}: field clipping failed`)
    render(id, 420, 1000, 1, 1)
  }
  for (const [alias, id] of [['fire', 'fire_breath'], ['bolt', 'dark_bolt'], ['spell', 'eldritch_spell'], ['roar', 'shockwave']] as const) {
    assert(digest(render(alias, 420)) === digest(render(id, 420)), `${alias}: legacy replay changed`)
  }
  return `PASS: ${ids.length}種類 / ${frames}フレーム\n描画・時間変化・再生の再現性・終了時消去・境界クリップ・Canvas状態復元・旧4名称の互換性\n検証時間 ${Math.round(performance.now() - started)} ms（画素読み取りを含む）`
}

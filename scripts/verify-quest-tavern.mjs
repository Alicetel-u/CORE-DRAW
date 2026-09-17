import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
registerHooks({resolve(specifier, context, next) {
  if(specifier.startsWith('.') && context.parentURL && !/\.[a-z]+$/i.test(specifier)) {
    const url=new URL(specifier+'.ts',context.parentURL)
    if(existsSync(url))return next(url.href,context)
  }
  return next(specifier,context)
}})
const {resolveDraw}=await import('../src/core/drawEngine.ts')
const {createTavernScript}=await import('../src/themes/questRaid/tavern/questRaidTavernDirector.ts')
const {ONE_LINERS,THEMES}=await import('../src/themes/questRaid/tavern/questRaidTavernDialogue.ts')

assert.ok(THEMES.length >= 40, `themes ${THEMES.length}`)
assert.ok(ONE_LINERS.length >= 50, `one-liners ${ONE_LINERS.length}`)

const sizes = [2, 4, 8, 12, 20, 30, 50]
for (const count of sizes) {
  const groupCount = count === 2 ? 2 : Math.min(5, Math.max(2, Math.ceil(count / 4)))
  const participants = Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `参加者${i + 1}` }))
  const result = resolveDraw({ drawId: `tavern-${count}`, seed: 'fixed', mode: 'grouping', participants, groupCount })
  const script = createTavernScript(result, participants)
  assert.deepEqual(script.groups, result.groups)
  assert.equal(script.titles.length, result.groups?.length)
  const replay = createTavernScript(result, participants)
  assert.deepEqual(script, replay)
  const names = new Set(script.beats.flatMap((beat) => beat.members))
  for (const id of result.groups?.flat() ?? []) assert.ok(names.has(id), `${id} missing from tavern cards`)
  assert.ok(script.duration <= 58_000, `${count} people ran ${script.duration}ms`)
  assert.ok(script.beats.some((beat) => beat.finale))
  const other = createTavernScript({ ...result, drawId: result.drawId + '-b' }, participants)
  assert.ok(script.beats.some((beat, i) => beat.text !== other.beats[i]?.text), 'new draw kept the same gag')
  const reduced = createTavernScript(result, participants, true)
  assert.ok(reduced.duration <= script.duration)
}
const quiet = createTavernScript(resolveDraw({
  drawId: 'quiet', seed: 's', mode: 'grouping',
  participants: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `N${i}` })),
  groupCount: 2,
}), Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, name: `N${i}` })))
assert.ok(quiet.beats.every((beat) => !/死|殺|ブス|デブ/.test(beat.text)))
console.log(`Tavern checks passed: ${THEMES.length} themes, ${ONE_LINERS.length} one-liners, sizes ${sizes.join('/')}, replay-stable groups, sub-58s at 50.`)

import assert from 'node:assert/strict'
import { resultLayout, CARD_WIDTH, CARD_HEIGHT } from './src/scene/resultLayout.ts'

function check(cards) {
  for (const t of [.001, .1, .35, .7, 1]) {
    for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
      const a = cards[i], b = cards[j]
      const halfWidth = CARD_WIDTH * (a.scale + b.scale) * t / 2
      const halfHeight = CARD_HEIGHT * (a.scale + b.scale) * t / 2
      assert.ok(Math.abs(a.x - b.x) * t > halfWidth || Math.abs(a.y - b.y) * t > halfHeight,
        `Cards ${i}/${j} overlap at formation ${t}`)
    }
  }
}
for (const portrait of [false, true]) for (let count = 2; count <= 50; count++) {
  check(Array.from({ length: count }, (_, i) => resultLayout(i, count, portrait)))
  for (let groups = 2; groups <= count; groups++) {
    const maxSize = Math.ceil(count / groups)
    check(Array.from({ length: count }, (_, i) => resultLayout(i, count, portrait, true, i % groups, Math.floor(i / groups), groups, maxSize)))
  }
}
console.log('Result layout: 2–50 cards, portrait/landscape, all group counts and five formation stages remain disjoint.')

import assert from 'node:assert/strict'
import { createBingo } from './src/themes/bingo/bingoEngine.ts'
for (let i = 0; i < 200; i++) {
  const { balls } = createBingo()
  assert.equal(balls.length, 75)
  assert.equal(new Set(balls).size, 75)
  assert.deepEqual([...balls].sort((a, b) => a - b), Array.from({length: 75}, (_, n) => n + 1))
}
console.log('Bingo checks passed: 200 games, exactly 75 unique balls, complete range 1–75.')

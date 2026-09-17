import assert from 'node:assert/strict'
import {
  canStartDraw,
  cycleComplete,
  exclusionApplies,
  exclusionIds,
  knownExcludedIds,
  partitionParticipants,
} from '../src/core/exclusion.ts'

const people = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id, name: id.toUpperCase() }))

assert.equal(exclusionApplies('single_winner'), true)
assert.equal(exclusionApplies('grouping'), false)
assert.deepEqual(exclusionIds({
  drawId: 'd', mode: 'single_winner', seed: 's', createdAt: '', orderedIds: ['a', 'b'], winnerIds: ['a'],
}), ['a'])
assert.deepEqual(exclusionIds({
  drawId: 'd', mode: 'grouping', seed: 's', createdAt: '', orderedIds: ['a', 'b'], winnerIds: [],
}), [])

assert.deepEqual(knownExcludedIds(people, ['a', 'ghost', 'c']), ['a', 'c'])

const afterTwoWins = partitionParticipants(people, ['a', 'b'])
assert.deepEqual(afterTwoWins.nextPool.map((p) => p.id), ['c', 'd', 'e'])
assert.deepEqual(afterTwoWins.excluded.map((p) => p.id), ['a', 'b'])
assert.equal(canStartDraw(afterTwoWins.nextPool.length, true), true)
assert.equal(cycleComplete(true, 2, afterTwoWins.nextPool.length), false)

const lastRemaining = partitionParticipants(people, ['a', 'b', 'c', 'd'])
assert.deepEqual(lastRemaining.nextPool.map((p) => p.id), ['e'])
assert.equal(canStartDraw(1, true), true)
assert.equal(canStartDraw(1, false), false)
assert.equal(cycleComplete(true, 4, 1), false)

const lastResult = partitionParticipants(people, ['a', 'b', 'c', 'd', 'e'], ['e'])
assert.deepEqual(lastResult.candidates.map((p) => p.id), ['e'])
assert.deepEqual(lastResult.excluded.map((p) => p.id), ['a', 'b', 'c', 'd'])
assert.deepEqual(lastResult.nextPool.map((p) => p.id), [])
assert.equal(canStartDraw(0, true), false)
assert.equal(cycleComplete(true, 5, 0), true)

console.log('Exclusion checks passed: last remaining draw, result-screen winners stay visible, cycle ends only when the pool is empty.')

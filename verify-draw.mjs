import assert from 'node:assert/strict'
import { resolveDraw } from './src/core/drawEngine.ts'
const participants=Array.from({length:50},(_,i)=>({id:String(i),name:`P${i}`}))
for(const count of [2,12,50]) {
 const request={drawId:'test',mode:'single_winner',participants:participants.slice(0,count),seed:'fixed'}
 const result=resolveDraw(request)
 assert.equal(result.winnerIds.length,1)
 assert.equal(new Set(result.orderedIds).size,count)
 assert.ok(request.participants.some(p=>p.id===result.winnerIds[0]))
 assert.deepEqual(result.orderedIds,resolveDraw(request).orderedIds)
 assert.deepEqual(request.participants,participants.slice(0,count))
}
for(const count of [0,1,51])assert.throws(()=>resolveDraw({drawId:'invalid',mode:'single_winner',participants:Array.from({length:count},(_,i)=>({id:String(i),name:'P'}))}))
console.log('Draw checks passed: bounds, winner eligibility, uniqueness, deterministic replay, no mutation.')

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
const {createQuestBattleScript}=await import('../src/themes/questRaid/questRaidBattle.ts')
const {hpState}=await import('../src/themes/questRaid/questRaidEvents.ts')
const {playQuestRaidBattle}=await import('../src/themes/questRaid/questRaidDirector.ts')
const cases=[['single_winner',2,1],['single_winner',5,1],['single_winner',10,1],['single_winner',25,1],['single_winner',50,1],['multi_winner',5,2],['multi_winner',10,3],['multi_winner',50,10],['top_n_ordered',10,3],['top_n_ordered',50,10],['ordered_list',10,10],['ordered_list',50,50],['grouping',10,0],['grouping',50,0],['shuffle_only',10,10],['shuffle_only',50,50],['multi_winner',50,50]]
const bosses=new Set()
let scriptCount=0
for(const [mode,count,winnerCount] of cases)for(let seed=0;seed<20;seed++){
 const participants=Array.from({length:count},(_,i)=>({id:`p${i}`,name:`参加者${i+1}`}))
 const result=resolveDraw({drawId:`raid-${seed}`,seed:`draw-${seed}`,mode,participants,winnerCount,groupCount:3})
 const original=JSON.stringify({result,participants})
 const script=createQuestBattleScript(result,participants)
 assert.deepEqual(script,createQuestBattleScript(result,participants),'Replay must be identical')
 assert.equal(JSON.stringify({result,participants}),original,'Inputs must not mutate')
 assert.equal(script.fighters.length,count)
 assert.deepEqual(script.fighters.map(f=>f.id),participants.map(p=>p.id),'Opening roster cannot disclose ranking')
 const hp=Object.fromEntries(script.fighters.map(f=>[f.id,f.hp]))
 let bossHp=script.boss.maxHp
 const affected=new Set()
 for(const event of script.events){
  Object.assign(hp,event.hp)
  for(const id of Object.keys(event.hp??{}))affected.add(id)
  if(event.bossHp!==undefined){assert.ok(event.bossHp>=0);bossHp=event.bossHp}
  for(const fighter of script.fighters){assert.ok(hp[fighter.id]>=0&&hp[fighter.id]<=fighter.maxHp);if(script.survivorIds.includes(fighter.id))assert.ok(hp[fighter.id]>0)}
 }
 assert.deepEqual(Object.keys(hp).filter(id=>hp[id]>0).sort(),[...script.survivorIds].sort())
 if(script.peaceful){assert.ok(script.events.every(e=>!e.hp));assert.equal(script.duration,4600)}else{
  assert.equal(bossHp,0);assert.equal(script.duration,10500);assert.equal(affected.size,count)
  assert.deepEqual([...script.survivorIds].sort(),[...(mode==='ordered_list'?result.orderedIds.slice(0,1):result.winnerIds)].sort())
 }
 // With only the winning IDs changed, early stats/attacks must stay identical.
 if(mode==='single_winner'){
  const alternative={...result,winnerIds:[result.orderedIds[1]]}
  const second=createQuestBattleScript(alternative,participants)
  assert.deepEqual(script.fighters,second.fighters)
  assert.deepEqual(script.events.filter(e=>e.at<6200),second.events.filter(e=>e.at<6200))
 }
 bosses.add(script.boss.id);scriptCount++
}
assert.equal(bosses.size,5)
assert.equal(hpState(51,100),'normal');assert.equal(hpState(50,100),'warning');assert.equal(hpState(25,100),'critical');assert.equal(hpState(0,100),'dead')
// Drive the actual director with a fake animation clock, including background-tab catch-up and cancellation.
let time=0,pending,frames=[],reveals=0,completes=0
Object.defineProperty(globalThis,'performance',{value:{now:()=>time},configurable:true})
globalThis.requestAnimationFrame=callback=>{pending=callback;return 1}
globalThis.cancelAnimationFrame=()=>{pending=undefined}
const participants=Array.from({length:50},(_,i)=>({id:`p${i}`,name:`P${i}`}))
const result=resolveDraw({drawId:'director',seed:'fixed',mode:'multi_winner',participants,winnerCount:10})
const script=createQuestBattleScript(result,participants)
const run=()=>playQuestRaidBattle(script,null,f=>frames.push(f),()=>reveals++,()=>completes++)
run()
let lastPage=0,lastPageChange=0
for(time=33;time<11000;time+=33){const callback=pending;pending=undefined;callback?.();const frame=frames.at(-1);if(frame.page!==lastPage){assert.ok(time-lastPageChange>=450);lastPage=frame.page;lastPageChange=time}}
assert.equal(reveals,1);assert.equal(completes,1);assert.equal(frames.at(-1).elapsed,10500)
assert.deepEqual(frames.at(-1).fighters.filter(f=>f.hp>0).map(f=>f.id).sort(),result.winnerIds.toSorted())
time=0;reveals=0;completes=0;run();time=20000;pending();assert.equal(reveals,1);assert.equal(completes,1)
time=0;reveals=0;completes=0;const handle=run();handle.kill();assert.equal(pending,undefined);assert.equal(reveals,0)
console.log(`QUEST RAID passed: ${scriptCount} scripts, ${cases.length} cases, all 6 modes, 2/5/10/25/50 people, 5 bosses; deterministic replay, protected survivors, no mutations, hidden early result, director completion/cancellation/paging.`)

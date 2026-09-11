import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { resolveDraw } from './core/drawEngine'
import { DrawAudio } from './core/audio'
import { createCinematicState, directDraw } from './core/cinematic'
import type { DrawPhase, DrawResult, Participant, QualityTier } from './core/types'
import { demoParticipants } from './data/demoParticipants'
import { DrawStage } from './scene/DrawStage'

const APP_VERSION='v0.3.1'
type RecordEntry={id:string;name:string;number:number;time:string}
const labels:Record<DrawPhase,string>={idle:'運命が動き出す、その瞬間へ。',charging:'コア、起動。',mixing:'すべての可能性が、交差する。',selection:'選ばれるのは、ただ一人。',impact:'',reveal:'その瞬間は、あなたのもの。',complete:'その瞬間は、あなたのもの。'}
function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback}catch{return fallback}}
function initialParticipants(){const p=read<Participant[]>('core-participants',demoParticipants);return Array.isArray(p)&&p.length>=2&&p.length<=50&&p.every(x=>typeof x?.name==='string'&&typeof x?.id==='string')?p:demoParticipants}
export default function App(){
  const [participants,setParticipants]=useState(initialParticipants)
  const [phase,setPhase]=useState<DrawPhase>('idle')
  const [result,setResult]=useState<DrawResult|null>(null)
  const [quality,setQuality]=useState<QualityTier>('high')
  const [sound,setSound]=useState(true)
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [history,setHistory]=useState<RecordEntry[]>(()=>{const h=read<RecordEntry[]>('core-history',[]);return Array.isArray(h)?h.filter(x=>typeof x?.name==='string'&&typeof x?.id==='string').slice(0,20):[]})
  const [panel,setPanel]=useState<'participants'|'history'|null>(null)
  const [draft,setDraft]=useState('')
  const [error,setError]=useState('')
  const [progress,setProgress]=useState(0)
  const [exclude,setExclude]=useState(false)
  const timeline=useRef<gsap.core.Timeline|null>(null)
  const audio=useRef<DrawAudio|null>(null)
  const cinematic=useRef(createCinematicState())
  const busyRef=useRef(false)
  const startButton=useRef<HTMLButtonElement>(null)
  const dialog=useRef<HTMLDialogElement>(null)
  const busy=phase!=='idle'&&phase!=='complete'
  const revealed=phase==='reveal'||phase==='complete'
  const winner=participants.find(p=>p.id===result?.winnerIds[0])
  const eligible=exclude?participants.filter(p=>!history.some(h=>h.id===p.id)):participants
  useEffect(()=>{audio.current=new DrawAudio();return()=>{timeline.current?.kill();audio.current?.dispose()}},[])
  useEffect(()=>{try{localStorage.setItem('core-participants',JSON.stringify(participants));localStorage.setItem('core-history',JSON.stringify(history))}catch{/* Storage may be unavailable. */}},[participants,history])
  useEffect(()=>{if(panel)dialog.current?.showModal();else dialog.current?.close()},[panel])
  function play(next:DrawResult,replay=false){
    if(busyRef.current)return
    busyRef.current=true
    void audio.current?.unlock()
    timeline.current?.kill();setResult(next);setProgress(0)
    timeline.current=directDraw(cinematic.current,reduced,audio.current,setPhase,()=>{
      if(!replay){
        const w=participants.find(p=>p.id===next.winnerIds[0])
        if(w)setHistory(h=>[{id:w.id,name:w.name,number:w.number??1,time:next.createdAt},...h].slice(0,20))
      }
    },()=>{busyRef.current=false},setProgress)
  }
  function draw(){if(busyRef.current||eligible.length<2)return;play(resolveDraw({drawId:crypto.randomUUID(),mode:'single_winner',participants:eligible}))}
  function save(){const names=draft.split('\n').map(n=>n.trim()).filter(Boolean);if(names.length<2||names.length>50){setError('参加者は2〜50名で入力してください。');return}if(names.some(n=>n.length>40)){setError('名前は40文字以内で入力してください。');return}setParticipants(names.map((name,i)=>({id:crypto.randomUUID(),name,number:i+1})));setHistory([]);setResult(null);Object.assign(cinematic.current,createCinematicState());setPhase('idle');setPanel(null)}
  return <main className={`app-shell phase-${phase} ${reduced?'reduced':''}`}>
    <header className="topbar"><a className="brand" href="./"><span className="brand-symbol">◈</span> CORE<span className="brand-light">DRAW</span><span className="edition">EXPERIENCE 01 · {APP_VERSION}</span></a><div className="top-actions"><span className="live"><i/> SYSTEM ONLINE</span><button className="icon-button" onClick={()=>{setSound(!sound);audio.current?.mute(!sound)}} aria-label={sound?'効果音をオフ':'効果音をオン'} title="効果音">{sound?'♫':'♪'}<span>{sound?'ON':'OFF'}</span></button><button className="icon-button fullscreen" aria-label="全画面切り替え" onClick={()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen().catch(()=>{})}}>⛶</button></div></header>
    <div className="workspace"><aside className="sidebar"><div className="side-title"><span>DRAW ROOM</span><span className="tiny">01</span></div><div className="room-heading"><h2>運命を、解き放て。</h2><p>ONE CORE. ONE POSSIBILITY.</p></div><div className="mode-card"><span className="mode-icon">◇</span><div><strong>シングルドロー</strong><span>SINGLE WINNER</span></div><span className="mode-check">✓</span></div>
      <div className="roster-title"><span>PARTICIPANTS <b>{String(participants.length).padStart(2,'0')}</b></span><button disabled={busy} onClick={()=>{setDraft(participants.map(p=>p.name).join('\n'));setError('');setPanel('participants')}}>編集 ↗</button></div><div className="roster">{participants.map((p,i)=><div className={`roster-row ${revealed&&winner?.id===p.id?'chosen':''}`} key={p.id}><span className="avatar">{String(i+1).padStart(2,'0')}</span><span>{p.name}</span><i className={exclude&&history.some(h=>h.id===p.id)?'used':''}/></div>)}</div>
      <div className="side-bottom"><label className="toggle-line"><span>当選者を次回から除外</span><input type="checkbox" checked={exclude} disabled={busy} onChange={e=>setExclude(e.target.checked)}/></label><button className="history-button" disabled={busy} onClick={()=>setPanel('history')}><span>◷　抽選履歴</span><span>{String(history.length).padStart(2,'0')} ↗</span></button><p>すべての参加者に、等しいチャンスを。</p></div></aside>
    <section className="stage-shell" aria-label="抽選ステージ"><div className="stage-grid"/><div className="stage-header"><span><i/> LIVE EXPERIENCE</span><span>CORE ENGINE / 001</span></div><div className="scene"><DrawStage participants={result?participants.filter(p=>result.orderedIds.includes(p.id)):eligible} winnerIds={result?.winnerIds??[]} quality={quality} cinematic={cinematic.current} revealed={revealed}/></div><div className="scene-vignette"/><div className="orbit-label left-label"><span>ENTROPY FIELD</span><b>{busy?'SYNCHRONIZING':'STABLE'}</b><div/></div><div className="orbit-label right-label"><span>CORE OUTPUT</span><b>{busy?`${Math.round(progress)}%`:'100.00%'}</b><div/></div>
      <div className="stage-intro"><div className="eyebrow">THE POSSIBILITY ENGINE</div><h1>{revealed?'A STAR IS CHOSEN.':'AWAKEN YOUR LUCK.'}</h1><p>{labels[phase]}</p></div>
      <div className="phase-readout" aria-live="polite">{busy?<><span className="pulse-dot"/>{phase.toUpperCase()}<span className="readout-line"/></>:<><span className="diamond">◇</span>{revealed?'DESTINY REVEALED':'AWAITING YOUR SIGNAL'}</>}</div>
      {revealed&&winner&&<div className="winner-caption-overlay" role="status"><span>✦ AWAKENED</span><strong>{winner.name}</strong></div>}
      <div className="stage-bottom"><div className="draw-meta"><span>ENTRY POOL</span><strong>{String(eligible.length).padStart(2,'0')}<small> PARTICIPANTS</small></strong></div><div className="launch-area"><button ref={startButton} className="launch" onClick={draw} disabled={busy||eligible.length<2}><span>✧</span>{busy?'運命を抽選中':revealed?'もう一度、抽選する':'抽選を開始する'}<span>→</span></button><div className="launch-hint">{busy?'THE CORE IS CHOOSING YOUR DESTINY':eligible.length<2?'対象者が2名以上必要です。除外をオフにしてください。':revealed?<button className="replay" onClick={()=>result&&play(result,true)}>↻ 同じ結果をリプレイ</button>:'ひとつの瞬間。ひとりの主役。'}</div></div><div className="draw-meta align-right"><span>WINNER</span><strong>01<small> PERSON</small></strong></div></div>
      <div className="progress-track"><div style={{width:`${progress}%`}}/></div></section></div>
    <footer><span>CORE DRAW <b>／</b> CINEMATIC LOTTERY <b>／</b> {APP_VERSION}</span><div><label>描画品質 <select aria-label="描画品質" value={quality} onChange={e=>setQuality(e.target.value as QualityTier)}><option value="lite">LITE</option><option value="high">HIGH</option><option value="ultra">ULTRA</option></select></label><label className="motion-label"><input type="checkbox" checked={reduced} disabled={busy} onChange={e=>setReduced(e.target.checked)}/> 演出を控えめに</label></div><span className="footer-note">EVERY POSSIBILITY BEGINS HERE.</span></footer>
    <dialog ref={dialog} onCancel={()=>setPanel(null)} onClose={()=>{setPanel(null);startButton.current?.focus()}}><div className="dialog-heading"><div><span className="eyebrow">{panel==='participants'?'ENTRY MANAGEMENT':'DRAW ARCHIVE'}</span><h2>{panel==='participants'?'参加者を編集':'抽選履歴'}</h2></div><button aria-label="閉じる" onClick={()=>setPanel(null)}>×</button></div>{panel==='participants'?<><p>1行に1名、2〜50名まで。保存すると抽選履歴がリセットされます。</p><textarea aria-label="参加者名（1行に1名）" value={draft} onChange={e=>setDraft(e.target.value)} rows={12}/><p className="error" role="alert">{error}</p><button className="launch" onClick={save}>参加者を保存する <span>→</span></button></>:<div className="history-list">{history.length===0?<p>まだ抽選結果がありません。</p>:history.map((h,i)=><div className="history-row" key={h.time+i}><span>✦</span><strong>{h.name}</strong><time>{new Date(h.time).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'})}</time></div>)}</div>}</dialog>
  </main>
}

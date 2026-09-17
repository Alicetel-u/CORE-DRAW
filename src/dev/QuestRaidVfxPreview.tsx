import { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { QUEST_VFX, paintQuestEffect, type ModernQuestEffect } from '../themes/questRaid/questRaidVfx'
import { QUEST_BOSSES } from '../themes/questRaid/questRaidBosses'
import { QuestRaidStage } from '../themes/questRaid/QuestRaidStage'
import type { QuestBattleScript } from '../themes/questRaid/questRaidBattle'
import type { QuestFrame } from '../themes/questRaid/questRaidDirector'
import { verifyQuestVfx } from './verifyQuestVfx'
import '../themes/questRaid/questRaid.css'
import './questRaidVfxPreview.css'

const ids = Object.keys(QUEST_VFX) as ModernQuestEffect[]
const fighters = [{ id: 'preview', name: 'プレビュー', hp: 100, maxHp: 100, mp: 50, maxMp: 50 }]
const background = new URL('../themes/questRaid/bosses/battle-bg.png', import.meta.url).href

function EffectCard({ id, selected, onSelect }: { id: ModernQuestEffect; selected: boolean; onSelect: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const info = QUEST_VFX[id]
  useEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, 280, 150)
    paintQuestEffect(ctx, 280, 150, id, 420, 1000, 140, 77, 110, { bossId: info.boss })
  }, [id, info.boss])
  return <button className={`fx-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={onSelect}>
    <div className="fx-card-image" style={{ backgroundImage: `linear-gradient(#09101e66,#09101e88),url(${background})` }}><canvas ref={canvas} width="280" height="150" /></div>
    <span className="fx-card-copy"><span><strong>{info.label}</strong><small>{id}</small></span><span className="fx-badge">{'reserved' in info ? '追加' : '使用中'}</span></span>
  </button>
}

function Preview() {
  const [effect, setEffect] = useState<ModernQuestEffect>('fire_breath')
  const [bossId, setBossId] = useState('dragon')
  const [playing, setPlaying] = useState(true)
  const [progress, setProgress] = useState(.38)
  const progressRef = useRef(.38)
  const [speed, setSpeed] = useState(1)
  const [reduced, setReduced] = useState(false)
  const [filter, setFilter] = useState('すべて')
  const [report, setReport] = useState('')
  const [testing, setTesting] = useState(false)
  const info = QUEST_VFX[effect]
  const boss = QUEST_BOSSES.find(b => b.id === bossId)!
  const script = useMemo<QuestBattleScript>(() => ({ boss, fighters, events: [], duration: 1000, survivorIds: ['preview'], peaceful: false }), [boss])
  useEffect(() => {
    if (!playing) return
    let handle = 0, previous = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(now - previous, 80); previous = now
      progressRef.current = (progressRef.current + dt / 1600 * speed) % 1.28
      setProgress(Math.min(1, progressRef.current))
      handle = requestAnimationFrame(tick)
    }
    handle = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(handle)
  }, [playing, speed])
  const seek = (value: number) => { setPlaying(false); progressRef.current = value; setProgress(value) }
  const select = (id: ModernQuestEffect) => { setEffect(id); setBossId(QUEST_VFX[id].boss); progressRef.current = .38; setProgress(.38) }
  const frame: QuestFrame = {
    fighters, eventIndex: 0, page: 0, bossHp: 999, criticalIds: [], elapsed: progress * 1000,
    event: { type: effect.startsWith('ally_') ? effect === 'ally_heal' ? 'player_heal' : effect === 'ally_toss' ? 'player_item' : 'player_spell' : 'boss_attack',
      phase: 'RAID', at: 0, duration: 1000, fx: 1000, message: info.label, effect, pose: effect.startsWith('ally_') ? 'idle' : info.pose },
  }
  const visible = ids.filter(id => filter === 'すべて' || filter === '追加のみ' && 'reserved' in QUEST_VFX[id] || QUEST_VFX[id].family === filter)
  const runChecks = () => {
    setTesting(true); setReport('検証中…')
    // Let the disabled state paint before the synchronous pixel checks.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      try { setReport(verifyQuestVfx()) } catch (error) { setReport(`FAIL: ${String(error)}`) }
      finally { setTesting(false) }
    }))
  }
  return <div className="fx-library">
    <header className="fx-header"><div><span className="fx-eyebrow">CORE DRAW / QUEST RAID</span><h1>魔法と衝撃の図鑑<span>VFX LIBRARY</span></h1><p>29の演出。ためる、放つ、余韻まで。</p></div><a href="/">ゲームへ戻る ↗</a></header>
    <main>
      <section className="fx-preview" aria-label="エフェクトの再生">
        <div className="fx-preview-title"><div><span className="fx-eyebrow">LIVE PREVIEW</span><h2>{info.label}</h2></div><span className="fx-badge">{info.family} / {'reserved' in info ? '今後のスキル用' : 'レイドで使用中'}</span></div>
        <div className="fx-stage"><QuestRaidStage script={script} frame={frame} participants={fighters} reduced={reduced} /></div>
        <div className="fx-controls">
          <button className="fx-primary" onClick={() => setPlaying(!playing)}>{playing ? '一時停止' : '再生'}</button>
          <button onClick={() => seek(0)}>先頭へ</button><button onClick={() => seek(Math.min(1, progress + .05))}>+5% コマ送り</button>
          <label className="fx-seek">進行 <input aria-label="エフェクトの進行" type="range" min="0" max="100" value={Math.round(progress * 100)} onChange={e => seek(Number(e.target.value) / 100)} /><output>{Math.round(progress * 100)}%</output></label>
        </div>
        <div className="fx-options"><label>ボス <select aria-label="確認するボス" value={bossId} onChange={e => setBossId(e.target.value)}>{QUEST_BOSSES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label>速度 <select aria-label="再生速度" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value=".25">0.25×</option><option value=".5">0.5×</option><option value="1">1×</option></select></label>
          <label><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} /> 演出をひかえめに</label>
        </div>
      </section>
      <section className="fx-collection" aria-label="エフェクト一覧">
        <div className="fx-collection-heading"><div><span className="fx-eyebrow">COLLECTION</span><h2>演出を選ぶ <small>{visible.length} / 29</small></h2></div><label>絞り込み <select aria-label="エフェクト分類" value={filter} onChange={e => setFilter(e.target.value)}>{['すべて', '追加のみ', ...new Set(ids.map(id => QUEST_VFX[id].family))].map(f => <option key={f}>{f}</option>)}</select></label></div>
        <div className="fx-grid">{visible.map(id => <EffectCard key={id} id={id} selected={id === effect} onSelect={() => select(id)} />)}</div>
      </section>
      <footer><p>開発用プレビュー。追加12種は戦闘には未割り当てです。選択や再生で抽選結果は変わりません。</p><button disabled={testing} onClick={runChecks}>全29種類の描画検証</button><pre role="status">{report}</pre></footer>
    </main>
  </div>
}

createRoot(document.getElementById('root')!).render(<Preview />)

import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { resolveDraw } from './core/drawEngine'
import { DrawAudio } from './core/audio'
import { createCinematicState, directDraw } from './core/cinematic'
import type { DrawMode, DrawPhase, DrawResult, Participant, QualityTier } from './core/types'
import { demoParticipants } from './data/demoParticipants'
import { DrawStage } from './scene/DrawStage'

const APP_VERSION = 'v0.4.0'

type Panel = 'participants' | 'history' | 'modes' | null
type HistoryEntry = {
  id: string
  mode: DrawMode
  summary: string
  time: string
  winnerIds: string[]
}

type ModeMeta = {
  label: string
  en: string
  icon: string
  description: string
}

const MODE_META: Record<DrawMode, ModeMeta> = {
  single_winner: { label: 'シングルドロー', en: 'SINGLE WINNER', icon: '◇', description: '参加者から1人を選出' },
  multi_winner: { label: '複数当選', en: 'MULTI WINNER', icon: '✦', description: '指定人数を同時に選出' },
  ordered_list: { label: '順番決め', en: 'ORDERED LIST', icon: '≋', description: '全員の順番をランダム決定' },
  top_n_ordered: { label: 'TOP-N', en: 'TOP N RANKING', icon: '△', description: '上位N名を順位付きで選出' },
  grouping: { label: 'チーム分け', en: 'GROUPING', icon: '⬡', description: '全員を指定数のグループへ分割' },
  shuffle_only: { label: 'シャッフル', en: 'SHUFFLE ONLY', icon: '↻', description: '全員をランダムに並べ替え' },
}

const labels: Record<DrawPhase, string> = {
  idle: '運命が動き出す、その瞬間へ。',
  charging: 'コア、起動。',
  mixing: 'すべての可能性が、交差する。',
  selection: '結果が、ひとつの形へ収束する。',
  impact: '',
  reveal: '新しい結果が、ここに現れる。',
  complete: '新しい結果が、ここに現れる。',
}

const revealHeadlines: Record<DrawMode, string> = {
  single_winner: 'A STAR IS CHOSEN.',
  multi_winner: 'THE CHOSEN EMERGE.',
  ordered_list: 'ORDER IS FORGED.',
  top_n_ordered: 'THE RANKING AWAKENS.',
  grouping: 'TEAMS ARE FORMED.',
  shuffle_only: 'ORDER REWRITTEN.',
}

function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}

function initialParticipants() {
  const p = read<Participant[]>('core-participants', demoParticipants)
  return Array.isArray(p) && p.length >= 2 && p.length <= 50 && p.every((x) => typeof x?.name === 'string' && typeof x?.id === 'string') ? p : demoParticipants
}

function initialHistory(): HistoryEntry[] {
  const raw = read<Array<HistoryEntry | { id: string; name?: string; time?: string }>>('core-history', [])
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x) => x && typeof x.id === 'string')
    .slice(0, 20)
    .map((entry) => {
      if ('mode' in entry && 'summary' in entry && Array.isArray(entry.winnerIds)) return entry as HistoryEntry
      return {
        id: entry.id,
        mode: 'single_winner' as DrawMode,
        summary: ('name' in entry ? entry.name : undefined) ?? 'Previous winner',
        time: entry.time ?? new Date().toISOString(),
        winnerIds: [entry.id],
      }
    })
}

function namesFor(ids: string[], participants: Participant[]) {
  const byId = new Map(participants.map((p) => [p.id, p.name]))
  return ids.map((id) => byId.get(id) ?? 'Unknown')
}

function historySummary(result: DrawResult, participants: Participant[]) {
  if (result.mode === 'single_winner') return namesFor(result.winnerIds, participants)[0] ?? 'Winner'
  if (result.mode === 'multi_winner') return `${namesFor(result.winnerIds, participants).join(' / ')} が当選`
  if (result.mode === 'top_n_ordered') return `TOP ${result.winnerIds.length}: ${namesFor(result.winnerIds, participants).join(' / ')}`
  if (result.mode === 'grouping') return `${result.groups?.length ?? 0}チームに分割`
  if (result.mode === 'ordered_list') return `順番: ${namesFor(result.orderedIds.slice(0, 3), participants).join(' → ')}${result.orderedIds.length > 3 ? ' …' : ''}`
  return `シャッフル: ${namesFor(result.orderedIds.slice(0, 3), participants).join(' → ')}${result.orderedIds.length > 3 ? ' …' : ''}`
}

function exclusionIds(result: DrawResult) {
  return result.mode === 'single_winner' || result.mode === 'multi_winner' || result.mode === 'top_n_ordered' ? result.winnerIds : []
}

function ResultOverlay({ result, participants }: { result: DrawResult; participants: Participant[] }) {
  const byId = new Map(participants.map((p) => [p.id, p]))
  if (result.mode === 'single_winner') {
    const winner = byId.get(result.winnerIds[0])
    if (!winner) return null
    return <div className="result-overlay single-result"><span className="result-kicker">✦ AWAKENED</span><strong>{winner.name}</strong><small>THE CORE HAS CHOSEN</small></div>
  }

  if (result.mode === 'grouping') {
    return <div className="result-overlay wide-result"><span className="result-kicker">GROUP MATRIX</span><div className="group-result-grid">{(result.groups ?? []).map((group, groupIndex) => <section className="group-result" key={groupIndex}><h3>TEAM {String(groupIndex + 1).padStart(2, '0')}</h3>{group.map((id, i) => <div key={id}><b>{String(i + 1).padStart(2, '0')}</b><span>{byId.get(id)?.name ?? 'Unknown'}</span></div>)}</section>)}</div></div>
  }

  const ids = result.mode === 'multi_winner' || result.mode === 'top_n_ordered' ? result.winnerIds : result.orderedIds
  const title = result.mode === 'multi_winner' ? 'SELECTED WINNERS' : result.mode === 'top_n_ordered' ? 'TOP RANKING' : result.mode === 'ordered_list' ? 'FINAL ORDER' : 'SHUFFLED ORDER'
  return <div className={`result-overlay wide-result result-${result.mode}`}><span className="result-kicker">{title}</span><div className="ordered-result">{ids.map((id, i) => <div className="ordered-result-row" key={id}><b>{String(i + 1).padStart(2, '0')}</b><span>{byId.get(id)?.name ?? 'Unknown'}</span>{(result.mode === 'multi_winner' || result.mode === 'top_n_ordered') && <i>✦</i>}</div>)}</div></div>
}

export default function App() {
  const [participants, setParticipants] = useState(initialParticipants)
  const [phase, setPhase] = useState<DrawPhase>('idle')
  const [result, setResult] = useState<DrawResult | null>(null)
  const [mode, setMode] = useState<DrawMode>('single_winner')
  const [winnerCount, setWinnerCount] = useState(2)
  const [groupCount, setGroupCount] = useState(2)
  const [quality, setQuality] = useState<QualityTier>('high')
  const [sound, setSound] = useState(true)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)
  const [panel, setPanel] = useState<Panel>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [exclude, setExclude] = useState(false)
  const timeline = useRef<gsap.core.Timeline | null>(null)
  const audio = useRef<DrawAudio | null>(null)
  const cinematic = useRef(createCinematicState())
  const busyRef = useRef(false)
  const startButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = phase !== 'idle' && phase !== 'complete'
  const revealed = phase === 'reveal' || phase === 'complete'
  const modeMeta = MODE_META[mode]
  const exclusionApplies = mode === 'single_winner' || mode === 'multi_winner' || mode === 'top_n_ordered'
  const previousWinnerIds = useMemo(() => new Set(history.flatMap((h) => h.winnerIds)), [history])
  const eligible = exclusionApplies && exclude ? participants.filter((p) => !previousWinnerIds.has(p.id)) : participants
  const safeWinnerCount = Math.max(1, Math.min(winnerCount, eligible.length))
  const safeGroupCount = Math.max(2, Math.min(groupCount, Math.max(2, eligible.length)))
  const orderedParticipants = result ? result.orderedIds.map((id) => participants.find((p) => p.id === id)).filter((p): p is Participant => Boolean(p)) : eligible

  useEffect(() => {
    audio.current = new DrawAudio()
    return () => {
      timeline.current?.kill()
      audio.current?.dispose()
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('core-participants', JSON.stringify(participants))
      localStorage.setItem('core-history', JSON.stringify(history))
    } catch {
      // Storage may be unavailable.
    }
  }, [participants, history])

  useEffect(() => {
    if (panel) dialog.current?.showModal()
    else dialog.current?.close()
  }, [panel])

  function resetPresentation(nextMode?: DrawMode) {
    timeline.current?.kill()
    busyRef.current = false
    setResult(null)
    setProgress(0)
    setPhase('idle')
    Object.assign(cinematic.current, createCinematicState())
    if (nextMode) setMode(nextMode)
  }

  function play(next: DrawResult, replay = false) {
    if (busyRef.current) return
    busyRef.current = true
    void audio.current?.unlock()
    timeline.current?.kill()
    setResult(next)
    setProgress(0)
    timeline.current = directDraw(cinematic.current, reduced, audio.current, setPhase, () => {
      if (!replay) {
        setHistory((h) => [{
          id: next.drawId,
          mode: next.mode,
          summary: historySummary(next, participants),
          time: next.createdAt,
          winnerIds: exclusionIds(next),
        }, ...h].slice(0, 20))
      }
    }, () => {
      busyRef.current = false
    }, setProgress)
  }

  function draw() {
    if (busyRef.current || eligible.length < 2) return
    play(resolveDraw({
      drawId: crypto.randomUUID(),
      mode,
      participants: eligible,
      winnerCount: mode === 'multi_winner' || mode === 'top_n_ordered' ? safeWinnerCount : undefined,
      groupCount: mode === 'grouping' ? safeGroupCount : undefined,
    }))
  }

  function save() {
    const names = draft.split('\n').map((n) => n.trim()).filter(Boolean)
    if (names.length < 2 || names.length > 50) {
      setError('参加者は2〜50名で入力してください。')
      return
    }
    if (names.some((n) => n.length > 40)) {
      setError('名前は40文字以内で入力してください。')
      return
    }
    setParticipants(names.map((name, i) => ({ id: crypto.randomUUID(), name, number: i + 1 })))
    setHistory([])
    resetPresentation()
    setPanel(null)
  }

  const targetLabel = mode === 'single_winner' ? 'WINNER' : mode === 'multi_winner' ? 'WINNERS' : mode === 'top_n_ordered' ? 'TOP' : mode === 'grouping' ? 'GROUPS' : 'ENTRIES'
  const targetValue = mode === 'single_winner' ? 1 : mode === 'multi_winner' || mode === 'top_n_ordered' ? safeWinnerCount : mode === 'grouping' ? safeGroupCount : eligible.length
  const targetUnit = mode === 'grouping' ? 'TEAMS' : mode === 'ordered_list' || mode === 'shuffle_only' ? 'PEOPLE' : 'SELECTED'

  return <main className={`app-shell phase-${phase} mode-${mode} ${reduced ? 'reduced' : ''}`}>
    <header className="topbar"><a className="brand" href="./"><span className="brand-symbol">◈</span> CORE<span className="brand-light">DRAW</span><span className="edition">EXPERIENCE 01 · {APP_VERSION}</span></a><div className="top-actions"><span className="live"><i /> SYSTEM ONLINE</span><button className="icon-button" onClick={() => { setSound(!sound); audio.current?.mute(!sound) }} aria-label={sound ? '効果音をオフ' : '効果音をオン'} title="効果音">{sound ? '♫' : '♪'}<span>{sound ? 'ON' : 'OFF'}</span></button><button className="icon-button fullscreen" aria-label="全画面切り替え" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen().catch(() => {}) }}>⛶</button></div></header>
    <div className="workspace"><aside className="sidebar"><div className="side-title"><span>DRAW ROOM</span><span className="tiny">01</span></div><div className="room-heading"><h2>運命を、解き放て。</h2><p>ONE CORE. MANY POSSIBILITIES.</p></div>
      <button className="mode-card mode-selector" disabled={busy} onClick={() => setPanel('modes')}><span className="mode-icon">{modeMeta.icon}</span><div><strong>{modeMeta.label}</strong><span>{modeMeta.en}</span></div><span className="mode-check">変更 ↗</span></button>
      {(mode === 'multi_winner' || mode === 'top_n_ordered') && <label className="mode-config"><span>{mode === 'top_n_ordered' ? 'TOP人数' : '当選人数'}</span><input type="number" min={1} max={Math.max(1, eligible.length)} value={safeWinnerCount} disabled={busy} onChange={(e) => setWinnerCount(Number(e.target.value) || 1)} /></label>}
      {mode === 'grouping' && <label className="mode-config"><span>チーム数</span><input type="number" min={2} max={Math.max(2, eligible.length)} value={safeGroupCount} disabled={busy} onChange={(e) => setGroupCount(Number(e.target.value) || 2)} /></label>}
      <div className="roster-title"><span>PARTICIPANTS <b>{String(participants.length).padStart(2, '0')}</b></span><button disabled={busy} onClick={() => { setDraft(participants.map((p) => p.name).join('\n')); setError(''); setPanel('participants') }}>編集 ↗</button></div><div className="roster">{participants.map((p, i) => <div className={`roster-row ${revealed && result?.winnerIds.includes(p.id) ? 'chosen' : ''}`} key={p.id}><span className="avatar">{String(i + 1).padStart(2, '0')}</span><span>{p.name}</span><i className={exclude && previousWinnerIds.has(p.id) ? 'used' : ''} /></div>)}</div>
      <div className="side-bottom"><label className={`toggle-line ${!exclusionApplies ? 'disabled-toggle' : ''}`}><span>当選者を次回から除外</span><input type="checkbox" checked={exclude} disabled={busy || !exclusionApplies} onChange={(e) => setExclude(e.target.checked)} /></label><button className="history-button" disabled={busy} onClick={() => setPanel('history')}><span>◷　抽選履歴</span><span>{String(history.length).padStart(2, '0')} ↗</span></button><p>すべての参加者に、等しいチャンスを。</p></div></aside>
      <section className="stage-shell" aria-label="抽選ステージ"><div className="stage-grid" /><div className="stage-header"><span><i /> LIVE EXPERIENCE</span><button className="stage-mode-button" disabled={busy} onClick={() => setPanel('modes')}>{modeMeta.en} ↗</button></div><div className="scene"><DrawStage participants={orderedParticipants} winnerIds={result?.winnerIds ?? []} groups={result?.groups} mode={mode} quality={quality} cinematic={cinematic.current} revealed={revealed} /></div><div className="scene-vignette" /><div className="orbit-label left-label"><span>ENTROPY FIELD</span><b>{busy ? 'SYNCHRONIZING' : 'STABLE'}</b><div /></div><div className="orbit-label right-label"><span>CORE OUTPUT</span><b>{busy ? `${Math.round(progress)}%` : '100.00%'}</b><div /></div>
        <div className="stage-intro"><div className="eyebrow">THE POSSIBILITY ENGINE</div><h1>{revealed ? revealHeadlines[mode] : 'AWAKEN YOUR LUCK.'}</h1><p>{labels[phase]}</p></div>
        <div className="phase-readout" aria-live="polite">{busy ? <><span className="pulse-dot" />{phase.toUpperCase()}<span className="readout-line" /></> : <><span className="diamond">◇</span>{revealed ? 'DESTINY REVEALED' : 'AWAITING YOUR SIGNAL'}</>}</div>
        {revealed && result && <ResultOverlay result={result} participants={participants} />}
        <div className="stage-bottom"><div className="draw-meta"><span>ENTRY POOL</span><strong>{String(eligible.length).padStart(2, '0')}<small> PARTICIPANTS</small></strong></div><div className="launch-area"><button ref={startButton} className="launch" onClick={draw} disabled={busy || eligible.length < 2}><span>✧</span>{busy ? '運命を抽選中' : revealed ? 'もう一度、抽選する' : '抽選を開始する'}<span>→</span></button><div className="launch-hint">{busy ? 'THE CORE IS RESOLVING YOUR DESTINY' : eligible.length < 2 ? '対象者が2名以上必要です。除外をオフにしてください。' : revealed ? <button className="replay" onClick={() => result && play(result, true)}>↻ 同じ結果をリプレイ</button> : modeMeta.description}</div></div><div className="draw-meta align-right"><span>{targetLabel}</span><strong>{String(targetValue).padStart(2, '0')}<small> {targetUnit}</small></strong></div></div>
        <div className="progress-track"><div style={{ width: `${progress}%` }} /></div></section></div>
    <footer><span>CORE DRAW <b>／</b> CINEMATIC LOTTERY <b>／</b> {APP_VERSION}</span><div><label>描画品質 <select aria-label="描画品質" value={quality} onChange={(e) => setQuality(e.target.value as QualityTier)}><option value="lite">LITE</option><option value="high">HIGH</option><option value="ultra">ULTRA</option></select></label><label className="motion-label"><input type="checkbox" checked={reduced} disabled={busy} onChange={(e) => setReduced(e.target.checked)} /> 演出を控えめに</label></div><span className="footer-note">EVERY POSSIBILITY BEGINS HERE.</span></footer>
    <dialog ref={dialog} onCancel={() => setPanel(null)} onClose={() => { setPanel(null); startButton.current?.focus() }}><div className="dialog-heading"><div><span className="eyebrow">{panel === 'participants' ? 'ENTRY MANAGEMENT' : panel === 'modes' ? 'DRAW PROTOCOL' : 'DRAW ARCHIVE'}</span><h2>{panel === 'participants' ? '参加者を編集' : panel === 'modes' ? '抽選モードを選択' : '抽選履歴'}</h2></div><button aria-label="閉じる" onClick={() => setPanel(null)}>×</button></div>
      {panel === 'participants' ? <><p>1行に1名、2〜50名まで。保存すると抽選履歴がリセットされます。</p><textarea aria-label="参加者名（1行に1名）" value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} /><p className="error" role="alert">{error}</p><button className="launch" onClick={save}>参加者を保存する <span>→</span></button></> : panel === 'modes' ? <div className="mode-grid">{(Object.keys(MODE_META) as DrawMode[]).map((item) => <button className={`mode-option ${mode === item ? 'active' : ''}`} key={item} onClick={() => { resetPresentation(item); setPanel(null) }}><span>{MODE_META[item].icon}</span><div><strong>{MODE_META[item].label}</strong><small>{MODE_META[item].en}</small><p>{MODE_META[item].description}</p></div><i>{mode === item ? '✓' : '→'}</i></button>)}</div> : <div className="history-list">{history.length === 0 ? <p>まだ抽選結果がありません。</p> : history.map((h, i) => <div className="history-row" key={h.id + i}><span>{MODE_META[h.mode]?.icon ?? '✦'}</span><div><small>{MODE_META[h.mode]?.label ?? '抽選'}</small><strong>{h.summary}</strong></div><time>{new Date(h.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</time></div>)}</div>}
    </dialog>
  </main>
}

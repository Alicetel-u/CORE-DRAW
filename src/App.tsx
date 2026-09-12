import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { resolveDraw } from './core/drawEngine'
import { DrawAudio } from './core/audio'
import { createCinematicState, directDraw } from './core/cinematic'
import type { DrawMode, DrawPhase, DrawResult, Participant, QualityTier } from './core/types'
import { demoParticipants } from './data/demoParticipants'
import { DrawStage } from './scene/DrawStage'

const APP_VERSION = 'v0.5.1'

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
  single_winner: { label: 'ひとりを えらぶ', en: 'ひとり', icon: '◆', description: 'なかまから 1人を えらびます' },
  multi_winner: { label: '何人か えらぶ', en: 'ふくすう', icon: '✦', description: 'なかまから 指定した人数を えらびます' },
  ordered_list: { label: 'じゅんばんを きめる', en: 'じゅんばん', icon: '≋', description: 'なかま全員の じゅんばんを きめます' },
  top_n_ordered: { label: 'ランキングを きめる', en: 'ランキング', icon: '△', description: '上位の なかまを 順位つきで えらびます' },
  grouping: { label: 'パーティーわけ', en: 'パーティー', icon: '◇', description: 'なかまを 指定した数の パーティーに わけます' },
  shuffle_only: { label: 'ならびかえる', en: 'シャッフル', icon: '↻', description: 'なかま全員を ランダムに ならびかえます' },
}

const labels: Record<DrawPhase, string> = {
  idle: 'じゅんびは できている。',
  charging: 'ちからを あつめている…',
  mixing: 'みんなの運命を まぜている…',
  selection: 'けっかが きまりそうだ…',
  impact: '！',
  reveal: 'けっかが でた！',
  complete: 'けっかが でた！',
}

const revealHeadlines: Record<DrawMode, string> = {
  single_winner: 'ひとりが えらばれた！',
  multi_winner: 'えらばれた なかまたち！',
  ordered_list: 'じゅんばんが きまった！',
  top_n_ordered: 'ランキングが きまった！',
  grouping: 'パーティーが できた！',
  shuffle_only: 'ならびじゅんが かわった！',
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
        summary: ('name' in entry ? entry.name : undefined) ?? 'まえのけっか',
        time: entry.time ?? new Date().toISOString(),
        winnerIds: [entry.id],
      }
    })
}

function namesFor(ids: string[], participants: Participant[]) {
  const byId = new Map(participants.map((p) => [p.id, p.name]))
  return ids.map((id) => byId.get(id) ?? 'なまえなし')
}

function historySummary(result: DrawResult, participants: Participant[]) {
  if (result.mode === 'single_winner') return namesFor(result.winnerIds, participants)[0] ?? 'えらばれた人'
  if (result.mode === 'multi_winner') return `${namesFor(result.winnerIds, participants).join(' / ')} が えらばれた`
  if (result.mode === 'top_n_ordered') return `上位 ${result.winnerIds.length}人: ${namesFor(result.winnerIds, participants).join(' / ')}`
  if (result.mode === 'grouping') return `${result.groups?.length ?? 0}パーティーに わけた`
  if (result.mode === 'ordered_list') return `じゅんばん: ${namesFor(result.orderedIds.slice(0, 3), participants).join(' → ')}${result.orderedIds.length > 3 ? ' …' : ''}`
  return `ならび: ${namesFor(result.orderedIds.slice(0, 3), participants).join(' → ')}${result.orderedIds.length > 3 ? ' …' : ''}`
}

function exclusionIds(result: DrawResult) {
  return result.mode === 'single_winner' || result.mode === 'multi_winner' || result.mode === 'top_n_ordered' ? result.winnerIds : []
}

function ResultOverlay({ result, participants }: { result: DrawResult; participants: Participant[] }) {
  const byId = new Map(participants.map((p) => [p.id, p]))
  if (result.mode === 'single_winner') {
    const winner = byId.get(result.winnerIds[0])
    if (!winner) return null
    return <div className="result-overlay single-result"><span className="result-kicker">けっか</span><strong>{winner.name}</strong><small>が えらばれた！</small></div>
  }

  if (result.mode === 'grouping') {
    return <div className="result-overlay wide-result"><span className="result-kicker">パーティー</span><div className="group-result-grid">{(result.groups ?? []).map((group, groupIndex) => <section className="group-result" key={groupIndex}><h3>パーティー {groupIndex + 1}</h3>{group.map((id, i) => <div key={id}><b>{i + 1}</b><span>{byId.get(id)?.name ?? 'なまえなし'}</span></div>)}</section>)}</div></div>
  }

  const ids = result.mode === 'multi_winner' || result.mode === 'top_n_ordered' ? result.winnerIds : result.orderedIds
  const title = result.mode === 'multi_winner' ? 'えらばれた なかま' : result.mode === 'top_n_ordered' ? 'ランキング' : result.mode === 'ordered_list' ? 'じゅんばん' : 'ならびじゅん'
  return <div className={`result-overlay wide-result result-${result.mode}`}><span className="result-kicker">{title}</span><div className="ordered-result">{ids.map((id, i) => <div className="ordered-result-row" key={id}><b>{i + 1}</b><span>{byId.get(id)?.name ?? 'なまえなし'}</span>{(result.mode === 'multi_winner' || result.mode === 'top_n_ordered') && <i>★</i>}</div>)}</div></div>
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
      setError('なかまは 2〜50人で 入力してください。')
      return
    }
    if (names.some((n) => n.length > 40)) {
      setError('なまえは 40文字以内で 入力してください。')
      return
    }
    setParticipants(names.map((name, i) => ({ id: crypto.randomUUID(), name, number: i + 1 })))
    setHistory([])
    resetPresentation()
    setPanel(null)
  }

  const targetLabel = mode === 'grouping' ? 'パーティー' : mode === 'ordered_list' || mode === 'shuffle_only' ? 'なかま' : mode === 'top_n_ordered' ? '上位' : 'えらぶ人数'
  const targetValue = mode === 'single_winner' ? 1 : mode === 'multi_winner' || mode === 'top_n_ordered' ? safeWinnerCount : mode === 'grouping' ? safeGroupCount : eligible.length
  const targetUnit = mode === 'grouping' ? '組' : '人'

  return <main className={`app-shell phase-${phase} mode-${mode} ${reduced ? 'reduced' : ''}`}>
    <header className="topbar"><a className="brand" href="./"><span className="brand-symbol">◆</span> CORE <span className="brand-light">DRAW</span><span className="edition">くじびきの間 · {APP_VERSION}</span></a><div className="top-actions"><span className="live"><i /> じゅんび OK</span><button className="icon-button" onClick={() => { setSound(!sound); audio.current?.mute(!sound) }} aria-label={sound ? '効果音をオフ' : '効果音をオン'} title="おと">{sound ? '♪' : '×'}<span>おと {sound ? 'ON' : 'OFF'}</span></button><button className="icon-button fullscreen" aria-label="全画面切り替え" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen().catch(() => {}) }}>□<span>ひろげる</span></button></div></header>
    <div className="workspace"><aside className="sidebar"><div className="side-title"><span>なかま</span><span className="tiny">{participants.length}人</span></div><div className="room-heading"><h2>くじびきの間</h2><p>だれが えらばれる？</p></div>
      <button className="mode-card mode-selector" disabled={busy} onClick={() => setPanel('modes')}><span className="mode-icon">{modeMeta.icon}</span><div><strong>{modeMeta.label}</strong><span>{modeMeta.description}</span></div><span className="mode-check">えらぶ</span></button>
      {(mode === 'multi_winner' || mode === 'top_n_ordered') && <label className="mode-config"><span>{mode === 'top_n_ordered' ? '上位 何人？' : '何人 えらぶ？'}</span><input type="number" min={1} max={Math.max(1, eligible.length)} value={safeWinnerCount} disabled={busy} onChange={(e) => setWinnerCount(Number(e.target.value) || 1)} /></label>}
      {mode === 'grouping' && <label className="mode-config"><span>何パーティー？</span><input type="number" min={2} max={Math.max(2, eligible.length)} value={safeGroupCount} disabled={busy} onChange={(e) => setGroupCount(Number(e.target.value) || 2)} /></label>}
      <div className="roster-title"><span>なかま <b>{participants.length}人</b></span><button disabled={busy} onClick={() => { setDraft(participants.map((p) => p.name).join('\n')); setError(''); setPanel('participants') }}>いれかえる</button></div><div className="roster">{participants.map((p, i) => <div className={`roster-row ${revealed && result?.winnerIds.includes(p.id) ? 'chosen' : ''}`} key={p.id}><span className="avatar">{String(i + 1).padStart(2, '0')}</span><span>{p.name}</span><i className={exclude && previousWinnerIds.has(p.id) ? 'used' : ''} /></div>)}</div>
      <div className="side-bottom"><label className={`toggle-line ${!exclusionApplies ? 'disabled-toggle' : ''}`}><span>えらばれた人を 次から外す</span><input type="checkbox" checked={exclude} disabled={busy || !exclusionApplies} onChange={(e) => setExclude(e.target.checked)} /></label><button className="history-button" disabled={busy} onClick={() => setPanel('history')}><span>これまでの結果</span><span>{history.length}件</span></button><p>みんなに おなじチャンスがあります。</p></div></aside>
      <section className="stage-shell" aria-label="抽選ステージ"><div className="stage-grid" /><div className="stage-header"><span><i /> くじびきの間</span><button className="stage-mode-button" disabled={busy} onClick={() => setPanel('modes')}>{modeMeta.label} ▶</button></div><div className="scene"><DrawStage participants={orderedParticipants} winnerIds={result?.winnerIds ?? []} groups={result?.groups} mode={mode} quality={quality} cinematic={cinematic.current} revealed={revealed} /></div><div className="scene-vignette" /><div className="orbit-label left-label"><span>くじの ちから</span><b>{busy ? 'ぐるぐる…' : 'じゅんび OK'}</b><div /></div><div className="orbit-label right-label"><span>すすみぐあい</span><b>{busy ? `${Math.round(progress)}%` : '100%'}</b><div /></div>
        <div className="stage-intro"><div className="eyebrow">ぼうけんの くじびき</div><h1>{revealed ? revealHeadlines[mode] : 'さあ くじを ひこう！'}</h1><p>{labels[phase]}</p></div>
        <div className="phase-readout" aria-live="polite">{busy ? <><span className="pulse-dot" />{labels[phase]}<span className="readout-line" /></> : <><span className="diamond">◆</span>{revealed ? 'けっかが でた！' : 'いつでも ひける！'}</>}</div>
        {revealed && result && <ResultOverlay result={result} participants={participants} />}
        <div className="stage-bottom"><div className="draw-meta"><span>なかま</span><strong>{eligible.length}<small> 人</small></strong></div><div className="launch-area"><button ref={startButton} className="launch" onClick={draw} disabled={busy || eligible.length < 2}><span>▶</span>{busy ? 'くじびき中…' : revealed ? 'もういちど ひく' : 'くじを ひく'}<span>▶</span></button><div className="launch-hint">{busy ? 'ちからを あつめています…' : eligible.length < 2 ? 'なかまが 2人以上 必要です。' : revealed ? <button className="replay" onClick={() => result && play(result, true)}>▶ おなじけっかを もういちど</button> : modeMeta.description}</div></div><div className="draw-meta align-right"><span>{targetLabel}</span><strong>{targetValue}<small> {targetUnit}</small></strong></div></div>
        <div className="progress-track"><div style={{ width: `${progress}%` }} /></div></section></div>
    <footer><span>CORE DRAW <b>／</b> {APP_VERSION}</span><div><label>えのきれいさ <select aria-label="描画品質" value={quality} onChange={(e) => setQuality(e.target.value as QualityTier)}><option value="lite">かるい</option><option value="high">きれい</option><option value="ultra">さいこう</option></select></label><label className="motion-label"><input type="checkbox" checked={reduced} disabled={busy} onChange={(e) => setReduced(e.target.checked)} /> 演出をひかえめに</label></div><span className="footer-note">ぼうけんの くじびき</span></footer>
    <dialog ref={dialog} onCancel={() => setPanel(null)} onClose={() => { setPanel(null); startButton.current?.focus() }}><div className="dialog-heading"><div><span className="eyebrow">メニュー</span><h2>{panel === 'participants' ? 'なかまを いれかえる' : panel === 'modes' ? 'くじの種類を えらぶ' : 'これまでの結果'}</h2></div><button aria-label="閉じる" onClick={() => setPanel(null)}>×</button></div>
      {panel === 'participants' ? <><p>1行に1人、2〜50人まで。いれかえると これまでの結果は リセットされます。</p><textarea aria-label="参加者名（1行に1名）" value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} /><p className="error" role="alert">{error}</p><button className="launch" onClick={save}><span>▶</span>なかまを きめる<span>▶</span></button></> : panel === 'modes' ? <div className="mode-grid">{(Object.keys(MODE_META) as DrawMode[]).map((item) => <button className={`mode-option ${mode === item ? 'active' : ''}`} key={item} onClick={() => { resetPresentation(item); setPanel(null) }}><span>{MODE_META[item].icon}</span><div><strong>{MODE_META[item].label}</strong><small>{MODE_META[item].en}</small><p>{MODE_META[item].description}</p></div><i>{mode === item ? '★' : ''}</i></button>)}</div> : <div className="history-list">{history.length === 0 ? <p>まだ けっかは ありません。</p> : history.map((h, i) => <div className="history-row" key={h.id + i}><span>{MODE_META[h.mode]?.icon ?? '◆'}</span><div><small>{MODE_META[h.mode]?.label ?? 'くじびき'}</small><strong>{h.summary}</strong></div><time>{new Date(h.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</time></div>)}</div>}
    </dialog>
  </main>
}

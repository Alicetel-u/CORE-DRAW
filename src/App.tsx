import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { resolveDraw } from './core/drawEngine'
import { DrawAudio } from './core/audio'
import { createCinematicState, directDraw } from './core/cinematic'
import { canStartDraw, cycleComplete, exclusionApplies as isExclusionMode, exclusionIds, knownExcludedIds, partitionParticipants } from './core/exclusion'
import type { DrawMode, DrawPhase, DrawResult, Participant, QualityTier } from './core/types'
import { demoParticipants } from './data/demoParticipants'
const DrawStage = lazy(() => import('./scene/DrawStage').then(module => ({ default: module.DrawStage })))
import { ParticipantStatusRails } from './components/ParticipantStatusRails'

import { APP_VERSION } from './version'
import type { PresentationTheme } from './presentation/types'
import { initialTheme, PRESENTATION_THEMES } from './presentation/registry'
import { QuestRaidStage } from './themes/questRaid/QuestRaidStage'
import { QuestRaidAudio } from './themes/questRaid/QuestRaidAudio'
import { createQuestBattleScript, type QuestBattleScript } from './themes/questRaid/questRaidBattle'
import { playQuestRaidBattle, type QuestFrame } from './themes/questRaid/questRaidDirector'
import { QuestRaidTavern } from './themes/questRaid/tavern/QuestRaidTavern'
import { createTavernScript, playQuestRaidTavern, type TavernFrame, type TavernScript } from './themes/questRaid/tavern/questRaidTavernDirector'

type Panel = 'participants' | 'history' | 'modes' | null
type GroupingBasis = 'count' | 'size'
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
  grouping: { label: 'パーティーわけ', en: 'パーティー', icon: '◇', description: '組数か 1組の人数を決めて パーティーに わけます' },
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

function initialGroupingBasis(): GroupingBasis {
  const saved = read<string>('core-grouping-basis', 'count')
  return saved === 'size' ? 'size' : 'count'
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

function initialExcludedIds() {
  try {
    const stored = localStorage.getItem('core-excluded-ids')
    if (stored !== null) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
    }
  } catch {
    return []
  }
  return []
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
  const [theme, setTheme] = useState<PresentationTheme>(initialTheme)
  const [questScript, setQuestScript] = useState<QuestBattleScript | null>(null)
  const [questFrame, setQuestFrame] = useState<QuestFrame | null>(null)
  const [tavernScript, setTavernScript] = useState<TavernScript | null>(null)
  const [tavernFrame, setTavernFrame] = useState<TavernFrame | null>(null)
  const questAudio = useRef<QuestRaidAudio | null>(null)
  const tavernAdvance = useRef<(() => void) | null>(null)
  const [participants, setParticipants] = useState(initialParticipants)
  const [phase, setPhase] = useState<DrawPhase>('idle')
  const [result, setResult] = useState<DrawResult | null>(null)
  const [mode, setMode] = useState<DrawMode>('single_winner')
  const [winnerCount, setWinnerCount] = useState(2)
  const [groupCount, setGroupCount] = useState(() => read<number>('core-group-count', 2))
  const [groupingBasis, setGroupingBasis] = useState<GroupingBasis>(initialGroupingBasis)
  const [groupSize, setGroupSize] = useState(() => read<number>('core-group-size', 4))
  const [quality, setQuality] = useState<QualityTier>('high')
  const [sound, setSound] = useState(true)
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [history, setHistory] = useState<HistoryEntry[]>(initialHistory)
  const [excludedIds, setExcludedIds] = useState<string[]>(initialExcludedIds)
  const [noDuplicates, setNoDuplicates] = useState(() => read<boolean>('core-no-duplicates', false))
  const [panel, setPanel] = useState<Panel>(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const timeline = useRef<{ kill(): unknown } | null>(null)
  const audio = useRef<DrawAudio | null>(null)
  const cinematic = useRef(createCinematicState())
  const busyRef = useRef(false)
  const startButton = useRef<HTMLButtonElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const busy = phase !== 'idle' && phase !== 'complete'
  const revealed = phase === 'reveal' || phase === 'complete'
  const modeMeta = MODE_META[mode]
  const exclusionApplies = isExclusionMode(mode)
  const exclusionOn = exclusionApplies && noDuplicates
  const liveWinnerIds = revealed && result && exclusionOn ? exclusionIds(result) : []
  const { candidates: rosterCandidates, excluded: rosterExcluded, nextPool } = partitionParticipants(
    participants,
    exclusionOn ? excludedIds : [],
    liveWinnerIds,
  )
  const eligible = nextPool
  const activeExcludedCount = rosterExcluded.length
  const storedExcludedCount = knownExcludedIds(participants, excludedIds).length
  const canDrawNow = canStartDraw(eligible.length, exclusionOn)
  const cycleExhausted = cycleComplete(exclusionOn, storedExcludedCount, eligible.length)
  const safeWinnerCount = Math.max(1, Math.min(winnerCount, Math.max(1, eligible.length)))
  const groupingPopulation = participants.length
  const safeGroupCount = Math.max(2, Math.min(groupCount, Math.max(2, groupingPopulation)))
  const safeGroupSize = Math.max(1, Math.min(groupSize, Math.max(1, groupingPopulation - 1)))
  const groupCountFromSize = Math.max(2, Math.min(Math.ceil(groupingPopulation / safeGroupSize), groupingPopulation))
  const resolvedGroupCount = groupingBasis === 'size' ? groupCountFromSize : safeGroupCount
  const smallestGroupSize = Math.floor(groupingPopulation / resolvedGroupCount)
  const largestGroupSize = Math.ceil(groupingPopulation / resolvedGroupCount)
  const groupSizeSummary = smallestGroupSize === largestGroupSize ? `${smallestGroupSize}人ずつ` : `${smallestGroupSize}〜${largestGroupSize}人`
  const orderedParticipants = result ? result.orderedIds.map((id) => participants.find((p) => p.id === id)).filter((p): p is Participant => Boolean(p)) : eligible

  useEffect(() => {
    audio.current = new DrawAudio()
    questAudio.current = new QuestRaidAudio()
    return () => {
      timeline.current?.kill()
      audio.current?.dispose()
      questAudio.current?.dispose()
    }
  }, [])

  useEffect(() => {
    try { localStorage.setItem('core-presentation-theme', theme) } catch { /* Storage is optional. */ }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('core-participants', JSON.stringify(participants))
      localStorage.setItem('core-history', JSON.stringify(history))
      localStorage.setItem('core-excluded-ids', JSON.stringify(excludedIds))
      localStorage.setItem('core-no-duplicates', JSON.stringify(noDuplicates))
      localStorage.setItem('core-group-count', JSON.stringify(groupCount))
      localStorage.setItem('core-grouping-basis', JSON.stringify(groupingBasis))
      localStorage.setItem('core-group-size', JSON.stringify(groupSize))
    } catch {
      // Storage may be unavailable.
    }
  }, [participants, history, excludedIds, noDuplicates, groupCount, groupingBasis, groupSize])

  useEffect(() => {
    if (panel) dialog.current?.showModal()
    else dialog.current?.close()
  }, [panel])

  function resetPresentation(nextMode?: DrawMode) {
    timeline.current?.kill()
    busyRef.current = false
    setResult(null)
    setQuestScript(null)
    setQuestFrame(null)
    setTavernScript(null)
    setTavernFrame(null)
    tavernAdvance.current = null
    setProgress(0)
    setPhase('idle')
    Object.assign(cinematic.current, createCinematicState())
    if (nextMode) setMode(nextMode)
  }

  function resetExclusions() {
    if (busy || excludedIds.length === 0) return
    setExcludedIds([])
    resetPresentation()
  }

  function play(next: DrawResult, replay = false) {
    if (busyRef.current) return
    busyRef.current = true
    timeline.current?.kill()
    audio.current?.stop()
    questAudio.current?.stop()
    setResult(next)
    setProgress(0)

    const recordResult = () => {
      if (!replay) {
        if (noDuplicates && (next.mode === 'single_winner' || next.mode === 'multi_winner' || next.mode === 'top_n_ordered')) {
          const nextExcluded = exclusionIds(next)
          setExcludedIds((current) => Array.from(new Set([...current, ...nextExcluded])))
        }
        setHistory((h) => [{
          id: next.drawId,
          mode: next.mode,
          summary: historySummary(next, participants),
          time: next.createdAt,
          winnerIds: exclusionIds(next),
        }, ...h].slice(0, 20))
      }
    }
    const finish = () => {
      busyRef.current = false
    }
    if (theme === 'quest_raid' && next.mode === 'grouping') {
      void questAudio.current?.unlock()
      const script = createTavernScript(next, participants, reduced)
      setTavernScript(script)
      setTavernFrame(null)
      setQuestScript(null)
      setQuestFrame(null)
      setPhase('charging')
      const handle = playQuestRaidTavern(script, reduced, questAudio.current, (frame) => {
        setTavernFrame(frame)
        setProgress(script.duration ? frame.elapsed / script.duration * 100 : 100)
      }, () => { setPhase('reveal'); recordResult() }, () => { setPhase('complete'); finish() })
      timeline.current = handle
      tavernAdvance.current = () => handle.advance()
    } else if (theme === 'quest_raid') {
      void questAudio.current?.unlock()
      const script = createQuestBattleScript(next, participants)
      setQuestScript(script)
      setQuestFrame(null)
      setTavernScript(null)
      setTavernFrame(null)
      tavernAdvance.current = null
      setPhase('charging')
      timeline.current = playQuestRaidBattle(script, questAudio.current, (frame) => {
        setQuestFrame(frame)
        setProgress(frame.elapsed / script.duration * 100)
      }, () => { setPhase('reveal'); recordResult() }, () => { setPhase('complete'); finish() })
    } else {
      void audio.current?.unlock()
      timeline.current = directDraw(cinematic.current, reduced, audio.current, setPhase, recordResult, finish, setProgress)
    }
  }

  function draw() {
    if (busyRef.current || !canDrawNow) return
    play(resolveDraw({
      drawId: crypto.randomUUID(),
      mode,
      participants: eligible,
      winnerCount: mode === 'multi_winner' || mode === 'top_n_ordered' ? safeWinnerCount : undefined,
      groupCount: mode === 'grouping' ? resolvedGroupCount : undefined,
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
    setExcludedIds([])
    resetPresentation()
    setPanel(null)
  }

  const targetLabel = mode === 'grouping' ? 'パーティー' : mode === 'ordered_list' || mode === 'shuffle_only' ? 'なかま' : mode === 'top_n_ordered' ? '上位' : 'えらぶ人数'
  const targetValue = mode === 'single_winner' ? 1 : mode === 'multi_winner' || mode === 'top_n_ordered' ? safeWinnerCount : mode === 'grouping' ? resolvedGroupCount : eligible.length
  const targetUnit = mode === 'grouping' ? '組' : '人'
  function rosterRow(p: Participant, index: number, excluded = false) {
    const chosen = revealed && result?.winnerIds.includes(p.id)
    return <div className={`roster-row ${chosen ? 'chosen' : ''} ${excluded ? 'excluded' : ''}`} key={p.id}>
      <span className="avatar">{String(index + 1).padStart(2, '0')}</span>
      <span className="roster-name">{p.name}</span>
      {excluded && <span className="exclude-badge">除外</span>}
    </div>
  }

  return <main className={`app-shell phase-${phase} mode-${mode} ${theme === 'quest_raid' ? 'qr-shell' : ''} ${reduced ? 'reduced' : ''}`}>
    <span className="app-version">{APP_VERSION}</span>
    <header className="topbar">
      <a className="brand" href="./"><span className="brand-symbol">◆</span> CORE <span className="brand-light">DRAW</span><span className="edition">くじびきの間 · {APP_VERSION}</span></a>
      <div className="top-actions"><span className="live"><i /> じゅんび OK</span><button className="icon-button" onClick={() => { setSound(!sound); audio.current?.mute(!sound); questAudio.current?.mute(!sound) }} aria-label={sound ? '効果音をオフ' : '効果音をオン'} title="おと">{sound ? '♪' : '×'}<span>おと {sound ? 'ON' : 'OFF'}</span></button><button className="icon-button fullscreen" aria-label="全画面切り替え" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen().catch(() => {}) }}>□<span>ひろげる</span></button></div>
    </header>

    <div className="workspace">
      <aside className="sidebar">
        <div className="side-title"><span>なかま</span><span className="tiny">{participants.length}人</span></div>
        <div className="room-heading"><h2>くじびきの間</h2><p>だれが えらばれる？</p></div>

        <label className="theme-picker">演出<select aria-label="演出テーマ" disabled={busy} value={theme} onChange={(e) => { if (busyRef.current) return; resetPresentation(); setTheme(e.target.value as PresentationTheme) }}>{PRESENTATION_THEMES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <button className="mode-card mode-selector" disabled={busy} onClick={() => setPanel('modes')}><span className="mode-icon">{modeMeta.icon}</span><div><strong>{modeMeta.label}</strong><span>{modeMeta.description}</span></div><span className="mode-check">えらぶ</span></button>
        {(mode === 'multi_winner' || mode === 'top_n_ordered') && <label className="mode-config"><span>{mode === 'top_n_ordered' ? '上位 何人？' : '何人 えらぶ？'}</span><input type="number" min={1} max={Math.max(1, eligible.length)} value={safeWinnerCount} disabled={busy} onChange={(e) => setWinnerCount(Number(e.target.value) || 1)} /></label>}
        {mode === 'grouping' && <section className="grouping-config" aria-label="パーティーの分け方">
          <div className="grouping-config-title"><span>分け方</span><span>{participants.length}人</span></div>
          <div className="grouping-method-options" role="group" aria-label="パーティー分け方法">
            <button className={groupingBasis === 'count' ? 'active' : ''} disabled={busy} onClick={() => setGroupingBasis('count')}>組数で決める</button>
            <button className={groupingBasis === 'size' ? 'active' : ''} disabled={busy} onClick={() => setGroupingBasis('size')}>1組の人数で決める</button>
          </div>
          {groupingBasis === 'count' ? <div className="grouping-value-row"><span>何パーティー？</span><label className="grouping-value-input"><input type="number" min={2} max={Math.max(2, participants.length)} value={safeGroupCount} disabled={busy} onChange={(e) => setGroupCount(Number(e.target.value) || 2)} /><span>組</span></label></div> : <div className="grouping-value-row"><span>1組の人数</span><label className="grouping-value-input"><input type="number" min={1} max={Math.max(1, participants.length - 1)} value={safeGroupSize} disabled={busy} onChange={(e) => setGroupSize(Number(e.target.value) || 1)} /><span>人ずつ</span></label></div>}
          <p className="grouping-preview">→ <b>{resolvedGroupCount}組</b> / {groupSizeSummary}{groupingBasis === 'size' && smallestGroupSize !== largestGroupSize ? '（余りは自動で均等調整）' : ''}</p>
        </section>}

        <div className="roster-title"><span>{exclusionOn ? '抽選対象' : 'なかま'} <b>{exclusionOn ? rosterCandidates.length : participants.length}人</b></span><button disabled={busy} onClick={() => { setDraft(participants.map((p) => p.name).join('\n')); setError(''); setPanel('participants') }}>いれかえる</button></div>
        <div className="roster">
          {exclusionOn && <div className="roster-section-label"><span>候補</span><b>{rosterCandidates.length}</b></div>}
          {rosterCandidates.map((p) => rosterRow(p, participants.indexOf(p)))}
          {rosterExcluded.length > 0 && <><div className="roster-section-label excluded-label"><span>除外済み</span><b>{rosterExcluded.length}</b></div>{rosterExcluded.map((p) => rosterRow(p, participants.indexOf(p), true))}</>}
        </div>

        <div className="side-bottom">
          <section className={`draw-rule-panel ${!exclusionApplies ? 'rule-disabled' : ''}`}>
            <div className="draw-rule-heading"><span>抽選ルール</span>{exclusionOn && storedExcludedCount > 0 && <small>除外記録 {storedExcludedCount}人</small>}</div>
            {exclusionApplies ? <>
              <div className="rule-options" role="group" aria-label="抽選ルール">
                <button className={!noDuplicates ? 'active' : ''} disabled={busy} onClick={() => setNoDuplicates(false)}>毎回抽選</button>
                <button className={noDuplicates ? 'active' : ''} disabled={busy} onClick={() => setNoDuplicates(true)}>当選者除外</button>
              </div>
              <div className="rule-stats"><span>候補 <b>{rosterCandidates.length}</b>人</span><span>除外 <b>{activeExcludedCount}</b>人</span></div>
              <p>{noDuplicates ? '当選した人は、この周回では次から外れます。' : '毎回、全員を候補にして抽選します。'}</p>
              <button className="reset-exclusions" disabled={busy || storedExcludedCount === 0} onClick={resetExclusions}>↻ 除外をリセット</button>
            </> : <p className="rule-note">このモードは全員参加なので、当選者の除外設定は使いません。</p>}
          </section>

          <button className="history-button" disabled={busy} onClick={() => setPanel('history')}><span>これまでの結果</span><span>{history.length}件</span></button>
        </div>
      </aside>

      <section className="stage-shell" aria-label="抽選ステージ">
        {theme === 'core' && <div className="stage-grid" />}
        {theme !== 'quest_raid' && <div className="stage-header"><span><i /> くじびきの間</span><button className="stage-mode-button" disabled={busy} onClick={() => setPanel('modes')}>{modeMeta.label} ▶</button></div>}
        {theme === 'quest_raid' && mode === 'grouping' ? <QuestRaidTavern script={tavernScript} frame={tavernFrame} participants={participants} reduced={reduced} revealed={revealed} result={result} onAdvance={() => tavernAdvance.current?.()} action={!busy ? <div className={`qrt-actions${revealed ? ' qrt-actions-docked' : ''}`}>
          <button ref={startButton} className="qrt-launch" onClick={cycleExhausted ? resetExclusions : draw} disabled={!cycleExhausted && !canDrawNow}><span>▶</span>{cycleExhausted ? '次の周回を始める' : revealed ? 'もういちど ひく' : 'くじを ひく'}<span>▶</span></button>
          {revealed && result && <button className="qrt-replay" onClick={() => play(result, true)}>▶ おなじけっかを もういちど</button>}
          {!canDrawNow && !cycleExhausted && <p className="qrt-note">候補が 2人以上 必要です。</p>}
        </div> : null} /> : theme === 'quest_raid' ? <QuestRaidStage script={questScript} frame={questFrame} participants={rosterCandidates} reduced={reduced} result={result} revealed={revealed} action={!busy ? <div className="qr-center-actions">
          <button ref={startButton} className={`launch ${cycleExhausted ? 'cycle-reset-launch' : ''}`} onClick={cycleExhausted ? resetExclusions : draw} disabled={!cycleExhausted && !canDrawNow}><span>▶</span>{cycleExhausted ? '次の周回を始める' : revealed ? 'もういちど ひく' : 'くじを ひく'}<span>▶</span></button>
          {revealed && result && <button className="replay" onClick={() => play(result, true)}>▶ おなじけっかを もういちど</button>}
          {!canDrawNow && !cycleExhausted && <p className="qr-center-actions-note">候補が 2人以上 必要です。</p>}
        </div> : null} /> : <><div className="scene"><Suspense fallback={null}><DrawStage participants={orderedParticipants} winnerIds={result?.winnerIds ?? []} groups={result?.groups} mode={mode} quality={quality} cinematic={cinematic.current} revealed={revealed} /></Suspense></div>
        <div className="scene-vignette" />

        <ParticipantStatusRails
          participants={participants}
          mode={mode}
          result={result}
          revealed={revealed}
          excludedIds={excludedIds}
          exclusionActive={noDuplicates && exclusionApplies}
        />

        <div className="stage-intro"><div className="eyebrow">ぼうけんの くじびき</div><h1>{revealed ? revealHeadlines[mode] : cycleExhausted ? 'この周回は おしまい！' : 'さあ くじを ひこう！'}</h1><p>{revealed ? labels[phase] : cycleExhausted ? '除外をリセットすると 全員が候補に戻ります。' : labels[phase]}</p></div>
        <div className="phase-readout" aria-live="polite">{busy ? <><span className="pulse-dot" />{labels[phase]}<span className="readout-line" /></> : <><span className="diamond">◆</span>{revealed ? 'けっかが でた！' : cycleExhausted ? 'つぎの周回へ' : 'いつでも ひける！'}</>}</div>
        {revealed && result && <ResultOverlay result={result} participants={participants} />}
        </>}
        {theme !== 'quest_raid' && <div className="stage-bottom">
          <div className="draw-meta"><span>候補</span><strong>{rosterCandidates.length}<small>{exclusionOn ? ` / 除外 ${activeExcludedCount}` : ' 人'}</small></strong></div>
          <div className="launch-area">
            <button ref={startButton} className={`launch ${cycleExhausted ? 'cycle-reset-launch' : ''}`} onClick={cycleExhausted ? resetExclusions : draw} disabled={busy || (!cycleExhausted && !canDrawNow)}><span>▶</span>{busy ? 'くじびき中…' : cycleExhausted ? '次の周回を始める' : revealed ? 'もういちど ひく' : 'くじを ひく'}<span>▶</span></button>
            <div className="launch-hint">{busy ? 'ちからを あつめています…' : cycleExhausted ? '除外をリセットして 全員を候補に戻します。' : !canDrawNow ? '候補が 2人以上 必要です。' : revealed ? <button className="replay" onClick={() => result && play(result, true)}>▶ おなじけっかを もういちど</button> : exclusionOn ? '当選者除外：当選した人は次回から外れます。' : modeMeta.description}</div>
          </div>
          <div className="draw-meta align-right"><span>{targetLabel}</span><strong>{targetValue}<small> {targetUnit}</small></strong></div>
        </div>}
        {theme !== 'quest_raid' && <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>}
      </section>
    </div>

    <footer><span>CORE DRAW <b>／</b> {APP_VERSION}</span><div><label>えのきれいさ <select aria-label="描画品質" value={quality} onChange={(e) => setQuality(e.target.value as QualityTier)}><option value="lite">かるい</option><option value="high">きれい</option><option value="ultra">さいこう</option></select></label><label className="motion-label"><input type="checkbox" checked={reduced} disabled={busy} onChange={(e) => setReduced(e.target.checked)} /> 演出をひかえめに</label></div><span className="footer-note">ぼうけんの くじびき</span></footer>

    <dialog ref={dialog} onCancel={() => setPanel(null)} onClose={() => { setPanel(null); startButton.current?.focus() }}>
      <div className="dialog-heading"><div><span className="eyebrow">メニュー</span><h2>{panel === 'participants' ? 'なかまを いれかえる' : panel === 'modes' ? 'くじの種類を えらぶ' : 'これまでの結果'}</h2></div><button aria-label="閉じる" onClick={() => setPanel(null)}>×</button></div>
      {panel === 'participants' ? <><p>1行に1人、2〜50人まで。いれかえると これまでの結果と除外状態は リセットされます。</p><textarea aria-label="参加者名（1行に1名）" value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} /><p className="error" role="alert">{error}</p><button className="launch" onClick={save}><span>▶</span>なかまを きめる<span>▶</span></button></> : panel === 'modes' ? <div className="mode-grid">{(Object.keys(MODE_META) as DrawMode[]).map((item) => <button className={`mode-option ${mode === item ? 'active' : ''}`} key={item} onClick={() => { resetPresentation(item); setPanel(null) }}><span>{MODE_META[item].icon}</span><div><strong>{MODE_META[item].label}</strong><small>{MODE_META[item].en}</small><p>{MODE_META[item].description}</p></div><i>{mode === item ? '★' : ''}</i></button>)}</div> : <div className="history-list">{history.length === 0 ? <p>まだ けっかは ありません。</p> : history.map((h, i) => <div className="history-row" key={h.id + i}><span>{MODE_META[h.mode]?.icon ?? '◆'}</span><div><small>{MODE_META[h.mode]?.label ?? 'くじびき'}</small><strong>{h.summary}</strong></div><time>{new Date(h.time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</time></div>)}</div>}
    </dialog>
  </main>
}


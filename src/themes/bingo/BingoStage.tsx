import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { DrawAudio } from '../../core/audio'
import { BINGO_LETTERS, createBingo } from './bingoEngine'

export function BingoStage({ reduced, sound, onBusy }: {
  reduced: boolean; sound: boolean; onBusy: (busy: boolean) => void
}) {
  const [game, setGame] = useState(createBingo)
  const [count, setCount] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [auto, setAuto] = useState(false)
  const [interval, setIntervalSeconds] = useState(7)
  const [celebration, setCelebration] = useState(0)
  const [confirmReset, setConfirmReset] = useState(false)
  const lock = useRef(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audio = useRef<DrawAudio | null>(null)
  const busyCallback = useRef(onBusy)
  busyCallback.current = onBusy
  const called = new Set(game.balls.slice(0, count))
  const current = count ? game.balls[count - 1] : null
  const done = count === 75
  useEffect(() => {
    audio.current = new DrawAudio()
    return () => { if (timer.current) clearTimeout(timer.current); audio.current?.dispose(); busyCallback.current(false) }
  }, [])
  useEffect(() => { audio.current?.mute(sound) }, [sound])

  function drawBall() {
    if (lock.current || count >= 75) return
    lock.current = true
    setSpinning(true); setCelebration(0); setConfirmReset(false)
    busyCallback.current(true)
    void audio.current?.unlock()
    audio.current?.tone(110, .6, 0, 'sine', 440)
    timer.current = setTimeout(() => {
      setCount(count + 1); setSpinning(false)
      lock.current = false
      busyCallback.current(false)
      audio.current?.tone(660, .35); audio.current?.tone(880, .5, .08)
      if (count + 1 === 75) setAuto(false)
    }, reduced ? 180 : 1250)
  }
  useEffect(() => {
    if (!auto || spinning || done) return
    const next = setTimeout(drawBall, count ? interval * 1000 : 100)
    return () => clearTimeout(next)
  })

  function celebrate() {
    setAuto(false); setCelebration(n => n + 1); setConfirmReset(false)
    void audio.current?.unlock().then(() => audio.current?.cue('reveal'))
  }
  function reset() {
    if (lock.current) return
    setAuto(false); setCount(0); setCelebration(0); setConfirmReset(false)
    setGame(createBingo()); audio.current?.stop()
  }

  return <div className={`bingo-stage ${spinning ? 'is-spinning' : ''} ${celebration ? 'is-celebrating' : ''} ${reduced ? 'bingo-reduced' : ''}`}>
    <header className="bingo-heading"><div><span>THE LUCKY ORBIT</span><h1>BINGO <em>ビンゴ</em></h1></div><div className="bingo-counter"><b>{String(count).padStart(2, '0')}</b> / 75 球</div></header>
    <div className="bingo-layout">
      <section className="bingo-machine" aria-label="番号抽選">
        <div className="bingo-orbit"><div className="bingo-ring ring-two" /><div className="bingo-ring" /><div key={`${count}-${spinning}`} className="bingo-ball"><small>{spinning ? 'DRAWING' : current ? BINGO_LETTERS[Math.floor((current - 1) / 15)] : 'READY'}</small><strong>{spinning ? '✦' : current ?? '75'}</strong><span>{spinning ? '運命をまぜる' : current ? 'LUCKY NUMBER' : 'ひとつの数字で、世界が輝く。'}</span></div></div>
        <div className="bingo-announcement" role="status" aria-live="polite" aria-atomic="true">
          {spinning ? <><b>次のラッキーナンバーは…</b><span>光の先に、あなたの数字。</span></> : celebration ? <><b className="bingo-jackpot">BINGO!</b><span>おめでとう！ カードの番号を確認しましょう。</span></> : <><b>{done ? '全75球の抽選が終了！' : count ? `${BINGO_LETTERS[Math.floor(((current ?? 1) - 1) / 15)]} − ${current}` : 'さあ、幸運をつかもう。'}</b><span>{done ? '番号一覧でカードを確認できます。' : 'お手元のカードに、出た番号をマーク！'}</span></>}
        </div>
        <div className="bingo-controls"><button className="bingo-draw" disabled={spinning || done || auto} onClick={drawBall}>{spinning ? '抽選中…' : done ? '抽選終了' : count ? '次の番号をひく →' : 'ビンゴをはじめる →'}</button><button aria-pressed={auto} disabled={done} onClick={() => { void audio.current?.unlock(); setAuto(v => !v); setConfirmReset(false) }}>{auto ? 'Ⅱ 自動を停止' : '▷ 自動抽選'}</button></div>
        <div className="bingo-host-controls"><label>番号の表示時間 <select aria-label="自動抽選の間隔" value={interval} onChange={e => setIntervalSeconds(Number(e.target.value))}><option value={5}>5秒</option><option value={7}>7秒</option><option value={10}>10秒</option><option value={15}>15秒</option></select></label><button disabled={spinning || !count} onClick={celebrate}>✦ ビンゴ！ お祝いする</button></div>
        <p className="bingo-note">ビンゴの申告があったら自動抽選を停止し、番号一覧で確認してください。<br />停止時、抽選中の1球は最後まで表示します。</p>
        <div className="bingo-recent"><span>RECENT</span>{game.balls.slice(Math.max(0, count - 5), count).reverse().map((n, i) => <b key={n} className={i === 0 ? 'latest' : ''}>{n}</b>)}{!count && <small>抽選した番号がここに並びます</small>}</div>
        <details className="bingo-rules"><summary>遊び方・新しいゲーム</summary><p>お手元の75球式ビンゴカードを使います。1〜75の番号を重複なしで抽選。中央はFREE、縦・横・斜めのどれか1列が揃えばビンゴです。カードの確認・当選者の管理は司会者が行ってください。</p><p>新しいゲーム・画面の再読み込み・演出切り替えで抽選はリセットされます。</p><button disabled={spinning} onClick={() => { setAuto(false); setConfirmReset(true) }}>↻ 新しいゲーム</button>{confirmReset && <div className="bingo-reset-confirm"><p>出た番号をすべて消して、最初から始めますか？</p><button onClick={reset}>リセットする</button> <button onClick={() => setConfirmReset(false)}>戻る</button></div>}</details>
      </section>
      <section className="bingo-numbers" aria-label="出た番号の一覧">
        <div className="bingo-card-toolbar"><h2>出た番号 <small>NUMBER BOARD</small></h2><span>残り {75 - count} 球</span></div>
        <p className="bingo-note">点灯した番号が抽選済み。金色は、いま出た番号。</p>
        <div className="bingo-number-board">{BINGO_LETTERS.map((letter, c) => <section key={letter}><h3>{letter}<small>{c * 15 + 1}–{c * 15 + 15}</small></h3><div>{Array.from({ length: 15 }, (_, i) => c * 15 + i + 1).map(n => <span key={n} aria-label={`${n}${called.has(n) ? ' 抽選済み' : ' 未抽選'}`} className={`${called.has(n) ? 'called' : ''} ${n === current ? 'current' : ''}`}>{n}{called.has(n) && <i>✓</i>}</span>)}</div></section>)}</div>
        <details className="bingo-history"><summary>抽選順をすべて見る <span>{count} 球</span></summary><ol>{game.balls.slice(0, count).map((n, i) => <li key={n}><small>{i + 1}球目</small><b>{BINGO_LETTERS[Math.floor((n - 1) / 15)]} − {n}</b></li>)}</ol>{!count && <p className="bingo-note">まだ番号は出ていません。</p>}</details>
      </section>
    </div>
    {!!celebration && <div key={celebration} className="bingo-confetti" aria-hidden="true">{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ '--i': i, '--x': `${(i * 37) % 100}%`, '--hue': `${i % 3 === 0 ? 170 : i % 3 === 1 ? 42 : 280}` } as CSSProperties} />)}</div>}
  </div>
}

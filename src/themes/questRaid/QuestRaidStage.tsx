import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DrawResult, Participant } from '../../core/types'
import type { QuestBattleScript } from './questRaidBattle'
import type { BossPose } from './questRaidBosses'
import { normalizeEffect, paintQuestEffect } from './questRaidVfx'
import type { QuestFrame } from './questRaidDirector'
import { QuestRaidRoster } from './QuestRaidRoster'
import { QuestRaidHud } from './QuestRaidHud'
import { QuestRaidResult } from './QuestRaidResult'
import { QuestRaidBossHp } from './QuestRaidBossHp'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

const FIELD_BG = new URL('./bosses/battle-bg.png', import.meta.url).href

function px(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
}

function poseOf(frame: QuestFrame | null, age = 0): BossPose {
  const event = frame?.event
  if (!event) return 'idle'
  const fx = event.fx ?? event.duration
  if (fx > 0 && age >= fx && event.type !== 'boss_defeat' && event.type !== 'result' && event.type !== 'boss_enrage') return 'idle'
  if (event.pose) return event.pose
  if (event.type === 'boss_enrage') return 'special'
  if (event.type === 'boss_attack' || event.type === 'boss_aoe') {
    const effect = event.effect ? normalizeEffect(event.effect) : undefined
    return effect === 'slash' || effect === 'bite_impact' || effect === 'charge_impact' || effect === 'tentacle_slam' ? 'attack' : 'special'
  }
  return 'idle'
}

function paint(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  script: QuestBattleScript | null,
  frame: QuestFrame | null,
  reduced: boolean,
  sprites: Record<BossPose, HTMLImageElement | null>,
  palettes: HTMLCanvasElement[],
  background: HTMLImageElement | null,
) {
  ctx.imageSmoothingEnabled = false
  ctx.clearRect(0, 0, w, h)
  if (background) ctx.drawImage(background, 0, 0, w, h)
  else {
    ctx.fillStyle = '#08101c'
    ctx.fillRect(0, 0, w, h)
  }

  const elapsed = frame?.elapsed ?? 0
  if (!reduced) {
    ctx.fillStyle = `rgba(255,120,30,${0.04 + Math.sin(elapsed / 180) * 0.03})`
    ctx.fillRect(0, h * .42, w * .22, h * .4)
    ctx.fillRect(w * .78, h * .42, w * .22, h * .4)
  }

  if (!script || script.peaceful || !frame) return

  const { event, bossHp } = frame
  const age = elapsed - event.at
  const fx = event.fx ?? event.duration
  const settled = event.type === 'result'
  const hit = !settled && ['player_attack', 'player_spell', 'player_heal', 'player_item', 'final_strike'].includes(event.type) && age < fx
  const attacking = !settled && ['boss_attack', 'boss_aoe'].includes(event.type) && age < fx
  const death = event.type === 'boss_defeat'
  const rage = !settled && !death && bossHp <= script.boss.maxHp * .3
  const step = settled || death || reduced ? 0 : Math.floor(elapsed / (1000 / (rage ? 6 : script.boss.animation.idleFps))) % 2
  const size = Math.min(w * .52, h * .78)
  const x = (w - size) / 2 + (!reduced && hit ? (Math.floor(age / 50) % 2 ? -size * .018 : size * .018) : 0)
  const y = h * .86 - size + (reduced || settled ? 0 : attacking ? (Math.floor(age / 90) % 2) * size * .015 : step * size * .01)
  const cx = x + size / 2
  const cy = y + size / 2

  if (rage && !reduced) {
    ctx.fillStyle = 'rgba(180,20,20,0.16)'
    ctx.fillRect(0, 0, w, h)
  }

  const sprite = sprites[poseOf(frame, age)] ?? sprites.idle
  ctx.save()
  if (settled) ctx.globalAlpha = .55
  else if (death) ctx.globalAlpha = Math.max(0, 1 - age / event.duration)
  if (sprite) ctx.drawImage(sprite, x, y, size, size)
  if (!reduced && !settled && sprite && ((hit && age < 70) || rage || death && age < 220)) {
    const mask = palettes[hit && age < 70 ? 0 : 1]
    if (mask) ctx.drawImage(mask, x, y, size, size)
  }
  ctx.restore()

  if (death && !settled && !reduced) {
    for (let i = 0; i < 40; i++) {
      if ((i * 47 + age) % 110 < age / event.duration * 90) {
        px(ctx, x + (i * 53 % size), y + (i * 29 % size), Math.max(4, size / 28), '#08101c')
      }
    }
  }

  if (attacking && !reduced) paintQuestEffect(ctx, w, h, event.effect, age, fx, cx, cy, size, { bossId: script.boss.id })
  if (hit && !reduced) paintQuestEffect(ctx, w, h, event.effect ?? 'ally_shot', age, fx, cx, cy, size)
  if (hit && !reduced && event.type === 'final_strike') {
    ctx.fillStyle = 'rgba(255,236,150,0.14)'
    ctx.fillRect(0, 0, w * .34, h)
  }
}

export function QuestRaidStage({ script, frame, participants, reduced, result, revealed, action }: {
  script: QuestBattleScript | null
  frame: QuestFrame | null
  participants: Participant[]
  reduced: boolean
  result?: DrawResult | null
  revealed?: boolean
  action?: ReactNode
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const field = useRef<HTMLDivElement>(null)
  const sprites = useRef<Record<BossPose, HTMLImageElement | null>>({ idle: null, attack: null, special: null })
  const background = useRef<HTMLImageElement | null>(null)
  const palettes = useRef<HTMLCanvasElement[]>([])
  const [view, setView] = useState({ w: 640, h: 360 })
  const [art, setArt] = useState(0)
  const idleFighters = useMemo(() => participants.map(p => ({ ...p, maxHp: 100, hp: 100, maxMp: 20, mp: 20 })), [participants])

  useEffect(() => {
    const img = new Image()
    img.src = FIELD_BG
    img.onload = () => { background.current = img; setArt(n => n + 1) }
  }, [])

  useEffect(() => {
    sprites.current = { idle: null, attack: null, special: null }
    palettes.current = []
    if (!script) return
    let alive = true
    const poses: BossPose[] = ['idle', 'attack', 'special']
    for (const pose of poses) {
      const img = new Image()
      img.src = script.boss.sprites[pose]
      img.onload = () => {
        if (!alive) return
        sprites.current[pose] = img
        if (pose === 'idle') {
          palettes.current = ['#ffffffbb', '#db34343a'].map(color => {
            const mask = document.createElement('canvas')
            mask.width = img.width || 256
            mask.height = img.height || 256
            const m = mask.getContext('2d')!
            m.drawImage(img, 0, 0)
            m.globalCompositeOperation = 'source-atop'
            m.fillStyle = color
            m.fillRect(0, 0, mask.width, mask.height)
            return mask
          })
        }
        setArt(n => n + 1)
      }
    }
    return () => { alive = false }
  }, [script])

  useEffect(() => {
    const box = field.current
    if (!box) return
    const apply = () => {
      const r = box.getBoundingClientRect()
      setView({ w: Math.max(1, Math.floor(r.width)), h: Math.max(1, Math.floor(r.height)) })
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const node = canvas.current
    const ctx = node?.getContext('2d')
    if (!node || !ctx) return
    if (node.width !== view.w) node.width = view.w
    if (node.height !== view.h) node.height = view.h
    paint(ctx, view.w, view.h, script, frame, reduced, sprites.current, palettes.current, background.current)
  }, [view, frame, script, reduced, art])

  const event = frame?.event ?? { type: 'intro' as const, phase: 'INTRO' as const, at: 0, duration: 0, message: 'なかまは そろった。\nぼうけんを はじめよう！' }
  const age = frame ? frame.elapsed - event.at : 9999
  const fighters = frame?.fighters ?? script?.fighters ?? idleFighters
  const shake = !reduced && event.type.startsWith('boss_') && event.type !== 'boss_defeat' && event.type !== 'result' && age < 180
  const highlight = age < Math.max(220, event.duration)
  const density = densityFor(fighters.length)

  return <div className={`qr-stage qr-density-${density} ${reduced ? 'qr-reduced' : ''} ${shake ? 'qr-shake' : ''}`}>
    <QuestRaidRoster
      fighters={fighters}
      criticalIds={highlight ? frame?.criticalIds ?? [] : []}
      actorId={highlight ? event.actorId : undefined}
      targetIds={highlight ? event.targetIds : undefined}
      reduced={reduced}
    />
    <div className="qr-main">
      <QuestRaidBossHp
        name={script && !script.peaceful ? script.boss.name : 'QUEST RAID'}
        hp={frame?.bossHp ?? script?.boss.maxHp ?? 0}
        maxHp={script?.boss.maxHp ?? 0}
        alive={fighters.filter(f => f.hp > 0).length}
        reduced={reduced}
        peaceful={Boolean(script?.peaceful)}
      />
      <div className="qr-boss-area" ref={field}>
        <canvas ref={canvas} aria-label={script && !script.peaceful ? script.boss.name : 'QUEST RAID'} />
        {action}
        {revealed && result && <QuestRaidResult result={result} participants={participants} />}
      </div>
      <QuestRaidHud event={event} age={age} reduced={reduced} />
    </div>
  </div>
}

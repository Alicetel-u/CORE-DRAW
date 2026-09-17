import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { DrawResult, Participant } from '../../core/types'
import type { QuestBattleScript } from './questRaidBattle'
import type { BossPose } from './questRaidBosses'
import { normalizeEffect, paintQuestEffect } from './questRaidVfx'
import { ALLY_IMPACT_START, isAllySkillEffect, SUPPORT_EFFECTS } from './questRaidAllyVfx'
import { defeatBannerOpacity, paintQuestBossDefeat } from './questRaidDefeatVfx'
import type { QuestFrame } from './questRaidDirector'
import { QuestRaidRoster } from './QuestRaidRoster'
import { QuestRaidHud } from './QuestRaidHud'
import { QuestRaidResult } from './QuestRaidResult'
import { QuestRaidBossHp } from './QuestRaidBossHp'
import hostessIdle from './tavern/assets/tavern-hostess-idle.png'
import hostessPoint from './tavern/assets/tavern-hostess-point.png'
import hostessCheer from './tavern/assets/tavern-hostess-cheer.png'

function densityFor(count: number) {
  return count <= 8 ? 'few' : count <= 18 ? 'pack' : count <= 32 ? 'crowd' : 'mass'
}

const FIELD_BG = new URL('./bosses/battle-bg.png', import.meta.url).href
const HOSTESS_SPRITES = {
  idle: hostessIdle,
  point: hostessPoint,
  cheer: hostessCheer,
} as const

function poseOf(frame: QuestFrame | null, age = 0, script: QuestBattleScript | null = null): BossPose {
  const event = frame?.event
  if (!event) return 'idle'
  const fx = event.fx ?? event.duration
  if (fx > 0 && age >= fx && event.type !== 'boss_defeat' && event.type !== 'result' && event.type !== 'boss_enrage') return 'idle'
  // Crisis events can use a longer special duration for a normal attack.
  // Its original attack definition still determines the matching PNG pose.
  if (event.type === 'boss_attack' || event.type === 'boss_aoe') {
    const attack = script?.boss.attacks.find(a => a.id === event.attackId)
    if (attack) return attack.pose
  }
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
  palettes: Partial<Record<BossPose, HTMLCanvasElement[]>>,
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
  const allyAct = !settled && ['player_attack', 'player_spell', 'player_skill', 'player_heal', 'player_item', 'final_strike'].includes(event.type) && age < fx
  const impactStart = event.type === 'final_strike' ? .3 : event.effect && isAllySkillEffect(event.effect) ? ALLY_IMPACT_START[event.effect] ?? 0 : 0
  const impactAge = age - fx * impactStart
  const hit = allyAct && event.type !== 'player_heal' && !SUPPORT_EFFECTS.has(event.effect ?? '') && impactAge >= 0 && impactAge < Math.min(180, fx * .3)
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

  const pose = poseOf(frame, age, script)
  const sprite = sprites[pose] ?? sprites.idle
  const masks = palettes[pose] ?? palettes.idle
  if (death) {
    paintQuestBossDefeat(ctx, w, h, sprite, masks?.[2] ?? null, age, event.duration, x, y, size, reduced)
    return
  }
  // A defeated boss must not reappear behind the result card.
  if (settled && bossHp <= 0) return
  ctx.save()
  if (settled) ctx.globalAlpha = .55
  if (sprite) ctx.drawImage(sprite, x, y, size, size)
  if (!reduced && !settled && sprite && ((hit && impactAge < 70) || rage)) {
    const mask = masks?.[hit && impactAge < 70 ? 0 : 1]
    if (mask) ctx.drawImage(mask, x, y, size, size)
  }
  ctx.restore()

  if (attacking && !reduced) paintQuestEffect(ctx, w, h, event.effect, age, fx, cx, cy, size, { bossId: script.boss.id })
  if (allyAct && !reduced) paintQuestEffect(ctx, w, h, event.type === 'final_strike' ? 'finishing_blow' : event.effect ?? 'ally_shot', age, fx, cx, cy, size)
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
  const palettes = useRef<Partial<Record<BossPose, HTMLCanvasElement[]>>>({})
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
    palettes.current = {}
    if (!script) return
    let alive = true
    const poses: BossPose[] = ['idle', 'attack', 'special']
    for (const pose of poses) {
      const img = new Image()
      img.src = script.boss.sprites[pose]
      img.onload = () => {
        if (!alive) return
        sprites.current[pose] = img
          palettes.current[pose] = ['#ffffffbb', '#db34343a', '#fff1d5'].map((color, index) => {
            const mask = document.createElement('canvas')
            mask.width = img.width || 256
            mask.height = img.height || 256
            const m = mask.getContext('2d')!
            m.drawImage(img, 0, 0)
            m.globalCompositeOperation = index === 2 ? 'source-in' : 'source-atop'
            m.fillStyle = color
            m.fillRect(0, 0, mask.width, mask.height)
            return mask
          })
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
  const tavernMode = Boolean(script?.peaceful && (result?.mode === 'grouping' || result?.mode === 'shuffle_only'))
  const hostessPose = event.hostessPose ?? 'idle'

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
        {tavernMode && <img
          src={HOSTESS_SPRITES[hostessPose]}
          alt="酒場の店員"
          draggable={false}
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            transform: 'translateX(-50%)',
            height: '94%',
            maxWidth: '96%',
            width: 'auto',
            objectFit: 'contain',
            imageRendering: 'pixelated',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 1,
          }}
        />}
        {event.type === 'boss_defeat' && <div className="qr-defeat-banner" role="status" style={{ opacity: defeatBannerOpacity(age, event.duration, reduced) }}>
          <span aria-hidden="true">BOSS DEFEATED</span><strong>ボスを たおした！</strong>
        </div>}
        {action}
        {revealed && result && <QuestRaidResult result={result} participants={participants} />}
      </div>
      <QuestRaidHud event={event} age={age} reduced={reduced} />
    </div>
  </div>
}

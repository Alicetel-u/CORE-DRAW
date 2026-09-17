import type { DrawResult, Participant } from '../../../core/types'
import { createSeededRandom, shuffle } from '../questRaidSeed'
import {
  ASSIGN_LINES, FINALE, FINALE_RETORTS, HOSTESS_BRUSH, INTRO, ONE_LINERS, PARTY_DONE, ROLES, THEMES,
  type HostessPose, type TavernRole, type TavernTheme,
} from './questRaidTavernDialogue'

export type TavernCue = 'talk' | 'pop' | 'point' | 'complete' | 'finale' | 'none'
export type TavernBeat = {
  at: number
  duration: number
  speaker: 'hostess' | 'member'
  name?: string
  text: string
  pose: HostessPose
  partyIndex: number
  members: string[]
  revealedGroups: string[][]
  title?: string
  cue: TavernCue
  finale?: boolean
}
export type TavernScript = {
  drawId: string
  groups: string[][]
  titles: string[]
  beats: TavernBeat[]
  duration: number
}
export type TavernFrame = { beat: TavernBeat; elapsed: number; index: number; typed: boolean }

const MAX_MS = 58_000

function pick<T>(list: T[], random: () => number, used: Set<string>, key: (item: T) => string) {
  const fresh = list.filter((item) => !used.has(key(item)))
  const pool = fresh.length ? fresh : list
  const item = pool[Math.floor(random() * pool.length)]
  used.add(key(item))
  return item
}

function scaleFor(count: number) {
  if (count <= 12) return 1
  if (count <= 24) return .72
  if (count <= 36) return .52
  return .4
}

function reactionsFor(count: number) {
  if (count <= 12) return 4
  if (count <= 24) return 3
  return 2
}

function beatMs(text: string, reduced: boolean, pace: number) {
  const type = reduced ? 8 : Math.max(14, 26 * pace)
  const hold = reduced ? 240 : Math.max(320, 780 * pace)
  return Array.from(text).length * type + hold
}

export function createTavernScript(result: DrawResult, participants: Participant[], reduced = false): TavernScript {
  const groups = (result.groups ?? []).map((group) => [...group])
  const byId = new Map(participants.map((participant) => [participant.id, participant]))
  const nameOf = (id: string) => byId.get(id)?.name ?? 'なまえなし'
  const random = createSeededRandom(result.drawId + 'tavern-v1')
  const count = groups.reduce((sum, group) => sum + group.length, 0)
  const pace = reduced ? Math.min(.55, scaleFor(count)) : scaleFor(count)
  const usedLines = new Set<string>()
  const usedThemes = new Set<string>()
  const titles: string[] = []
  const beats: TavernBeat[] = []
  let t = 0
  let pose: HostessPose = 'idle'
  let revealedGroups: string[][] = []

  const push = (partial: Omit<TavernBeat, 'at' | 'duration' | 'revealedGroups' | 'members'> & { members?: string[]; duration?: number }) => {
    const text = partial.text
    const duration = partial.duration ?? beatMs(text, reduced, pace)
    beats.push({
      ...partial,
      members: partial.members ?? [],
      revealedGroups: revealedGroups.map((group) => [...group]),
      at: t,
      duration,
    })
    t += duration
  }

  const mixPose = (preferred: HostessPose): HostessPose => {
    const roll = random()
    if (roll < .12) return preferred === 'point' ? 'cheer' : preferred === 'cheer' ? 'point' : 'cheer'
    if (roll < .22) return preferred === 'idle' ? 'point' : 'idle'
    return preferred
  }

  push({ speaker: 'hostess', text: INTRO[0], pose: 'idle', partyIndex: -1, cue: 'talk' })
  pose = 'point'
  push({ speaker: 'hostess', text: INTRO[1], pose: 'point', partyIndex: -1, cue: 'point' })

  const regular = THEMES.filter((theme) => !theme.lastOnly)
  groups.forEach((group, partyIndex) => {
    const last = partyIndex === groups.length - 1 && groups.length > 1
    const leftover = THEMES.find((theme) => theme.lastOnly)
    let theme: TavernTheme
    if (last && leftover && random() < .7 && !usedThemes.has(leftover.id)) theme = leftover
    else theme = pick(regular, random, usedThemes, (item) => item.id)
    const title = theme.titles[Math.floor(random() * theme.titles.length)]
    titles[partyIndex] = title
    const members: string[] = []
    const roles = shuffle(ROLES, random)
    group.forEach((id, memberIndex) => {
      members.push(id)
      pose = mixPose('point')
      const assign = ASSIGN_LINES[Math.min(memberIndex, ASSIGN_LINES.length - 1)]
      push({ speaker: 'hostess', text: assign, pose, partyIndex, members: [...members], title, cue: 'point', duration: reduced ? 200 : Math.max(260, 520 * pace) })
      if (count <= 24) {
        push({ speaker: 'member', name: nameOf(id), text: pick(ONE_LINERS, random, usedLines, (line) => line), pose, partyIndex, members: [...members], title, cue: 'pop', duration: reduced ? 180 : Math.max(220, 400 * pace) })
      }
    })

    pose = mixPose('idle')
    for (const line of theme.hostess) {
      push({ speaker: 'hostess', text: line.replaceAll('この4人', group.length === 4 ? 'この4人' : 'このメンツ'), pose, partyIndex, members: [...members], title, cue: 'talk' })
    }

    const rare = Boolean(theme.rare) || random() < .12
    const quota = Math.min(group.length, rare ? Math.max(reactionsFor(count), 4) : reactionsFor(count))
    const spoken = theme.reactions.slice(0, quota)
    spoken.forEach((line, index) => {
      const id = group[index % group.length]
      const role = roles[index % roles.length]
      void role
      push({ speaker: 'member', name: nameOf(id), text: line, pose: mixPose('idle'), partyIndex, members: [...members], title, cue: 'talk' })
      if (theme.hostessMid?.[index]) {
        pose = mixPose('cheer')
        push({ speaker: 'hostess', text: theme.hostessMid[index], pose, partyIndex, members: [...members], title, cue: 'talk' })
      }
    })
    for (const line of theme.closer ?? []) {
      const id = group[Math.min(spoken.length, group.length - 1)]
      push({ speaker: 'member', name: nameOf(id), text: line, pose: mixPose('idle'), partyIndex, members: [...members], title, cue: 'talk' })
    }
    if (random() < .35) {
      pose = mixPose('cheer')
      push({ speaker: 'hostess', text: pick(HOSTESS_BRUSH, random, usedLines, (line) => line), pose, partyIndex, members: [...members], title, cue: 'talk' })
    }
    for (const line of theme.hostessAfter ?? []) {
      pose = mixPose('cheer')
      push({ speaker: 'hostess', text: line, pose, partyIndex, members: [...members], title, cue: 'talk' })
    }
    revealedGroups = [...revealedGroups, [...group]]
    pose = 'cheer'
    push({
      speaker: 'hostess',
      text: pick(PARTY_DONE, random, usedLines, (line) => line).replaceAll('PARTY', String(partyIndex + 1)),
      pose,
      partyIndex,
      members: [...members],
      title,
      cue: 'complete',
    })
  })

  pose = 'cheer'
  push({ speaker: 'hostess', text: pick(FINALE, random, usedLines, (line) => line), pose, partyIndex: groups.length - 1, members: groups.at(-1) ?? [], title: titles.at(-1), cue: 'finale', finale: true })
  if (count <= 24 && groups.length) {
    const last = groups[groups.length - 1]
    push({ speaker: 'member', name: nameOf(last[Math.floor(random() * last.length)]), text: pick(FINALE_RETORTS, random, usedLines, (line) => line), pose, partyIndex: groups.length - 1, members: last, title: titles.at(-1), cue: 'talk', finale: true })
  }

  if (t > MAX_MS && beats.length > 8) {
    const extra = t - MAX_MS
    const shrinkable = beats.filter((beat) => beat.duration > 280)
    const cut = extra / shrinkable.length
    t = 0
    for (const beat of beats) {
      if (beat.duration > 280) beat.duration = Math.max(220, beat.duration - cut)
      beat.at = t
      t += beat.duration
    }
  }

  return { drawId: result.drawId, groups, titles, beats, duration: t }
}

export function playQuestRaidTavern(
  script: TavernScript,
  reduced: boolean,
  audio: { cue: (type: TavernCue) => void } | null,
  onFrame: (frame: TavernFrame) => void,
  onReveal: () => void,
  onComplete: () => void,
) {
  let origin = performance.now(), extra = 0, frameId = 0, stopped = false, lastCue = -1, revealed = false, done = false
  const elapsedNow = () => Math.min(script.duration, Math.max(0, performance.now() - origin + extra))
  const indexAt = (elapsed: number) => {
    let i = 0
    while (i + 1 < script.beats.length && script.beats[i + 1].at <= elapsed) i += 1
    return i
  }
  const tick = () => {
    if (stopped) return
    const elapsed = elapsedNow()
    const index = indexAt(elapsed)
    const beat = script.beats[index]
    if (lastCue !== index) { lastCue = index; if (beat.cue !== 'none') audio?.cue(beat.cue) }
    if (beat.finale && !revealed) { revealed = true; onReveal() }
    const typed = reduced || elapsed - beat.at >= Math.min(beat.duration * .5, Math.max(160, Array.from(beat.text).length * 18))
    onFrame({ beat, elapsed, index, typed })
    if (elapsed >= script.duration) {
      if (!done) { done = true; onComplete() }
      return
    }
    frameId = requestAnimationFrame(tick)
  }
  tick()
  return {
    kill() { stopped = true; cancelAnimationFrame(frameId) },
    advance() {
      if (done || stopped) return
      const elapsed = elapsedNow()
      const index = indexAt(elapsed)
      const beat = script.beats[index]
      const typed = reduced || elapsed - beat.at >= Math.min(beat.duration * .5, Math.max(160, Array.from(beat.text).length * 18))
      const target = typed ? (script.beats[index + 1]?.at ?? script.duration) : beat.at + Math.min(beat.duration * .52, Math.max(180, Array.from(beat.text).length * 18))
      extra += Math.max(0, target - elapsed)
    },
  }
}

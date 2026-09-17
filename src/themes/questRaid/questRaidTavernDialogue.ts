import type { DrawResult } from '../../core/types'
import type { Fighter, QuestEventType, QuestPhase } from './questRaidEvents'

export type TavernHostessPose = 'idle' | 'point' | 'cheer'

export type TavernDialogueBeat = {
  type: Extract<QuestEventType, 'intro' | 'formation' | 'result'>
  phase: QuestPhase
  message: string
  pose: TavernHostessPose
  effectMs: number
  holdMs?: number
  order?: string[]
  rankById?: Record<string, number>
}

type Random = () => number

type GroupTheme = {
  setup: string
  reaction: string
  followUp: string
}

type OrderTheme = {
  setup: (position: number, total: number) => string
  reaction: string
  followUp: string
}

const GROUP_THEMES: GroupTheme[] = [
  { setup: 'このパーティ、なんだか話が早そうです♪', reaction: 'まだ誰とも話してないけど', followUp: 'そこは今から実績を作ってください♪' },
  { setup: 'かなりバランスが良さそうな気がします♪', reaction: 'どのへんが？', followUp: 'えっと……全体的な雰囲気です！' },
  { setup: '誰かが自然にまとめてくれそうです♪', reaction: '誰が？', followUp: 'それを見つけるところから冒険ですね♪' },
  { setup: '道に迷っても楽しそうな組です♪', reaction: '迷う前提なんだ', followUp: '地図も大事ですけど、思い出も大事なので♪' },
  { setup: '宝箱の前でちゃんと相談できそうです♪', reaction: 'そこ評価されるんだ', followUp: '宝箱は友情が試されますからね♪' },
  { setup: '打ち上げまで含めて完成度が高そうです♪', reaction: '冒険まだ始まってないよ', followUp: '先に楽しみを決めておくタイプなんです♪' },
  { setup: '静かでも妙に意思疎通できそうです♪', reaction: 'それ本当に分かる？', followUp: 'はい。たぶん目で会話できます♪' },
  { setup: '勢いで難所を越えそうです♪', reaction: '作戦は？', followUp: '勢いが足りなくなったら考えましょう♪' },
  { setup: '妙に安心感のある組になりそうです♪', reaction: '根拠は？', followUp: '見てたら安心してきたので、たぶん大丈夫です♪' },
  { setup: 'なんだか運命っぽい組です♪', reaction: '運命って便利だな', followUp: '説明しにくい時に、とても助かります♪' },
  { setup: '同じテーブルに座っても違和感がなさそうです♪', reaction: '基準が酒場なんだ', followUp: 'ここ酒場ですからね♪' },
  { setup: 'お名前を並べた時の響きが良い組です♪', reaction: 'そんな決め方ある？', followUp: '今日からあります♪' },
  { setup: '店員の勘が、ここだと言っています♪', reaction: 'その勘、当たるの？', followUp: '昨日はまあまあでした♪' },
  { setup: '役割は現地で自然に決まりそうです♪', reaction: '今決めないんだ', followUp: '自然発生にちょっと期待しています♪' },
  { setup: '全員それぞれ主人公っぽくて良いですね♪', reaction: 'まとまる？', followUp: 'そこが見どころです♪' },
  { setup: '困った時ほど妙に強そうな組です♪', reaction: '普段は？', followUp: '普段はのんびりでいいと思います♪' },
]

const ORDER_THEMES: OrderTheme[] = [
  { setup: (p) => `${p}番目、なんだか今日ここがしっくり来ます♪`, reaction: '今日ここって何？', followUp: '日によって変わるものなんです♪' },
  { setup: (p) => `${p}番目は、妙に安心感のある場所なんですよ♪`, reaction: '場所に安心感ある？', followUp: '今できました♪' },
  { setup: (p) => `${p}番目、酒場の床板がここだと言っています♪`, reaction: '床板に聞いたの？', followUp: 'たまに相談します♪' },
  { setup: (p) => `${p}番目に入ると、全体がきれいに見える気がします♪`, reaction: '美術の話？', followUp: '並び順にも構図ってありますから♪' },
  { setup: (p) => `${p}番目、今日は運が落ち着いて見えます♪`, reaction: '運って見えるの？', followUp: 'うっすらと。気のせいかもしれません♪' },
  { setup: (p) => `${p}番目、この位置がいちばん似合う気がします♪`, reaction: '位置が似合うって何', followUp: '立ってみると分かるタイプのやつです♪' },
  { setup: (p) => `${p}番目、なんとなく呼びやすい順になってきました♪`, reaction: '何基準で呼んでるの？', followUp: 'そこを聞くと急に難しくなります♪' },
  { setup: (p) => `${p}番目、前後のつながりがとても自然です♪`, reaction: 'まだ並んでないけど', followUp: '頭の中ではもう完成しています♪' },
  { setup: (p) => `${p}番目、この辺りにいると落ち着きそうです♪`, reaction: '本人の感想は？', followUp: '今から聞きますね♪' },
  { setup: (p) => `${p}番目、ここだけ妙に空いて見えたんです♪`, reaction: '今から埋めるんだ', followUp: 'ぴったりでした♪' },
  { setup: (p) => `${p}番目、なんとなく列が喜びそうです♪`, reaction: '列に感情あるの？', followUp: '今日の列はちょっとあります♪' },
  { setup: (p) => `${p}番目、ここに入ると完成度が上がります♪`, reaction: '何点から何点？', followUp: 'そこは気持ちで採点しています♪' },
]

const GROUP_OPENERS = [
  'それでは、パーティ分けを始めますね♪\n今日は全員、お名前を呼んで決めていきます！',
  '今日はパーティ分けですね♪\nひとりずつお呼びしますので、順番にお願いします！',
  'では編成を始めます♪\nまとめて決めたりしません。ちゃんと全員見ていきますね！',
]

const GROUP_SECOND_LINES = [
  '基準ですか？\n相性と、雰囲気と……最後はちょっとだけ勘です♪',
  '決まった方から、左のパーティ枠へ入ってもらいますね♪',
  '安心してください♪\n雑には決めません。判断基準が少し自由なだけです！',
]

const SHUFFLE_OPENERS = [
  'それでは、並び順を決めていきますね♪\nひとりずつ、ちゃんと見ていきます！',
  '今日は並び替えですね♪\n上から順番に、ひとりずつ決めていきましょう！',
  'では順番を決めますね♪\n最後の方まで、ちゃんと全員呼びますからね！',
]

const SHUFFLE_SECOND_LINES = [
  '前の方が偉いとかではないので、気楽にどうぞ♪',
  '決まった方から左上に並んでもらいますね♪',
  '金色の枠が付いたら、その位置で決定です♪',
]

const GROUP_CLOSERS = [
  'はい、全員のお名前を呼び終わりました♪\nこれでパーティ分け完了です！',
  'これで全員、行き先が決まりました♪\nみなさん、仲良く冒険してきてくださいね！',
  'はい、ひとり残らず決まりました♪\n途中の理由は少し不思議でしたけど、結果には自信あります！',
]

const SHUFFLE_CLOSERS = [
  'はい、全員の順番が決まりました♪\n上から順に、その並びでお願いします！',
  'これで全員そろいました♪\n最後までちゃんと決めましたよ！',
  'はい、並び替え完了です♪\n金枠の番号どおりで決定です！',
]

const MEMBER_REACTIONS = [
  'はい、そこね',
  '了解。行ってくる',
  'その組なんだ',
  '分かった、任せて',
  'なるほど……たぶん',
  'まあ、面白そう',
  '今の理由ちょっと気になるけど了解',
  '店員さんがそう言うなら行くよ',
  'そこに入ればいいんだね',
  'なんか冒険っぽくなってきた',
  'その勘を信じていいんだな？',
  'よし、やってみよう',
]

const MEMBER_FOLLOWUPS = [
  'はい、その調子です♪',
  '大丈夫です。たぶん良い感じになります♪',
  'ありがとうございます♪ ではそのままお願いします！',
  'えへへ、細かい理由は冒険中に見つかるかもしれません♪',
  'その反応なら、もう半分くらい成功です♪',
  'いいですね。だんだん形になってきました♪',
]

function pick<T>(items: readonly T[], random: Random) {
  return items[Math.floor(random() * items.length)]
}

function takeTheme<T>(pool: T[], source: readonly T[], random: Random) {
  if (!pool.length) pool.push(...source)
  return pool.splice(Math.floor(random() * pool.length), 1)[0]
}

function byId(fighters: Fighter[]) {
  return new Map(fighters.map((fighter) => [fighter.id, fighter]))
}

function person(name: string, line: string) {
  return `【${name}】\n「${line}」`
}

function hostess(line: string) {
  return `【店員】\n「${line}」`
}

function compactExchange(party: number, name: string, reaction: string) {
  return `【店員】\n「パーティ${party}へ、${name}さん♪」\n【${name}】\n「${reaction}」`
}

function groupingBeats(result: DrawResult, fighters: Fighter[], random: Random): TavernDialogueBeat[] {
  const lookup = byId(fighters)
  const groups = result.groups ?? []
  const originalOrder = fighters.map(fighter => fighter.id)
  const themePool: GroupTheme[] = []
  const assigned: string[] = []
  const assignedPartyById: Record<string, number> = {}
  const richConversation = fighters.length <= 16
  const beats: TavernDialogueBeat[] = [
    { type: 'intro', phase: 'INTRO', message: hostess(pick(GROUP_OPENERS, random)), pose: 'idle', effectMs: 260, holdMs: 260 },
    { type: 'formation', phase: 'SKIRMISH', message: hostess(pick(GROUP_SECOND_LINES, random)), pose: 'cheer', effectMs: 240, holdMs: 220 },
  ]

  groups.forEach((group, groupIndex) => {
    const party = groupIndex + 1
    const members = group.map(id => lookup.get(id)).filter((fighter): fighter is Fighter => Boolean(fighter))
    if (!members.length) return

    const theme = takeTheme(themePool, GROUP_THEMES, random)
    beats.push({
      type: 'formation', phase: 'SKIRMISH',
      message: hostess(`では、パーティ${party}を作りますね♪\n${theme.setup}`),
      pose: 'cheer', effectMs: 220, holdMs: 220,
    })

    members.forEach((fighter, memberIndex) => {
      assigned.push(fighter.id)
      assignedPartyById[fighter.id] = party
      const assignedSet = new Set(assigned)
      const order = [...assigned, ...originalOrder.filter(id => !assignedSet.has(id))]
      const reaction = memberIndex === 0 ? theme.reaction : pick(MEMBER_REACTIONS, random)

      // rankById is intentionally used as a transport for progressive party assignment.
      // questRaidDirector recognizes the "パーティNへ" hostess message and writes these values to fighter.party, not fighter.rank.
      if (richConversation) {
        beats.push({
          type: 'formation', phase: 'SKIRMISH',
          message: hostess(`パーティ${party}へ、${fighter.name}さん♪\nこちらへどうぞ！`),
          pose: 'point', effectMs: 170, holdMs: 120,
          order,
          rankById: { ...assignedPartyById },
        })
        beats.push({
          type: 'formation', phase: 'SKIRMISH',
          message: person(fighter.name, reaction),
          pose: 'idle', effectMs: 130, holdMs: 100,
        })
        if (members.length <= 5 || memberIndex === members.length - 1 || memberIndex % 3 === 1) {
          beats.push({
            type: 'formation', phase: 'SKIRMISH',
            message: hostess(memberIndex === members.length - 1 ? theme.followUp : pick(MEMBER_FOLLOWUPS, random)),
            pose: random() < .4 ? 'cheer' : 'idle', effectMs: 140, holdMs: 100,
          })
        }
      } else {
        beats.push({
          type: 'formation', phase: 'SKIRMISH',
          message: compactExchange(party, fighter.name, reaction),
          pose: 'point', effectMs: 150, holdMs: 80,
          order,
          rankById: { ...assignedPartyById },
        })
      }
    })

    if (!richConversation) {
      beats.push({
        type: 'formation', phase: 'SKIRMISH',
        message: hostess(`パーティ${party}、これで全員です♪\n${theme.followUp}`),
        pose: 'cheer', effectMs: 160, holdMs: 100,
      })
    }
  })

  beats.push({
    type: 'result', phase: 'RESULT', message: hostess(pick(GROUP_CLOSERS, random)), pose: 'cheer', effectMs: 260, holdMs: 360,
    order: groups.flat(),
  })
  return beats
}

function shuffleBeats(result: DrawResult, fighters: Fighter[], random: Random): TavernDialogueBeat[] {
  const lookup = byId(fighters)
  const ordered = result.orderedIds.filter((id) => lookup.has(id))
  const originalOrder = fighters.map(f => f.id)
  const themePool: OrderTheme[] = []
  const rankById: Record<string, number> = {}
  const revealed: string[] = []
  const beats: TavernDialogueBeat[] = [
    { type: 'intro', phase: 'INTRO', message: hostess(pick(SHUFFLE_OPENERS, random)), pose: 'idle', effectMs: 320, holdMs: 420 },
    { type: 'formation', phase: 'SKIRMISH', message: hostess(pick(SHUFFLE_SECOND_LINES, random)), pose: 'cheer', effectMs: 300, holdMs: 360 },
  ]

  ordered.forEach((id, index) => {
    const name = lookup.get(id)?.name
    if (!name) return
    const rank = index + 1
    const theme = takeTheme(themePool, ORDER_THEMES, random)
    revealed.push(id)
    rankById[id] = rank
    const revealedSet = new Set(revealed)
    const order = [...revealed, ...originalOrder.filter(candidate => !revealedSet.has(candidate))]

    beats.push({
      type: 'formation', phase: 'SKIRMISH',
      message: hostess(`${name}さんは${theme.setup(rank, ordered.length)}`),
      pose: 'point', effectMs: 240, holdMs: 220,
      order,
      rankById: { ...rankById },
    })

    const showReaction = ordered.length <= 10 || index === ordered.length - 1 || index % 4 === 1
    if (showReaction) {
      beats.push({ type: 'formation', phase: 'SKIRMISH', message: person(name, theme.reaction), pose: 'idle', effectMs: 180, holdMs: 180 })
      beats.push({ type: 'formation', phase: 'SKIRMISH', message: hostess(theme.followUp), pose: random() < .35 ? 'cheer' : 'idle', effectMs: 200, holdMs: 200 })
    }
  })

  beats.push({
    type: 'result', phase: 'RESULT', message: hostess(pick(SHUFFLE_CLOSERS, random)), pose: 'cheer', effectMs: 300, holdMs: 520,
    order: ordered,
    rankById: { ...rankById },
  })
  return beats
}

export function createTavernDialogue(result: DrawResult, fighters: Fighter[], random: Random): TavernDialogueBeat[] {
  return result.mode === 'grouping' ? groupingBeats(result, fighters, random) : shuffleBeats(result, fighters, random)
}

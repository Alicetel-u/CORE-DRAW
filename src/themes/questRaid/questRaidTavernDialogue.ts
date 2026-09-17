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
  { setup: 'この皆さん、なんだか話が早そうです♪', reaction: 'まだ誰とも話してないけど', followUp: 'そこはこれから仲良くなってください♪' },
  { setup: 'この組み合わせ、かなりバランスが良さそうです♪', reaction: 'どのへんが？', followUp: 'えっと……全体的な雰囲気です！' },
  { setup: 'こちら、誰かが自然にまとめてくれそうな組です♪', reaction: '誰が？', followUp: 'それを見つけるところから冒険ですね♪' },
  { setup: 'この皆さんなら、道に迷っても楽しそうです♪', reaction: '迷う前提なんだ', followUp: '地図も大事ですけど、思い出も大事なので♪' },
  { setup: 'なんとなく、宝箱の前でちゃんと相談できそうです♪', reaction: 'そこ評価されるんだ', followUp: '宝箱は友情が試されますからね♪' },
  { setup: 'この組、打ち上げまで含めて完成度が高い気がします♪', reaction: '冒険まだ始まってないよ', followUp: '先に楽しみを決めておくタイプなんです♪' },
  { setup: 'こちらは、静かでも妙に意思疎通できそうな皆さんです♪', reaction: 'それ本当に分かる？', followUp: 'はい。たぶん目で会話できます♪' },
  { setup: 'この皆さん、勢いで難所を越えそうです♪', reaction: '作戦は？', followUp: '勢いが足りなくなったら考えましょう♪' },
  { setup: 'こちら、妙に安心感のある並びになりました♪', reaction: '根拠は？', followUp: '見てたら安心してきたので、たぶん大丈夫です♪' },
  { setup: 'なんだか運命っぽいので、この皆さんでお願いします♪', reaction: '運命って便利だな', followUp: '説明しにくい時に、とても助かります♪' },
  { setup: '酒場で同じテーブルに座っても違和感がなさそうです♪', reaction: '基準が酒場なんだ', followUp: 'ここ酒場ですからね♪' },
  { setup: 'お名前を並べた時の響きがいいので、この組です♪', reaction: 'そんな決め方ある？', followUp: '今日からあります♪' },
  { setup: '店員の勘が、ここだと言っています♪', reaction: 'その勘、当たるの？', followUp: '昨日はまあまあでした♪' },
  { setup: 'この皆さん、役割は現地で自然に決まりそうです♪', reaction: '今決めないんだ', followUp: '自然発生にちょっと期待しています♪' },
  { setup: 'こちら、全員それぞれ主人公っぽくて良いですね♪', reaction: 'まとまる？', followUp: 'そこが見どころです♪' },
  { setup: 'この組は、困った時ほど妙に強そうです♪', reaction: '普段は？', followUp: '普段はのんびりでいいと思います♪' },
  { setup: 'なんとなく、この皆さんは同じタイミングで休憩しそうです♪', reaction: '冒険の基準そこ？', followUp: '休憩の相性、大事ですよ♪' },
  { setup: 'こちら、誰かがボケても誰かが拾ってくれそうです♪', reaction: '冒険の話だよね？', followUp: 'もちろんです。たぶん半分くらいは♪' },
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
  { setup: (p) => `${p}番目、この辺りにいると落ち着きそうです♪`, reaction: '本人の感想は？', followUp: 'あとで聞いておきますね♪' },
  { setup: (p) => `${p}番目、ここだけ妙に空いて見えたんです♪`, reaction: '今から埋めるんだ', followUp: 'ぴったりでした♪' },
  { setup: (p) => `${p}番目、なんとなく列が喜びそうです♪`, reaction: '列に感情あるの？', followUp: '今日の列はちょっとあります♪' },
  { setup: (p) => `${p}番目、ここに入ると完成度が上がります♪`, reaction: '何点から何点？', followUp: 'そこは気持ちで採点しています♪' },
]

const GROUP_OPENERS = [
  'それでは、パーティ分けを始めますね♪\nちゃんと考えますので、ご安心ください！',
  '今日はパーティ分けですね♪\nこういう組み合わせを考えるの、けっこう好きなんです！',
  'では皆さん、少しだけお付き合いください♪\nいい感じの組にしてみますね！',
]

const GROUP_SECOND_LINES = [
  '基準ですか？\n相性と、雰囲気と……最後はちょっとだけ勘です♪',
  'できるだけ良い感じに分けますね♪\n最後のひと押しだけ、勘に任せます！',
  '安心してください♪\n雑には決めません。ちょっと自由に決めるだけです！',
]

const SHUFFLE_OPENERS = [
  'それでは、並び順を決めていきますね♪\n前の方が偉いとかではないので気楽にどうぞ！',
  '今日は並び替えですね♪\nきれいに並ぶところを探していきます！',
  'では順番を決めましょう♪\n理由もできるだけ考えながら進めますね！',
]

const SHUFFLE_SECOND_LINES = [
  '基準ですか？\n今日は全体のバランスを大事にしてみます♪',
  '順番にはちゃんと理由があります♪\n……決めたあとに見つかることもありますけど！',
  '大丈夫です♪\n最後には、なんとなく納得できる並びになります！',
]

const GROUP_CLOSERS = [
  'はい、全パーティ決まりました♪\nかなり良い感じです。あたしの勘も喜んでます！',
  'これでパーティ完成です♪\nみなさん、仲良く冒険してきてくださいね！',
  'はい、きれいに分かれました♪\n理由は途中ちょっと怪しかったですけど、結果は自信あります！',
]

const SHUFFLE_CLOSERS = [
  'はい、並び順はこれで決まりです♪\n見てください、なんだか最初からこの順だった気がします！',
  'これで整いました♪\nうん、かなりしっくり来ています。理由はあとで考えますね！',
  'はい、こちらの順番でお願いします♪\n不思議ですね、並べたら急に正解っぽくなりました！',
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

function representativeNames(ids: string[], fighters: Map<string, Fighter>) {
  return ids.map((id) => fighters.get(id)?.name).filter((name): name is string => Boolean(name))
}

function groupingBeats(result: DrawResult, fighters: Fighter[], random: Random): TavernDialogueBeat[] {
  const lookup = byId(fighters)
  const groups = result.groups ?? []
  const themePool: GroupTheme[] = []
  const beats: TavernDialogueBeat[] = [
    { type: 'intro', phase: 'INTRO', message: hostess(pick(GROUP_OPENERS, random)), pose: 'idle', effectMs: 320, holdMs: 420 },
    { type: 'formation', phase: 'SKIRMISH', message: hostess(pick(GROUP_SECOND_LINES, random)), pose: 'cheer', effectMs: 320, holdMs: 420 },
  ]

  groups.forEach((group, index) => {
    const names = representativeNames(group, lookup)
    if (!names.length) return
    const shown = names.slice(0, Math.min(3, names.length))
    const rest = Math.max(0, names.length - shown.length)
    const call = `${index + 1}組目は、${shown.join('さん、')}さん${rest ? `たち${rest}人` : ''}でお願いします♪`
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: hostess(call), pose: 'point', effectMs: 300, holdMs: 400 })

    const theme = takeTheme(themePool, GROUP_THEMES, random)
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: hostess(theme.setup), pose: 'cheer', effectMs: 300, holdMs: 360 })
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: person(names[0], theme.reaction), pose: 'idle', effectMs: 240, holdMs: 300 })
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: hostess(theme.followUp), pose: random() < .45 ? 'cheer' : 'idle', effectMs: 280, holdMs: 360 })

    if (names.length >= 3 && fighters.length <= 16 && random() < .55) {
      const extra = pick([
        'なんか不安になってきた',
        'まあ、ちょっと面白そう',
        '店員さんが楽しそうだからいいか',
        'その自信どこから来るの？',
        'とりあえずやってみるか',
      ], random)
      beats.push({ type: 'formation', phase: 'SKIRMISH', message: person(names[1], extra), pose: 'idle', effectMs: 220, holdMs: 280 })
    }
  })

  beats.push({
    type: 'result', phase: 'RESULT', message: hostess(pick(GROUP_CLOSERS, random)), pose: 'cheer', effectMs: 320, holdMs: 560,
    order: groups.flat(),
  })
  return beats
}

function shuffleBeats(result: DrawResult, fighters: Fighter[], random: Random): TavernDialogueBeat[] {
  const lookup = byId(fighters)
  const ordered = result.orderedIds.filter((id) => lookup.has(id))
  const themePool: OrderTheme[] = []
  const beats: TavernDialogueBeat[] = [
    { type: 'intro', phase: 'INTRO', message: hostess(pick(SHUFFLE_OPENERS, random)), pose: 'idle', effectMs: 320, holdMs: 420 },
    { type: 'formation', phase: 'SKIRMISH', message: hostess(pick(SHUFFLE_SECOND_LINES, random)), pose: 'cheer', effectMs: 320, holdMs: 420 },
  ]

  const indices = ordered.length <= 7
    ? ordered.map((_, index) => index)
    : Array.from(new Set([0, 1, Math.floor(ordered.length / 2), ordered.length - 2, ordered.length - 1])).filter((index) => index >= 0 && index < ordered.length)

  for (const index of indices) {
    const id = ordered[index]
    const name = lookup.get(id)?.name
    if (!name) continue
    const theme = takeTheme(themePool, ORDER_THEMES, random)
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: hostess(`${name}さんは${theme.setup(index + 1, ordered.length)}`), pose: 'point', effectMs: 300, holdMs: 360 })
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: person(name, theme.reaction), pose: 'idle', effectMs: 220, holdMs: 280 })
    beats.push({ type: 'formation', phase: 'SKIRMISH', message: hostess(theme.followUp), pose: random() < .35 ? 'cheer' : 'idle', effectMs: 260, holdMs: 320 })
  }

  if (ordered.length > indices.length) {
    beats.push({
      type: 'formation', phase: 'SKIRMISH',
      message: hostess('残りの皆さんも、ちゃんと良い位置に収まりました♪\n途中から急に早くなったように見えるのは気のせいです！'),
      pose: 'cheer', effectMs: 300, holdMs: 400,
    })
  }

  beats.push({
    type: 'result', phase: 'RESULT', message: hostess(pick(SHUFFLE_CLOSERS, random)), pose: 'cheer', effectMs: 320, holdMs: 560,
    order: ordered,
  })
  return beats
}

export function createTavernDialogue(result: DrawResult, fighters: Fighter[], random: Random): TavernDialogueBeat[] {
  return result.mode === 'grouping' ? groupingBeats(result, fighters, random) : shuffleBeats(result, fighters, random)
}

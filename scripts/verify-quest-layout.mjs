import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const battle = [
  'src/themes/questRaid/QuestRaidStage.tsx',
  'src/themes/questRaid/QuestRaidRoster.tsx',
  'src/themes/questRaid/QuestRaidHud.tsx',
  'src/themes/questRaid/QuestRaidBossHp.tsx',
  'src/themes/questRaid/QuestRaidResult.tsx',
  'src/themes/questRaid/questRaid.css',
  'src/themes/questRaid/questRaidResult.css',
]
const banned = ['qr-parties', 'qr-party-label', 'qr-party-members', 'qr-formation-result', 'qr-docked', 'showOrder', 'qr-ordered']
for (const file of battle) {
  const text = readFileSync(file, 'utf8')
  for (const token of banned) assert.equal(text.includes(token), false, `${file} still contains ${token}`)
}
const app = readFileSync('src/App.tsx', 'utf8')
assert.match(app, /theme === 'quest_raid' && mode === 'grouping' \? <QuestRaidTavern/)
assert.match(app, /: theme === 'quest_raid' \? <QuestRaidStage/)
const tavernCss = readFileSync('src/themes/questRaid/tavern/questRaidTavern.css', 'utf8')
assert.match(tavernCss, /\.qrt-root/)
assert.equal(tavernCss.includes('.qr-window'), false)
assert.equal(tavernCss.includes('.qr-center-actions'), false)
console.log('Layout isolation passed: battle files have no grouping UI, tavern uses qrt- namespace.')

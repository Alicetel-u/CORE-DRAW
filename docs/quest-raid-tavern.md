# QUEST RAID 酒場パーティ編成コント

現行 CORE-DRAW（`origin/main` の QUEST RAID 戦闘・当選者除外・コマンド対応済み）向けの実装指示。

元指示書: ダウンロードの「CORE-DRAW QUEST RAID」酒場コント案。
この文書が実装の正本。抽選エンジンと既存戦闘は変えない。

## いまの分岐

`App.tsx` の `play()` は QUEST RAID なら常に `createQuestBattleScript()` → `QuestRaidStage`。
`grouping` / `shuffle_only` は戦闘なしの「へんせい」演出だった。

| テーマ | モード | 演出 |
|--------|--------|------|
| CORE | 全6モード | 従来の3D抽選 |
| QUEST RAID | single / multi / ordered / top_n | 戦闘（現状維持） |
| QUEST RAID | shuffle_only | 現状の非戦闘ならびかえ |
| QUEST RAID | grouping | **酒場コントへ置換** |

`resolveDraw()` → `DrawResult.groups` → 演出の順は維持する。
組数・1組人数の指定、履歴、リプレイ、効果音、Reduced Motion、当選者除外、localStorage は壊さない。
grouping は除外対象外のまま。

会話シード: `createSeededRandom(result.drawId + 'tavern-v1')`。
同じ `drawId` のリプレイはパーティも会話も同じ。新規抽選は会話だけ変わる。

## ファイル

```
src/themes/questRaid/tavern/
  QuestRaidTavern.tsx
  QuestRaidTavernHostess.tsx
  QuestRaidTavernParty.tsx
  questRaidTavernDirector.ts
  questRaidTavernDialogue.ts
  questRaidTavern.css
  assets/tavern-hostess-idle.png
  assets/tavern-hostess-point.png
  assets/tavern-hostess-cheer.png
```

PNG は差し替え前提。透過扱い。店員は中央〜右に大きく出す。

## 酒場で出さないもの

ボス、ボスHP、HP/MP、戦闘ステータス、攻撃VFX、ダメージ、討伐演出、たたかうコマンド。

## 体験

店員が変な理由で振り分ける → 名前付きでツッコむ → 店員は気にせず次へ。
全員の名前はパーティカードに出す。2〜50人。50人でも1分以内。

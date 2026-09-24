# CORE-DRAW

CORE-DRAW is a cinematic draw presentation engine for 2 to 50 participants.

The product is **not a full game**. The draw logic stays intentionally small while the presentation layer is allowed to look like a premium game event or gacha reveal.

## Product direction

- 2 to 50 participants
- single winner
- multiple winners
- ordered list / turn order
- top-N ranking
- random team grouping
- shuffle-only mode
- result is resolved before the cinematic starts
- the same persisted result can be replayed on multiple devices
- visuals should remain replaceable without coupling them to fairness logic

## Rendering stack

- React + TypeScript + Vite
- Three.js through React Three Fiber
- Drei for scene primitives/helpers
- GSAP for cinematic timing
- react-postprocessing for Bloom / vignette / impact treatment
- WebGL2-first production target

## Current experience

CORE-DRAW v0.4.0 exposes all six planned draw modes in the application UI:

- `single_winner` — one winner
- `multi_winner` — configurable number of winners
- `ordered_list` — full randomized turn order
- `top_n_ordered` — configurable ranked top-N
- `grouping` — configurable random team grouping
- `shuffle_only` — full randomized shuffle

The shared resolver stays deterministic/replayable. Result presentation is mode-aware: single winner keeps the hero-card reveal, multi/ranking modes fan selected cards into an ensemble result, ordered/shuffle modes form readable result arrays, and grouping splits entries into team columns. The readable DOM result overlay remains available even when many 3D cards are on screen.

The current cinematic timeline is still a shared CORE language. Future visual passes can make each mode more radically distinct without changing the draw contracts or fairness boundary.

## Local development

```bash
npm install
npm run dev
```

Validation:

```bash
npm run typecheck
npm run build
```

## Architecture

```text
src/
  core/
    types.ts          shared draw contracts
    drawEngine.ts     deterministic preview/replay resolver
  data/
    demoParticipants.ts
  scene/
    DrawStage.tsx     renderer composition + mode-aware staging
    CoreReactor.tsx   central draw device
    ParticipantCard.tsx
    CinematicVFX.tsx
  App.tsx             mode orchestration + result UI + GSAP timeline
  modes.css           multi-mode controls and result presentation
```

## Critical production rule

`resolveDraw()` is suitable for preview/replay scaffolding. A real production draw must be resolved and persisted server-side **before** any cinematic reveal starts. The presentation must consume an immutable result rather than decide the winner during animation.

Recommended persisted fields:

```text
drawId
mode
participant snapshot
seed / audit metadata
resolved result
createdAt
startedAt
```

## Performance philosophy

The project spends GPU budget on a short cinematic, not on game systems. Prefer:

- a small number of hero 3D objects
- instancing only when it helps
- shaders, sprites and particles for visual density
- selective post-processing
- explicit quality tiers
- mobile fallback before adding expensive effects

Avoid building physics, navigation, collision systems, world simulation or other game-engine features unless a visual beat truly needs them.

## Cinematic experience (September 2026)

The draw experience includes an orbital reactor, animated entry shards, phase-directed camera movement, impact treatment, procedural Web Audio cues, and mode-aware result staging. The base sequence lasts approximately 14 seconds. Reduced-motion mode reveals in about one second.

- Edit 2–50 participant names in the left panel (one per line, up to 40 characters).
- Switch between all six draw modes from the mode selector.
- Configure winner count for multi-winner and top-N modes.
- Configure team count for grouping mode.
- Participants and the latest 20 results are saved locally when browser storage permits.
- Optionally exclude recent winners in winner-based modes.
- Replay plays the existing result without resolving a new draw or adding history.
- Sound, full-screen, reduced motion, and LITE/HIGH/ULTRA rendering controls are available.
- LITE disables post-processing; WebGL failures fall back to a 2D core and readable result.
- All scene geometry and audio are procedural. Google Fonts are optional with system fallbacks.

This is a local event tool. The backend/persisted audit boundary above still applies to server-authoritative or regulated use. Local history is a convenience, not an audit log.

See [`ASTRA.md`](./ASTRA.md) before major implementation work.

## QUEST RAID

「演出」から **QUEST RAID** を選び、いつもの抽選ボタンを押してください。待機中・結果表示後は CORE に戻せます。抽選中は切替できません。選択はブラウザに保存されます。

- 戦闘は約10.5秒。グループ分け・シャッフルは約4.6秒の編成演出です。
- 全6モード、2〜50人。左側に人数分のステータス窓を出します。
- ボスは通常・攻撃・特殊の3ポーズを切り替えます。
- 「おなじけっかを もういちど」で、同じボス・戦闘を再生します。履歴は増えません。
- 効果音と「演出をひかえめに」は既存の設定で操作できます。
- バージョンは `package.json` を唯一の値として `src/version.ts` から表示します。
- 戦闘の検証: `node scripts/verify-quest-raid.mjs`（Node.js 24以上）


## Bingo presentation

Select **BINGO / ビンゴ** in the presentation picker. This is a 75-ball caller for physical cards supplied by the host; participant registration is unnecessary. It provides manual draws, automatic draws with 5/7/10/15-second reading intervals, a complete called-number board, ordered history, sound, reduced motion, and a host-triggered celebration that pauses automatic drawing. The host verifies bingo claims against the board.

All 75 numbers are shuffled before the first reveal using cryptographic randomness and unbiased Fisher–Yates choices. Each number appears once. Stopping automatic mode lets an in-progress ball finish. A new game requires an inline reset confirmation; reloading or switching presentations also clears the game. Existing gacha and raid results are separate.

Validation: `node verify-bingo.mjs` and `npm run build`.

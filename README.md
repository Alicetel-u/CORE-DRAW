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

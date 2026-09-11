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

## Current starter scene

The repository includes a deliberately simple visual prototype:

- central `CoreReactor`
- generated participant cards
- 12 demo participants
- deterministic/replayable draw resolver
- cinematic phase state machine
- HIGH / ULTRA / LITE quality presets
- local single-winner preview

This is scaffolding, **not the final visual design**.

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
    DrawStage.tsx     renderer composition
    CoreReactor.tsx   placeholder draw device
    ParticipantCard.tsx
  App.tsx             demo orchestration + GSAP timeline
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

## Next implementation target

Astra should turn the current scaffold into the first production-quality **single-winner cinematic** before adding every draw mode. Finish one polished 10–20 second sequence, validate desktop/mobile performance, then reuse that visual language for ranking and team-grouping sequences.

See [`ASTRA.md`](./ASTRA.md) before major implementation work.

## Cinematic experience (September 2026)

The single-winner experience now includes an orbital reactor, animated entry shards,
phase-directed camera movement, a gold winner reveal, and procedural Web Audio cues.
The sequence lasts approximately 11 seconds. Reduced-motion mode reveals in one second.

- Edit 2–50 participant names in the left panel (one per line, up to 40 characters).
- Participants and the latest 20 results are saved locally when browser storage permits.
- Optionally exclude recent winners. Editing the roster starts a new history.
- Replay plays the existing result without resolving a new draw or adding history.
- Sound, full-screen, reduced motion, and LITE/HIGH/ULTRA rendering controls are available.
- LITE disables post-processing; WebGL failures fall back to a 2D core and readable result.
- All scene geometry and audio are procedural. Google Fonts are optional with system fallbacks.

This is a local event tool. The backend/persisted audit boundary above still applies to
server-authoritative or regulated use. Local history is a convenience, not an audit log.

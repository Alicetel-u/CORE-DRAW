# ASTRA IMPLEMENTATION CONTRACT

This repository is prepared for a high-end cinematic draw presentation system.

## North star

Do **not** turn CORE-DRAW into a normal game project. There is no player movement, combat, map or gameplay loop. The product value is the short cinematic reveal around a very simple draw.

Think of each draw as a realtime generated 10–20 second game trailer.

## Non-negotiable boundaries

1. Draw fairness and draw presentation must stay separate.
2. A winner/order/group result is resolved before reveal playback.
3. Animation code must never silently re-roll a result.
4. Support 2–50 participants.
5. Preserve mobile support while increasing visual quality.
6. Do not make WebGPU mandatory for production.
7. Expensive effects must have LITE/HIGH/ULTRA fallbacks.
8. Avoid dependencies that duplicate existing Three/R3F/GSAP responsibilities without a clear benefit.

## Visual target

The final experience should feel closer to a premium game event / rare gacha reveal than to a website animation.

Prioritize:

- authored camera choreography
- controlled darkness and contrast
- emissive materials
- custom shaders where they visibly matter
- high-quality particles and debris
- reveal timing and deliberate silence
- impact distortion and selective post FX
- a distinctive CORE silhouette
- a distinctive participant-card silhouette
- a strong winner transformation

Do not equate quality with adding more objects. Quality should come from composition, timing, material response, camera movement, lighting and sound.

## Draw modes

The shared logic already models:

- `single_winner`
- `multi_winner`
- `ordered_list`
- `top_n_ordered`
- `grouping`
- `shuffle_only`

Create different cinematic grammar for each mode rather than forcing every mode through the exact same CORE sequence.

Suggested families:

- single/multi winner: gacha / awakening reveal
- ordered list: ranking / lane formation
- grouping: portal / gate split

## First milestone

Polish only `single_winner` first.

Target sequence:

1. calm idle tableau
2. CORE activation
3. participant-card acceleration / orbit
4. compression or absorption beat
5. short anticipation beat
6. impact
7. winner card transformation and hero reveal
8. settle to readable result state

The exact concept can change if a stronger original direction is found. Avoid copying a specific commercial game's presentation.

## Performance

The scene has at most 50 participant cards. Do not prematurely optimize cards at the expense of art direction.

Profile the expensive parts first, especially:

- device pixel ratio
- transparent materials
- shadow maps
- environment maps
- post-processing resolution
- particle overdraw
- blur / DOF
- repeated allocations inside `useFrame`

Prefer object reuse and preallocated vectors in hot loops.

## Production backend boundary

The current `resolveDraw()` function is a preview/replay scaffold. Production should introduce a backend or authoritative service that returns an immutable `DrawResult`.

The renderer should be able to receive that result and replay the same cinematic without changing who won.

## Working style

Before large visual rewrites:

- keep the current project runnable
- make changes in coherent commits
- run typecheck/build
- preserve the draw contracts unless migration is intentional
- document any new asset pipeline or renderer requirement

The placeholder CORE and cards are intentionally replaceable. Treat them as mounting points, not approved final art.

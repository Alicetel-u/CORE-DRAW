# QUEST RAID VFX

Run `npm run dev:vite`, then open `/quest-raid-vfx.html` on that server.
This standalone development entry is not linked by the game or included in the
production build. It renders the actual `QuestRaidStage` and Canvas effects.
Use pause, the progress slider, 5% steps, playback speed, boss selection and the
reduced-motion checkbox to inspect an effect. The verification button exercises
all effects on a real browser Canvas, including legacy aliases and frame replay.

`src/themes/questRaid/questRaidVfx.ts` exports:

- `QUEST_VFX`: the exhaustive catalogue with Japanese labels, category, suggested
  boss/pose, and whether an effect is reserved for future use.
- `paintQuestEffect(ctx, width, height, effect, age, duration, cx, cy, size, options)`:
  stateless rendering in logical Canvas pixels. `cx/cy/size` describe the boss's
  existing drawing box. `options.bossId` selects the demon's claw variant.
- `normalizeEffect`: preserves `fire`, `bolt`, `spell`, `roar` replay aliases.

All 17 existing effect IDs are retained. Twelve reserved effects are available:
`ice_lance`, `frost_nova`, `meteor`, `poison_mist`, `water_surge`, `earth_spike`,
`holy_nova`, `soul_drain`, `arcane_missile`, `wind_vortex`, `thunder_storm`,
`phoenix_flare`. They are not yet assigned to attacks. To adopt one later, set the
skill/attack's `effect` and appropriate pose; do not change draw/winner logic.

Effects have an entrance and a fade-out and draw nothing outside `0 < age < duration`.
They allocate no images, use no random state/timers and restore Canvas state.
Loops are bounded. Clouds, faceted solids, tapered filled crescents and layered
flame silhouettes supply the volume; glowing points and stroked wireframes are
not the primary material. PNG assets remain untouched. The adopted dragon's
right-facing mouth is used as the breath origin.

The stage continues to suppress VFX when reduced motion is selected, and keeps
the existing sprite sampling, battle timeline, party UI and result UI.

Checks: `npm run typecheck`, `npm run build`, `node scripts/verify-quest-raid.mjs`,
then the browser preview's verification button. The last check uses real Canvas
pixel output rather than a mocked graphics context.

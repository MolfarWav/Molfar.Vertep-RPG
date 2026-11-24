# AGENTS.md: RPG app

Optional app of Molfar Vertep (repo `MolfarWav/Molfar.Vertep-RPG`). Plan and decisions live in the engine repo:
`.fork/handoff/rpg-layer/STEP1-CORE.md` and, outside any repo, the owner's `PLAN.md` (rev 2, 2026-11-11) with its mocks.

## Rules
- English in code, comments, commits and repo files. No model names in commits, files or PRs. No personal identifiers
  or workspace data in the repo (it is public). Do not commit `bun.lock`.
- Code judges, the model proposes. Dice, hits, HP and order are code only (`src/rules/`). A model's numbers always go through
  `cleanSheet`. Effects are keys with numbers (`heal:18`); data never adds code.
- Every number of the rules is in `src/rules/tuning.ts`. Do not tune silently to pass a test or a balance target: report it.
- A change to what a user sees updates its guide page in the same change (`.skills/guide/pages/`, format in the engine repo
  `.fork/handoff/guide/FORMAT.md`) once the app has UI.
- Roleplay is read through `manifest.reads` only, never written. The handoff is an extension, never a dependency.

## Data folder
`data/` has to exist in the repository (`data/README.md` holds it): the engine only lets a plugin write inside an existing `data/` of its app. Without it every save fails with "path resolves outside app data dir" (found by a run in a real engine, 2026-11-24).

## Layout
- `src/rules/`: pure TypeScript, no DOM, no model, seeded RNG. `sheet.ts` (sheet, budget, levels, table sheet), `resolve.ts`
  (one round), `injuries.ts`, `defeat.ts`, `ai.ts` (code opponent), `tuning.ts`, `types.ts`.
- `src/main.tsx`, `src/shell/` (tabs), `src/screens/party/` (list and sheet), `src/screens/battle/` (battle, body figure, log), `src/screens/muster/` (backpack, belt, inspector), `src/lib/kits.ts` (what each fighter carries; pure move functions and the store), `src/data/items.ts` (example item kinds, both languages), `src/components/`, `src/data/` (example party, encounter, skins), `src/i18n/` (en and uk strings), `src/styles/` (tokens: themes vertep, dark, light), `plugins/sheets/` (stores sheets).
- A new string goes into both languages in `src/i18n/strings.ts`; `test/skeleton.test.ts` fails otherwise. `bun run preview` shows the screens on example data (`?screen=party|battle`, `&theme=`, `&lang=`, `&skin=`).
- `src/contract/` (the contract with Roleplay: types, `parseEncounter`, `parseResult`, and `build.ts`: sheets of a chat party, the result and its summary), `src/rules/foes.ts` (opponents' numbers from level and archetype), `plugins/encounters/` (reads Roleplay's outbox, keeps results), `src/lib/encounter.ts` and `src/lib/shell-bridge.ts` (hear the id, open Roleplay). The contract files in `docs/contract/v0.1` are the examples both apps test with: Roleplay keeps copies; change both together.
- `test/rules/`: bun tests. `scripts/sim.ts`: the simulator. `fixtures/`: sides for it. `docs/BALANCE.md`: its table.

## Checks
`bun run typecheck`, `bun test`, and the simulator when a number changes.

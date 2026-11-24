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

## Layout
- `src/rules/`: pure TypeScript, no DOM, no model, seeded RNG. `sheet.ts` (sheet, budget, levels, table sheet), `resolve.ts`
  (one round), `injuries.ts`, `defeat.ts`, `ai.ts` (code opponent), `tuning.ts`, `types.ts`.
- `test/rules/`: bun tests. `scripts/sim.ts`: the simulator. `fixtures/`: sides for it. `docs/BALANCE.md`: its table.

## Checks
`bun run typecheck`, `bun test`, and the simulator when a number changes.

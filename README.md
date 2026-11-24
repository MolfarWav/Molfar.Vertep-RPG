# Molfar Vertep: RPG

An optional app for [Molfar Vertep](https://github.com/MolfarWav/Molfar.Vertep), a companion to Roleplay: character sheets with
levels, and (later) turn-based combat, muster (backpack and belt) and a handoff to and from a Roleplay chat. Roleplay
works fully without it.

Status: the rules library is built and tested (`src/rules/`). The app shell is not built yet.

- Rules: five stats (`might`, `agility`, `endurance`, `wits`, `spirit`), levels 1 to 10 with XP and free points, HP from
  endurance and level, five strike zones with two guard points, injuries that last after the fight, a four-step defeat ladder.
- Code judges, a model only proposes: every number from a model or a user goes through `cleanSheet`.
- Checks: `bun run typecheck`, `bun test`, `bun run sim -- --n 10000 --a fixtures/party4.json --b fixtures/goblins2.json`.
- Balance report: `docs/BALANCE.md`.

This is a separate app of the Molfar Vertep family; licensed AGPL-3.0, see `LICENSE`.

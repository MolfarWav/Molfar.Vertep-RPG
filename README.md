# Molfar Vertep: RPG

An optional app for [Molfar Vertep](https://github.com/MolfarWav/Molfar.Vertep), a companion to Roleplay: character sheets with
levels, and (later) turn-based combat, muster (backpack and belt) and a handoff to and from a Roleplay chat. Roleplay
works fully without it.

Hand-over with Roleplay: `docs/contract/README.md`.

Status: the rules library (`src/rules/`) and the first screens (Party with the sheet, Battle on an example encounter) are built and tested. Sheets from Roleplay cards, the handoff to and from a chat and the muster screen are not built yet. Plan of the screens: `docs/UI-P3.md`.

- Run the screens: `bun run preview`, then open `http://localhost:4175/?screen=party` (a design preview on example data; add `&theme=light`, `&lang=uk`, `&skin=cyberpunk`).
- Rules: five stats (`might`, `agility`, `endurance`, `wits`, `spirit`), levels 1 to 10 with XP and free points, HP from
  endurance and level, five strike zones with two guard points, injuries that last after the fight, a four-step defeat ladder.
- Code judges, a model only proposes: every number from a model or a user goes through `cleanSheet`.
- Checks: `bun run typecheck`, `bun test`, `bun run sim -- --n 10000 --a fixtures/party4.json --b fixtures/goblins2.json`.
- Balance report: `docs/BALANCE.md`.

This is a separate app of the Molfar Vertep family; licensed AGPL-3.0, see `LICENSE`.

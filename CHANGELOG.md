# Changelog

## Unreleased
- The hand-over with Roleplay (contract 0.1, `docs/contract`): the app reads the fight a chat left (`rpg-outbox/<id>.json`, through the manifest `reads`), opens on the muster with the chat's party (sheets from the table and the Soul numbers, kept per chat and person), gives the opponents numbers by level and archetype, and on the way back saves the result (`results/<id>.json`) and opens Roleplay on the same id. An engine that does not pass the id: the app finds a waiting fight itself and offers it in a banner. Needs engine 1.22 or newer for the id; older engines still work through the banner.
- The muster screen: a backpack with search, filters and scrolling, a belt of three slots, an item inspector, the rule that the belt closes with the first round. The battle takes the kit from the muster.
- The Battle screen follows the owner's mockup: turn strip, party cards with choices, field, four action tabs (strike, magic, block, inventory), round log, chat draft, dashboard status switch, optional data-source marks.
- App shell and the first screens: Party (sheet with stats, free points, skills, XP and Level up) and Battle (example encounter, strike zones, guard, magic, flee, log, outcome); themes follow the shell, English and Ukrainian, the `sheets` plugin saves sheets. Wits and spirit scale magic in the rules.
- Rules library (`src/rules/`): sheet and budget, levels with XP and free points, strike zones and guard, injuries and
  healing, defeat ladder, code opponent, seeded RNG; simulator and first balance report. No app shell yet.

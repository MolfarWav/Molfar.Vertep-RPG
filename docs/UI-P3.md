# P3 screens: UI plan and what was built

Look: the owner's mockups (dark, red accent, serif headings, mono numbers, cyan main button), kept as the `vertep` theme;
`dark` and `light` follow the shell. Phone below 768 px: bottom tabs, one column, 44 px targets.

## Plan (before the code)
- Where: the app's own tabs, "Party" and "Battle". From the app's start: Party is open, a sheet is one tap (phone) or already
  shown (desktop); Battle is one tap.
- Party: list of characters (avatar, name, role, level, HP) and the sheet beside it (desktop) or as a page (phone). Layout
  variants: A list and detail (picked: the sheet has room, and it is how Social works); B grid of party cards (a sheet does not
  fit a card). Sheet blocks: head, health and experience, stats (+ per stat while points are free), skills, purse, "why these
  numbers". Free points are a visible counter; "Level up" appears only when the XP is there.
- Battle: field (party and enemies, the target is picked by tapping), action panel with tabs Strike, Magic (only for a fighter
  with powers) and Block, footer with the chosen action and the main button, round log on the right (below on a phone).
- States: empty (no sheets: says what a sheet is, offers the example party), loading, engine error with its text, saved chip,
  no free points (a line says why every "+" is off), level-up ready, fighter down or fled, battle over (outcome, defeat step,
  "Fight again").
- Reused: nothing from other apps (a separate repo); the theme and language code follow Social's pattern.

## Built
- Sheet: the rules library drives every number (`src/rules`); changes save through the `sheets` plugin after 0.4 s.
- Battle on a made-up encounter with the real rules: whole party or only the hero, strike zone and two guard points, powers
  (wits scale harmful ones, spirit helping ones), flee, skip, log, outcome with the defeat step.
- Skins: the words for block, powers and field change per skin (`?skin=cyberpunk` in a preview); numbers do not.
- Both languages (en, uk), a test that keys match and that every key the UI uses exists.

## Not built (on purpose or later)
- Sheets from a Roleplay card and a model (P4, with the Fight button and the encounter builder).
- The muster screen and the Inventory tab (P5). Items on a belt can be used by the rules but have no screen yet.
- A skin switch inside the app (a skin will come with the encounter), a theme switch (follows the shell), corner ornaments,
  the turn-order strip and the source marks of the mockups.
- The summary that goes back to the chat (P2, P4); the "Save as default into the card" button (a Roleplay-side write).
- Not run: a real engine (the preview runs on example data), a real phone, drag and drop.

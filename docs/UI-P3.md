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
- Battle, rebuilt to the owner's mockup (B v3, desktop frame; checked control by control against its text):
  - header with the contract chip, "flee allowed", the defeat step and the round; the scene line from the chat's sensor;
  - the turn strip (portraits with HP, a tick for who has chosen, the active one outlined);
  - party cards (avatar, name and "your hero" or "acting", gear and injuries, HP bar, the chosen "strike, block" line, "ally
    on code", "timid, may flee (from the Soul)", "resolved together with the enemy");
  - the field (party left, enemies right, place in the middle, "A -> B, tap an enemy to change the target");
  - "Action and defence" with the four tabs Strike, Magic (only with powers), Block, Inventory: body figure and the legend,
    zones with multipliers, hints and hit chance, Random; powers with "instead of strike" and the target; the guard zones;
    backpack (costs 1 block point) and belt (free, locked in battle);
  - the chosen-action chips, Fight, Skip, Flee, and the note that code keeps the choices;
  - right column: round log with icons, "What goes to the chat" draft with Send summary, "Status in the dashboard" on and off,
    "Who you control" (whole party or only my hero);
  - "Data sources" marks (code, sensor, card, example) behind a switch, off by default (`?sources=1` pins them on).
  - Phone: the turn strip scrolls sideways, party cards are hidden (the strip and the field carry their state), the footer with
    the chosen action and the main button is compact and stays above the tabs, tabs are shortened.
- Battle runs on a made-up encounter with the real rules: whole party or only the hero, strike zone and two guard points, powers
  (wits scale harmful ones, spirit helping ones), items from the backpack and the belt, flee, skip, log, outcome with the defeat step.
- Skins: the words for block, powers and field change per skin (`?skin=cyberpunk` in a preview); numbers do not.
- Both languages (en, uk), a test that keys match and that every key the UI uses exists; the example items have both languages too.

## Muster screen (P5, built to the mockup B v5)
- A tab "Muster" and a "Muster" button in the battle header while no round has been played; "To battle!" goes back.
- Header with "before the fight", "belt open" or "belt locked", the rule line, the scene line; a selector for whose muster it is
  (every fighter has their own backpack and belt).
- Backpack: search, filters (all, weapons, medicine, misc), the counter "shown N of M", a scrolling list (17 example items so the
  search and the scroll have work to do), empty and no-match states; each row shows the cost "-1 block".
- Hero card with the belt counter, the belt of three slots (items cost 0, free slots drawn dashed), the note "add only here".
- Inspect: icon, name, effect, both costs (backpack -1 block, belt 0), the lore line (card), "from: ... left: N pcs" (example),
  buttons "To belt" and "To backpack" with the reason in text when a move is refused (belt full, fight begun), and a live line
  that says what moved. On a phone the inspector scrolls into view when an item is tapped; the footer with "To battle!" is sticky.
- The belt and the backpack go into the fight as they are: the battle follows the muster until the first round, and after it the
  muster shows "belt locked" and refuses every move. Kits are kept in this browser (`rpg:kits`).
- Real characters start with an empty backpack; the example heroes have the example kit. Items found in a fight go into the
  backpack only when the loot handoff exists (P4).

## Not built (on purpose or later)
- Sheets from a Roleplay card and a model (P4, with the Fight button and the encounter builder).
- Send summary and the dashboard status are drawn and the status switch is remembered, but nothing is sent: they need the
  chat handoff (P2, P4). The button says why it is off.
- Items whose effect the rules do not know yet (the crooked knife, "strike x1.15") are listed and disabled with the reason.
- Magic effects in the mockup that the rules do not have as one effect: "Spark x1.2 + burn" is two effects; the example
  Spark only hurts, and fog is a hit penalty for one round.
- A skin switch inside the app (a skin will come with the encounter), a theme switch (follows the shell), corner ornaments,
  the enemy background picture.
- Not run: a real engine (the preview runs on example data), a real phone, drag and drop.

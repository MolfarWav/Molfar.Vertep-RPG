# Contract between Roleplay and the RPG app

Version 0.1. The two apps update separately, so each checks what it reads.

- Roleplay writes an **encounter** to its own data: `rpg-outbox/<id>.json`. The RPG app reads it through its manifest `reads`.
- The RPG app writes a **result** to its own data: `results/<id>.json`. Roleplay reads it through its own `reads`.
- Neither app writes into the other's data. The id travels through the shell, `molfarShell.openApp(app, id)`, and is heard with
  `molfarShell.onView`. An engine older than that opens the app without the id: both apps then look for a waiting file themselves.
- The id is a view name: a letter first, then lower-case letters, digits and dashes, 32 at most. Roleplay makes `enc-<time in base 36>-<4 random>`.
- An unknown major version is refused in plain words; every text is cut, every number clamped, every list capped.
- `encounter.example.json` and `result.example.json` are the files both sides test their checks with. Roleplay keeps copies of them.

Fields: see `src/contract/index.ts` (the types and `parseEncounter`, `parseResult`).

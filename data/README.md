# The RPG app's data

This folder is the app's own data. It has to exist in the repository: the engine only lets a plugin write inside an existing `data/`
folder of its app, and a missing one makes every save fail with "path resolves outside app data dir".

- `sheets/<id>.json`: one saved sheet (`{ sheet, proposal }`), written by `plugins/sheets`. A sheet made for a person of a chat has the
  id `s-<hash of the chat>-<person id>`; the example party has ids that start with `ex-`.
- `results/<encounter id>.json`: the result of a fight from a chat (contract 0.1, `docs/contract/`), written by `plugins/encounters`.
  Roleplay reads it through its own manifest `reads`; this app never writes into Roleplay's data.

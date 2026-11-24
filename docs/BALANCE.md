# Balance (rules v0)

Made with `bun run sim`, 10,000 seeded battles each, seed 1, both sides led by the code opponent (`src/rules/ai.ts`).
Numbers live in `src/rules/tuning.ts`. This is a report, not a tuning: nothing was changed to move these values.

| Matchup | Options | A wins | A loses | Fled or aborted | Mean rounds | Mean injuries on A |
| --- | --- | --- | --- | --- | --- | --- |
| party4 (level 3 x4) vs goblins2 (level 2 x2) | flee allowed, defeat step 2 | 100.0% | 0.0% | 0.0% | 3.50 | 1.66 |
| party4 vs goblins2 | defeat step 4 | 100.0% | 0.0% | 0.0% | 3.50 | 1.66 |
| party4 vs party4 (mirror) | flee forbidden | 49.0% | 51.0% | 0.0% | 8.36 | 7.03 |

Target from the task (not a gate): the mirror match within 45 to 55% and under 12 mean rounds. Met: 49.0% and 8.36.

Read with care:
- A mutual knock-out in one round counts as a loss for A (`outcomeOf`), which is why the mirror leans 49/51.
- Party4 against two goblins is a walk-over: four level-3 fighters against two level-2. The goblin fixture needs a
  harder counterpart (more foes or higher levels) before it says anything about difficulty. Not adjusted here.
- Injuries are frequent in the mirror (7 for four fighters over about 8 rounds): a quarter of max HP is a low bar when
  strikes land at 85 percent. Worth a look when the numbers are tuned.
- `wits` and `spirit` have no effect in a fight yet, so the fixtures do not test them.
- The deadly step changes nothing in these tables because the party never goes down in the goblin matchup.

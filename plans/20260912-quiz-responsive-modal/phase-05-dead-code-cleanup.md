---
phase: 5
title: "Dead code cleanup"
status: pending
priority: P3
effort: "3h"
dependencies: [3, 4]
---

# Phase 5: Dead code cleanup

## Overview

Remove the abandoned Phaser quiz implementation and other unreferenced files, so future work
cannot mistake dead code for a live fallback. Deliberately last: deleting before the
replacement is proven removes the escape hatch.

## Requirements

- Functional: no behaviour change whatsoever. This phase is pure subtraction.
- Non-functional: every deletion is justified by a verified absence of callers, not by
  inspection alone.

## Architecture

Four groups, in ascending risk.

**1. `src/scenes/uiScene.ts` — unreferenced scene.** Registered in `game.ts` but never
started: `grep -rn "launch('UIScene')\|start('UIScene')" src/` returns nothing. The live HUD is
the DOM overlay built at `gameScene.ts:2274-2320`. The Phaser text at `uiScene.ts:42,78` never
renders. Delete the file and its entry in the `game.ts` scene array.

Note: the doubled HUD text in the original bug screenshots was **not** this scene — it is
`text-shadow: 2px 2px 4px #000` from `gameScene.ts:2286-2288` plus photograph artefacts. The
scene is dead for an unrelated reason.

**2. Phaser answer buttons inside `createQuizUI()`.** `createQuizUI()` (`:213`) is live and
must survive — it owns `cleanupChoiceImages()`, `cleanupUIElements()`, the fish sprite
(`:227`), fish name (`:256`) and the DOM cursor (`:232`). Only the answer-button construction from
the comment at `:287` through roughly `:380` is dead, including the text-measurement pass at `:338`
and the wrap at `:372`. Scope the deletion to that range precisely.

Phase 3 moves the fish, name and timer to DOM, so by the time this phase runs more of the function
is deletable and every line number here has shifted. Re-derive all ranges against the actual
post-Phase-4 file; treat the numbers in this document as hints, not addresses.

**3. Orphaned Phaser interaction methods.** `toggleAnswer()` (`:522`),
`updateAllButtonStyles()` (`:568`), `updateSubmitButton()` (`:592`) and the commented-out
`submitAnswer()` (`:617`) operate on `this.optionButtons`, which nothing populates once group 2
is gone. Also remove the `optionButtons` field and the paired `submitButton` teardown at
`:1712` if it refers to the Phaser button rather than the DOM one.

**4. Repository debris.** `src/service/apiService.js.bak` and `fish-quiz-swunmath.zip` are
untracked working files, not source. Confirm with the user before deleting — a `.bak` may hold
uncommitted work, and the current `apiService.js` is modified in the working tree.

## Related Code Files

- Delete: `src/scenes/uiScene.ts`
- Delete: `src/service/apiService.js.bak` (confirm first)
- Delete: `fish-quiz-swunmath.zip` (confirm first)
- Modify: `src/game.ts` — drop the `UIScene` import and array entry
- Modify: `src/scenes/quizScene.ts` — groups 2 and 3

## Implementation Steps

1. Re-derive every line range against the post-Phase-4 file. The numbers in this document are
   pre-refactor and will be wrong by then.
2. For each candidate, prove absence of callers with a repo-wide search before deleting, and
   record the search in the commit message.
3. Delete group 1, rebuild, confirm the HUD still renders and the game still boots.
4. Delete group 2, rebuild, run `npm run test:layout`.
5. Delete group 3; let `tsc` surface anything still referencing the removed field.
6. Ask the user about group 4 rather than deleting untracked files unprompted.
7. Re-run the full layout suite and one manual playthrough: catch a fish, answer right, catch
   another, answer wrong, exhaust lives, reach game over.

## Success Criteria

- [ ] `npx webpack --config webpack.config.js` compiles clean
- [ ] `npm run test:layout` still passes all 36 combinations
- [ ] `grep -rn "UIScene" src/` returns nothing
- [ ] `grep -rn "optionButtons" src/` returns nothing
- [ ] Manual playthrough: correct answer, wrong answer, game over, win screen all reached
- [ ] Fish sprite, fish name and countdown timer all still visible during a quiz
- [ ] `gameType=1` minigame path still works
- [ ] `git status` shows no unintended deletions

## Risk Assessment

- **Risk:** the "dead" Phaser path is a fallback that fires when the DOM path fails, so
  deleting it turns a degraded quiz into a blank screen. Signal: none in normal testing; it
  would only appear in production. Response: `:287`'s own comment states the buttons are
  hidden and `:1425` states the block does not execute — but `:1425` was **wrong** about the
  result text, which proves these comments are unreliable. Verify by instrumentation: log on
  entry to each candidate block, play a full game at two sizes, and confirm zero hits before
  deleting.
- **Risk:** `cleanupChoiceImages()` / `cleanupUIElements()` are entangled with the deleted
  ranges and removing callers leaks Phaser objects across quizzes. Signal: memory growth or
  stale images after several quizzes. Response: keep both calls at the top of
  `createQuizUI()`; open six quizzes in a row and compare `scene.children.length`.
- **Risk:** line numbers in this phase are stale by construction. Signal: a deletion removes
  live code. Response: step 1 exists for this; treat every number here as a hint, not an
  address.
- **Risk:** deleting `apiService.js.bak` loses uncommitted work. Signal: irreversible.
  Response: step 6 — ask, do not assume.

---
phase: 1
title: "Remove the duplicate result banner"
status: completed
priority: P1
effort: "30m"
dependencies: []
completed: 2026-09-12
---

# Phase 1: Remove the duplicate result banner

## Overview

Delete the legacy Phaser result text that renders on top of the question, leaving the DOM
banner as the single source. Closes Issue 2 on its own, independent of the layout rebuild.

## Requirements

- Functional: exactly one result banner is visible after answering, and it does not overlap
  the question text.
- Non-functional: no change to scoring, timing, scene transition, or the `gameType === 1` path.

## Architecture

`showResult()` (`quizScene.ts:1400`) currently produces two banners:

1. Phaser `this.add.text(...)` at `:1449` — 36px hardcoded, positioned at
   `cameras.main.height / 2 + 55`, and an explanation text at `:1469` at exactly
   `cameras.main.height / 2`. Dead centre of the camera is where the question renders, which
   is why the screenshots show `WRONG! The fish got away!` and `Correct answer: A` written
   across the question.
2. DOM banner at `:1065-1093` — `position: absolute; bottom: 10%` appended to `document.body`.

The comment at `:1425` claims the block is "kept for compatibility but won't execute since
buttons don't exist". That is true only for the two `forEach` bodies, which are guarded by
`this.optionButtons.length`. The `this.add.text(...)` calls at `:1449` and `:1469` sit
**outside** those guards and run every time.

Keep the DOM banner. `index.html` gives `body` an explicit `height: 100vh`, so
`bottom: 10%` resolves to roughly 10% of the viewport and lands in a usable place. Its
hardcoded `font-size: 24px` is left alone here and folded into `--ui-scale` in Phase 3.

## Related Code Files

- Modify: `src/scenes/quizScene.ts`

## Implementation Steps

1. In `showResult()`, delete the two dead `forEach` blocks over `this.optionButtons`
   (`:1426-1446`). They cannot fire — the Phaser answer buttons are never created (see the
   comment at `:287`).
2. Delete the Phaser `resultText` (`:1448-1460`) and the `if (!isCorrect)` block containing
   `explanationText` (`:1462-1480`).
3. Preserve the `this.time.delayedCall(2000, ...)` block at `:1482-1516` untouched — it owns
   scene teardown, question-index persistence to `localStorage`, and `scene.resume('GameScene')`.
4. Remove any now-unused local variables the deletion orphans; let `tsc` identify them.
5. Confirm `correctAnswerKeys` is still read elsewhere before assuming it is dead — the DOM
   highlight path at `:1040-1062` uses it.

## Success Criteria

- [x] `npx webpack --config webpack.config.js` compiles with no new errors — and
      `npx tsc --noEmit` reports no errors
- [x] Answering incorrectly shows exactly one `WRONG! The fish got away!` on screen
- [x] Text search for `got away` yields exactly 1 node — asserted by the automated banner test
      at the three largest sizes; `grep -rn "got away" src/` now returns one source
      (`quizScene.ts:1081`) plus one unrelated comment (`gameScene.ts:1069`)
- [~] No text is drawn over the question during the result window — holds at 1586x808,
      1586x709 and 1268x648. Still fails at 1036x530, 951x488 and 898x418, but for a
      **different cause**: the fixed `500x350` question block (`quizScene.ts:727-728`) overlaps
      the answers region. That is Phase 3's defect, not this one.
- [x] `Correct answer: <key>` no longer appears at camera centre — the Phaser `explanationText`
      is deleted and no source for the string remains
- [~] Scene still resumes `GameScene` after 2s with the same payload shape — the submit-to-result
      flow runs end to end in the automated banner test, so the path is exercised, but the
      payload shape itself is not asserted. Unverified.
- [ ] Answering correctly still awards points and advances `fishCaught` — **not verified**. The
      dev route deliberately does not continue a run, so this needs a manual playthrough.

## Completion notes — 2026-09-12

Deleted `quizScene.ts:1424-1480`: the comment claiming the block never executes, the two dead
`forEach` loops over `optionButtons`, the Phaser `resultText`, and the `explanationText` block.
Replaced with a comment recording that the DOM overlay owns the banner. Verified beforehand that
`resultText` and `explanationText` were assigned and never read.

Left in place deliberately: the `optionButtons.forEach(... disableInteractive)` at `:1406` and
the `submitButton` guard at `:1412`. Both are also dead, but they are guarded and harmless, and
removing the `optionButtons` field is Phase 5's job. Keeping this phase minimal kept it
shippable on its own.

## Risk Assessment

Low. The deleted code has no callers and no side effects beyond rendering.

- **Risk:** the explanation text was the only place the correct answer was surfaced to the
  player on a wrong answer, so removing it silently drops a teaching affordance.
  Signal: product or user asks where the correct answer went.
  Response: the DOM highlight at `:1040-1062` already turns the correct option green and the
  chosen wrong option red, so the information is still conveyed. If that is judged
  insufficient, add it as a line inside the Phase 3 modal rather than restoring a floating
  Phaser text.
- **Risk:** `this.optionButtons` is referenced elsewhere and the array removal breaks a call
  site. Signal: TypeScript error. Response: this phase only deletes loops that read it, not
  the field; the field is removed in Phase 5.

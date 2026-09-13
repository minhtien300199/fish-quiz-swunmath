---
phase: 4
title: "Auto-fit engine"
status: pending
priority: P1
effort: "1d"
dependencies: [3]
---

# Phase 4: Auto-fit engine

## Overview

Guarantee that arbitrary backend HTML fits the panel at any size, using the escalation order
the user chose: shrink the font to a floor, then reflow the answer grid, then scroll as a last
resort. Never clip, never overflow the panel.

## Requirements

- Functional: content that does not fit triggers escalation, in order, until it fits or all
  options are exhausted.
- Functional: measurement happens after images load, not before.
- Non-functional: font never below 11px; escalation is bounded and cannot loop.
- Non-functional: no visible flicker on open or resize.

## Architecture

**Constraint that reshapes this phase.** Injected markup must not be restyled — see
"question/answer core is off limits" in `plan.md`. So level 1 below can only scale font at the
**container**; wherever content sets its own `font-size`, that text will not shrink and the ladder
must fall through to a later level. Do not add a descendant font-size override to make the ladder
work. Consequence: the extra panel area won by dropping the `0.8 x 0.85` fractions is load-bearing,
not a bonus, and scrolling is a legitimate terminal outcome rather than a failure.

**Escalation ladder**, evaluated in order and stopping at the first level that fits:

| Level | Action | Bound |
|---|---|---|
| 0 | current `--ui-scale` from Phase 3 | — |
| 1 | reduce `--ui-scale` in steps | until effective answer font hits 11px |
| 2 | answer grid `1fr 1fr` → `1fr` (single column) | one switch |
| 3 | `overflow-y: auto` on the answers region and the question region | terminal |

Level 2 trades horizontal space for vertical: a single column is taller per row but each row
has double the width, so answers that wrapped to three lines may drop to one. Whether it
helps depends on content, so re-measure after switching and fall through to level 3 if it did
not.

Consider the reverse case too: four genuinely short answers at a wide-but-short size fit
better as `1fr 1fr 1fr 1fr` in one row. Treat that as an optional level between 0 and 1, only
when every answer measures as a single line at full scale.

**Fit test.** An element fits when `scrollHeight <= clientHeight + 1` for the question, every
answer box, and the answers container. The `+1` absorbs sub-pixel rounding, which is real at
fractional scales like 0.491. Use the same predicate here and in the Phase 2 assertions —
if they diverge, the tests stop meaning anything.

**Async images.** The dominant failure mode. Fit runs:

1. once synchronously after content injection, for the no-image fast path;
2. again on `load` **and** `error` of every `<img>` in the modal, since a broken image still
   changes layout;
3. once more on the next `requestAnimationFrame` after the last image settles, because
   `load` fires before layout is necessarily flushed.

Prefer `img.decode()` where available and fall back to the `load` listener. Cache-hit images
may already be `complete` on injection — check that flag rather than waiting for an event
that will never fire.

**Loop safety.** A re-entry flag, a hard iteration cap, and suppression of `ResizeObserver`
callbacks while a fit pass is running. Without the last one, changing `--ui-scale` can resize
an element, which fires the observer, which starts another fit pass — an infinite loop that
presents as font flicker.

**Reduced motion.** No transition on font size or grid changes; escalation must be instant, or
the measure-after-change reads a mid-transition value. The existing
`transition: all 0.3s ease` at `:1163` must not carry over to any property the fit engine
touches.

## Related Code Files

- Modify: `src/components/QuizModal.ts` — add the fit engine
- Modify: `tests/quiz-layout.spec.ts` — enable the `wrap`, `img`, `imgq` and `mixed` fixtures

## Implementation Steps

1. Extract the fit predicate into one exported function so the test imports the same logic.
2. Implement `fit()`: measure, then walk the ladder, stopping at the first level that fits.
3. Add the re-entry guard and iteration cap; log the terminal level reached in dev builds so
   a support report can say which level a machine landed on.
4. Wire image lifecycle: check `complete` on injection, attach `load`/`error` otherwise, and
   schedule the trailing `rAF` pass.
5. Strip transitions from font-size and grid-template properties.
6. Debounce the `ResizeObserver` path so a drag-resize does not run a full ladder per frame,
   but keep it responsive enough that the final resting size is correct.
7. Enable the remaining fixtures in the layout test and iterate until all 36 combinations pass.
8. Verify the terminal case honestly: an answer with a 400px-tall image at `900x420` cannot fit
   without scrolling. The test must assert scrolling is *available and usable*, not that it
   never happens.

## Success Criteria

- [ ] All 36 size×fixture combinations pass `npm run test:layout`
- [ ] Answer font never computes below 11px
- [ ] `img` and `imgq` fixtures fit correctly on first paint, not only after a resize
- [ ] A cache-hit image (second open of the same fixture) fits identically to a cold load
- [ ] Grid collapses to one column only when two columns genuinely do not fit
- [ ] No font flicker during a continuous drag-resize
- [ ] Fit pass runs a bounded number of iterations, asserted in a unit test
- [ ] At `900x420` with the tallest image answer, scrolling is reachable and the scrollbar is
      wide enough to use
- [ ] The fit predicate used in production and in tests is the same function

## Risk Assessment

- **Risk:** measuring before layout flush yields stale values and the ladder settles on the
  wrong level. Signal: correct after resize, wrong on open. Response: the trailing `rAF` pass;
  if still flaky, `getBoundingClientRect()` on the container forces a synchronous reflow before
  measuring — acceptable once per question.
- **Risk:** escalation oscillates between levels at a specific size, flickering font size.
  Signal: visible pulsing. Response: hysteresis — require the fit test to fail by more than the
  tolerance before escalating back, and never de-escalate within one pass.
- **Risk:** the 11px floor is reached often enough that answers are routinely unreadable for
  the target age group, making the fix technically passing and practically bad.
  Signal: many real questions land on level 1 at the floor. Response: log the terminal level,
  measure against real content, and if the floor is common the honest answer is that the panel
  needs more room — which points back at the host `#iframe-wrap` defect in `iframe_clue.md`
  worth ~145px.
- **Risk:** backend HTML contains a fixed-width table or a `min-width` that cannot shrink, so
  no level fits horizontally. Signal: horizontal overflow rather than vertical.
  Response: the scoped `max-width: 100%` reset from Phase 3 plus `overflow-x: auto` on the
  question region as a terminal fallback.

---
phase: 2
title: "Test harness and quiz fixture"
status: completed
priority: P1
effort: "1d"
dependencies: []
completed: 2026-09-12
---

# Phase 2: Test harness and quiz fixture

## Overview

Make the bug reproducible in one command. Today it takes playing the game until a fish is
caught, which makes the layout untestable and the fix unprovable. Adds a dev-only direct
route into QuizScene with adversarial fixture content, plus an automated check across the six
iframe sizes.

## Requirements

- Functional: a single URL opens the quiz directly with chosen fixture content, inside the
  emulated host iframe, without fishing.
- Functional: one command asserts every success metric at all six sizes and exits non-zero on
  failure.
- Non-functional: dev-only. Inert on any non-localhost hostname, same gate as the existing
  `?iframe=true` bootstrap in `src/index.html`.

## Architecture

Two pieces.

**Direct quiz route.** `GameScene` launches QuizScene at `gameScene.ts:1028` with
`{ gameState, currentFish, completionData }`. Add a dev-only branch that performs that launch
immediately on boot when `?devQuiz=<fixtureId>` is present, skipping boat movement and
fishing. Reuse the existing param plumbing style in `apiService.js:19-28` rather than adding
a second parser.

**Fixture set.** A dev-only module with questions chosen to break layout, not to be
representative:

| id | Content |
|---|---|
| `short` | 4 one-word numeric answers — the case that currently passes |
| `long` | longest answer string in `src/datas/quesionBank.ts` |
| `wrap` | answer that wraps to 3+ lines at every size |
| `img` | answer containing an `<img>`, to exercise async decode |
| `imgq` | question containing an `<img>` plus long answers |
| `mixed` | one short, one wrapping, one image, one long — uneven grid rows |

Fixtures must be real raw HTML strings, matching what the backend sends, since that is the
constraint the layout has to survive.

**Automated check.** Playwright drives `iframe-host.html`, selects each preset, and asserts
inside the nested frame. Pin an exact version; do not use a caret range.

Assertions per size, per fixture:

- every `[data-choice-key]`: `scrollHeight <= clientHeight + 1`
- question block: `scrollHeight <= clientHeight + 1`
- computed `font-size` of answer text `>= 11px`
- submit button `getBoundingClientRect()` fully inside the modal rect, and
  `document.elementFromPoint(centre)` returns the button or a descendant
- result banner rect does not intersect the question rect
- exactly one node whose `textContent` contains `got away`
- no element's rect extends outside the modal's rect

Run it **before** Phase 3 to record a baseline. A test suite that passes against the broken
code is not testing anything.

## Related Code Files

- Create: `src/dev/quizFixtures.ts`
- Create: `tests/quiz-layout.spec.ts`
- Create: `playwright.config.ts`
- Modify: `src/scenes/gameScene.ts` (dev-only direct launch)
- Modify: `src/iframe-host.html` (expose preset selection to automation via `?simSize=`, already supported; add a stable `data-testid` on the iframe)
- Modify: `package.json` (pinned `@playwright/test`, `test:layout` script)

## Implementation Steps

1. Add `src/dev/quizFixtures.ts` exporting a map of fixture id → question object matching the
   shape `quizScene.ts` expects (`question`, `choices[{key,text}]`, `correctAnswer`).
2. In `GameScene.create()`, add a localhost-gated check for `?devQuiz=`; when present and the
   id resolves, launch QuizScene with the fixture and a synthetic `gameState`. Guard so the
   branch cannot execute when `gameType === 1`.
3. Verify the fixture path does not call the backend: `apiService.js:51-61` already falls back
   to the local `questionBank` when `userId` is null, so a fixture URL without `UserId` stays
   offline.
4. Add `data-testid="game-frame"` to the iframe in `src/iframe-host.html`.
5. Add `playwright.config.ts` with `webServer` pointing at the existing dev server on 8080.
6. Write `tests/quiz-layout.spec.ts` as a matrix over the 5 real sizes + `900x420` × the 6
   fixtures, containing the assertions above as shared helper functions.
7. Record baseline output into the plan directory as `baseline-failures.txt` so the Phase 3-4
   diff is evidence, not assertion.
8. Add `"test:layout": "playwright test"` to `package.json` scripts.

## Success Criteria

- [x] `http://localhost:8080/index.html?devQuiz=wrap` opens the quiz directly, no fishing
      required. Composes with the harness: add `iframe=true&simSize=1366x768`
- [~] `?devQuiz=` on a non-localhost hostname is ignored — the gate is `isDevHost()` in
      `src/dev/quizFixtures.ts`, mirroring `src/index.html`. Not reachable by automated test
      from localhost; verified by reading the gate, not by execution
- [x] `?devQuiz=` with `gameType=1` does not open QuizScene — guarded in
      `GameScene.maybeLaunchDevQuiz()` before the launch
- [x] `npm run test:layout` runs the full matrix — 48 tests (7 fixtures × 6 sizes, plus 6 banner
      tests), not the 36 originally scoped
- [x] Baseline run **fails** and names the specific element — 3 passed, 45 failed, each failure
      naming the answer key and the overflow in px
- [x] `baseline-failures.txt` written alongside the plan, with a methodology caveat
- [x] No fixture or dev route is reachable in a production build — gated on hostname; two
      automated containment tests assert the quiz does not open without a valid `?devQuiz=`

## Completion notes — 2026-09-12

**Deviation: viewport instead of a nested frame.** The plan said to drive `iframe-host.html` and
select presets. The suite instead sets the Playwright viewport to the iframe's inner size. A
Playwright viewport and an iframe viewport are both browsing-context viewports, so CSS viewport
units, `ResizeObserver` and layout resolve identically — same fidelity, one less moving part, and
no `frameLocator` indirection. `iframe-host.html` stays as the human-facing simulator, which is a
different job: it reproduces the host page's own CSS defects.

**Deviation: injection point.** The plan proposed threading a fixture through the QuizScene
launch payload. `quizScene.ts:173` already reads `window.QUIZ_QUESTIONS`, the global that
`preloadScene.ts:78` fills from the API, so the fixture is installed there instead. No payload
change, no `gameScene` signature change, and the fixture exercises the production path.

**Unplanned work that turned out to be required:**

1. *Menu skip.* The game boots Boot → Preload → **MenuScene**; `GameScene.create()` only runs
   after the player clicks New Game (`menuScene.ts:62`). A hook in `GameScene.create()` alone
   never fires. Added a dev branch in the `preloadScene` success callback that installs the
   fixture and starts `GameScene` directly. Found by the first smoke run timing out.
2. *Stable selectors.* The current DOM had no way to address the question container, answers
   container, submit button or banner — only `[data-choice-key]` existed. Added four
   `data-testid` attributes to `quizScene.ts`. Phase 3 must preserve them.
3. *Containment tests.* Two extra tests assert the normal boot path still reaches the menu and
   that an unknown fixture id is ignored, because this phase modified `preloadScene` and
   `gameScene` — both on the production path.

**Fixtures are 7, not 6.** `fallback3` and `fallback4` reuse `questionBank[0]` and `[1]` verbatim
rather than copying them.

They were briefly named `real3`/`real4`, and an earlier revision of `plan.md` presented four
"findings from real content" derived from them. Both were wrong: `src/datas/quesionBank.ts` is only
the offline fallback used when no `UserId` is present (`apiService.js:51-61`), and says nothing
about backend content. The findings are retracted in `plan.md`; the fixtures are renamed. A fixture
from a captured real API response is still outstanding — until it exists, this matrix bounds
nothing about production content.

**Dependency.** `@playwright/test` pinned to exactly `1.63.0`. `npm install` reported 26
pre-existing vulnerabilities in the tree; none introduced by this change and none triaged here.

## Risk Assessment

- **Risk:** Playwright is a new, heavy dependency on a project with only 7 devDependencies.
  Signal: install size or CI time objections. Response: it is dev-only and the alternative is
  a permanently unverifiable layout. If rejected, fall back to a scripted manual checklist over
  the six sizes, and accept that the success metrics become human-verified.
- **Risk:** the dev quiz route diverges from the real launch path and hides a real bug.
  Signal: harness passes, production still broken. Response: the route must call the same
  `this.scene.launch('QuizScene', ...)` at `gameScene.ts:1028` with the same payload shape,
  not a parallel code path. Assert the payload shape in a test.
- **Risk:** fixture content is milder than real backend HTML. Signal: a real question breaks
  after the fix ships. Response: capture one real API response during development and add it
  verbatim as a seventh fixture.
- **Risk:** `elementFromPoint` returns the DOM cursor overlay (`:901`) instead of the submit
  button, producing a false failure. Signal: submit assertion fails while the button is
  visibly clickable. Response: exclude the cursor element by id in the assertion.

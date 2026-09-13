---
title: "Quiz layout: unified responsive DOM modal"
status: pending
priority: P1
branch: no-math
created: 2026-09-12
scope: project
blockedBy: []
blocks: []
---

# Quiz layout: unified responsive DOM modal

## Problem

Two defects, both on the quiz screen, both reported from low-resolution machines.

**Issue 1 — answer text clipped, submit covered.** The answers area is pinned to a fixed
slice of the Phaser paper background (`quizScene.ts:1117-1118`, `paperBg.displayHeight * 0.10
→ 0.47`) converted through canvas scale factors (`:1111-1112`), while fonts are sized from the
iframe viewport (`clamp(11px, 1.4vw, 16px)`, `:1165`). Box height tracks the canvas scale;
font tracks iframe width. Two unrelated measures, nothing binding them. `overflow: auto`
(`:1170`) on a box too short to show a usable scrollbar clips silently.

Measured against the real iframe sizes in `iframe_clue.md`:

| Iframe (host) | Viewport | Canvas scale | Answers area | Space for 1 line | Needs | Result |
|---|---|---|---|---|---|---|
| 1588x810 | 1920x1080 | 0.748 | 255px | 55px | 20.8px | ok, ~2.6 lines |
| 1588x711 | 1920x969 (Chrome max) | 0.656 | 224px | 39px | 20.8px | **breaks at 2 lines** |
| 1270x650 | 1600x900 | 0.600 | 200px | 47px | 20.8px | breaks at 2 lines |
| 1038x532 | 1366x768 | 0.491 | 167px | 15px | 18.9px | **breaks at 1 line** |
| 953x490 | 1280x720 | 0.452 | 152px | 10px | 18.7px | breaks badly |

Font/box balance, normalised to the 1588x810 baseline: 1.00x → 1.14x → 1.25x → 1.38x → 1.38x.
Verified numerically against all five measured rows. The most common real configuration
(Chrome maximised on a 1080p monitor) already fails on two-line answers, so this is not
confined to low-end hardware.

**Issue 2 — result banner renders twice, on top of the question.** Legacy Phaser text at
`quizScene.ts:1449` and `:1469` runs unconditionally (36px and 28px hardcoded, placed at
`cameras.main.height / 2` — dead centre, where the question sits) despite the comment at
`:1425` claiming it never executes. A second DOM banner at `:1065-1067` uses
`position: absolute; bottom: 10%` appended to `document.body`, which is not a positioned
ancestor, with `font-size: 24px` hardcoded and no clamp.

**Structural overlap, independent of text length.** The question block is hardcoded
`width: 500px; height: 350px; overflow: hidden` (`:727-729`) with `translate(-50%, -50%)`
anchored at `paperBg.y - 25%` plus a magic `+ 100` (`:720`). At canvas scale 0.49 it spans
`top+78 → top+428` while the answers container starts at `top+311` — a 117px overlap by
construction. `updatePosition` (`:768`) recomputes the same position **without** the `+ 100`,
so the question jumps 100px on the first resize.

## Root cause

One decision generates all of it: DOM elements align themselves to Phaser canvas-space
coordinates. `Scale.FIT` uniformly scales a fixed 1920x1080 world (`index.ts:7-21`), so
`getBoundingClientRect()`-derived sizes shrink with the canvas while CSS viewport units do
not. Every constant in that mixed system is correct at exactly one scale.

## Approach

Rebuild the quiz UI as **one** DOM modal: `position: fixed; inset: 0`, laid out as a flex
column (header → question → answer grid → submit → banner). Overlap becomes structurally
impossible because every piece shares one layout flow. All sizing derives from a single
JS-computed `--ui-scale` driven by `ResizeObserver`. No `getBoundingClientRect`, no canvas
scale factors, no fixed fractions of the paper image.

### Scope discovered during planning

`createQuizUI()` (`:213`) is **not** dead code: it owns the fish sprite (`:227`), fish name
(`:256`), HTML cursor (`:232`) and the countdown timer (`:274`). Those are Phaser objects
drawn on the canvas, and a full-iframe DOM modal sits above the canvas unconditionally — it
would cover them.

Keeping them on canvas while the modal covers only part of the viewport requires aligning the
modal to the canvas rect, which is exactly the mechanism being removed. `Scale.FIT` +
`CENTER_BOTH` letterboxes the canvas (iframe 1038 wide → canvas 942 wide, 48px bars), so a
percentage of the iframe is never a percentage of the canvas.

Therefore the modal must own the paper background, fish image, fish name and timer as DOM.
This is larger than the original checklist. Decision required — see Open Questions.

### Non-goals

- Changing `Phaser.Scale.FIT` or the 1920x1080 design resolution. Every other scene is built
  on it; the blast radius is the whole game to fix one screen.
- Fixing the host page's `#iframe-wrap` defects (56px overflow, wasted 11% height). Recorded
  in `iframe_clue.md`, owned by whoever maintains the wrapper. Worth ~145px at 810px tall —
  the cheapest win available, but not in this repo.
- Redesigning the quiz visually. Same look, correct geometry.
- Touching the NO_MATH minigame path (`gameType === 1`) which bypasses QuizScene entirely.

## Hard constraints

1. **Question and answer content is arbitrary raw HTML from the backend**, injected via
   `innerHTML` at `:701`, `:1208`, `:311`. It can contain `<img>`, and `replaceURL()`
   (`apiService.js:4-16`) only rewrites AWS file paths — it does not sanitise, measure, or
   lay out. Never size a box from assumed content length or type. Always measure the rendered
   element.
2. **Images load asynchronously.** Any fit computed before `<img>` decode is wrong. Fit must
   re-run on image load.
3. **Five real iframe sizes** in `iframe_clue.md` are the test matrix, not the browser
   viewport. Derived: height = `(viewport_height - 170) * 0.89`, width = `viewport_width - 330`
   (reproduces all five rows within 3px).
4. Font floor 11px. This is a maths game for school students.
5. `gameType === 0` behaviour must not regress; NO_MATH (`=== 1`) must remain untouched.

## Phases

| # | Phase | Priority | Depends on | Ships alone | Status |
|---|---|---|---|---|---|
| 1 | [Remove the duplicate result banner](phase-01-remove-duplicate-banner.md) | P1 | — | yes | **completed 2026-09-12** |
| 2 | [Test harness and quiz fixture](phase-02-test-harness-and-quiz-fixture.md) | P1 | — | yes | **completed 2026-09-12** |
| 3 | [Unified modal skeleton](phase-03-unified-modal-skeleton.md) | P1 | 2 | no | pending |
| 4 | [Auto-fit engine](phase-04-autofit-engine.md) | P1 | 3 | no | pending |
| 5 | [Dead code cleanup](phase-05-dead-code-cleanup.md) | P3 | 3, 4 | yes | pending |

Phases 3-5 are held pending the red-team review. See `decisions.md` for resolved open
questions and `baseline-failures.txt` for the pre-rewrite measurement.

Phases 1 and 2 are independent and can land immediately. Phase 1 alone closes Issue 2.
Phase 2 is a prerequisite for proving Phases 3-4, because reproducing the bug today requires
playing the game until a fish is caught.

## Success metrics

Measured at all five `iframe_clue.md` sizes plus a `900x420` stress case, using the
`?iframe=true` harness:

- Every answer box satisfies `scrollHeight <= clientHeight + 1`
- Question block satisfies `scrollHeight <= clientHeight + 1`
- Result banner's `getBoundingClientRect()` does not intersect the question's rect
- Exactly **one** DOM node contains `got away` at result time (currently 2)
- Answer font never below 11px with a two-line answer
- Submit button fully visible, 100% of its height, unobstructed
- Longest answer in `src/datas/quesionBank.ts` renders without scroll at 1038x532
- An answer containing an `<img>` renders without clipping after image load
- Continuous resize from 1920x1080 down to 1280x600 with the quiz open: no frame shows
  clipped text or an element outside the panel
- `gameType=1` still routes to `FishingMiniGameScene`, never to QuizScene

## Risks

- **Async image load breaks measurement.** Highest-likelihood failure. Signal: fit correct on
  reload but wrong on first paint. Response: fit runs on `load`/`error` of every `<img>`, plus
  one `requestAnimationFrame` pass after.
- **Auto-fit loop thrashes.** Signal: visible font flicker, or ResizeObserver re-entry.
  Response: cap iterations, compare against a tolerance, and guard re-entry with a flag.
- **Backend HTML carries its own `style`/`width` attributes** that override the modal's
  layout. `:750-755` already patches `margin-left: 30%` in inline `<style>` blocks, which
  proves this happens in practice. Signal: one specific question breaks while others pass.
  Response: scope-reset child styles inside the modal; keep the existing patch.
- **Moving fish/timer to DOM loses the pixel-art look.** Signal: fish renders blurry or at
  the wrong scale. Response: `image-rendering: pixelated` and integer scaling; fall back to
  Option B in Open Questions.
- **Modal covers the Phaser HUD** (lives/progress/points DOM overlay from `gameScene.ts:2274`
  sits at a lower z-index than the quiz modal's 1000+). Signal: HUD invisible during quiz.
  Response: decide intentionally — it is arguably correct to hide it during a quiz.

## Retracted: "findings from real content" — 2026-09-12

An earlier revision of this section presented four findings drawn from `src/datas/quesionBank.ts`
and described them as properties of real content. **That was wrong.** `quesionBank.ts` is only the
offline fallback, used when no `UserId` is present (`apiService.js:51-61`). It says nothing about
what the backend serves. Retracted specifically:

- "Shipped content has questions with three choices." Unproven. The fallback bank has one such
  entry; production content may differ either way.
- "Question text carries inline `font-size: 11pt`, so the fit ladder cannot shrink it." Unproven,
  and the remedy it implied is now forbidden — see the constraint below.
- "Answers are wrapped in `<p>` with default margins, so Phase 3 must reset injected block
  margins." The observation holds for the fallback bank and for this plan's synthetic fixtures,
  but the recommendation is forbidden by the constraint below.
- "Questions embed the correct answer in hidden spans, readable from devtools." A property of the
  fallback bank only. Withdrawn as a production claim.

**The measured table above stands as originally written.** An intermediate revision of this
section claimed the table was wrong to describe 1588x810 as "ok, ~2.6 lines", because the Phase 2
baseline failed at that size too. That claim is also withdrawn: the failure came from the test's
own overflow predicate, which measured `scrollHeight - clientHeight` and counted an author's
trailing block margin as overflow. With the predicate corrected to bound rendered content against
the space provided, a short answer no longer reports overflow at 1586x808. The original arithmetic
was right — it fits ~2.6 lines at the baseline and fails at one line by 1366x768.

Lesson worth keeping: two of the three "corrections" made to this plan during Phase 2 were caused
by a faulty measurement, not by faulty analysis. Verify the instrument before revising the theory.

**Still missing:** a fixture built from a captured real API response. Until one exists, the test
matrix bounds nothing about production content — it only proves the layout survives the shapes
currently in `src/dev/quizFixtures.ts`.

## Constraint: the question/answer core is off limits

Added 2026-09-12 on the user's instruction: do not modify the core logic that handles questions
and answers, and do not override how their HTML renders. It is correct as authored; changing it
introduces a worse bug than the layout defect being fixed.

Off limits: `replaceURL` (`apiService.js:4-16`), the `innerHTML` injection points, choice parsing,
`correctAnswer` parsing, and any CSS that changes the rendered meaning of injected markup —
inline `font-size`, block margins, author-set text alignment.

Consequences for the remaining phases:

- Phase 3 **must not** add the scoped reset that zeroes `<p>` margins or clamps descendant
  font-size. The `max-width: 100%` guard on images is the boundary case: it prevents horizontal
  escape rather than restyling intent, and needs an explicit decision.
- Phase 4's ladder loses its ability to shrink any text the content sizes itself. Where content
  pins its own size, the only honest remedies are more room or a scrollbar. That makes the panel
  area increase from dropping the `0.8 x 0.85` fractions (+58%) load-bearing rather than a bonus,
  and it raises the value of fixing the host-side `#iframe-wrap` defect worth ~145px.
- Layout is fixed by changing the container — available space, panel geometry, grid shape, scroll
  affordances — never by restyling injected descendants.

### The boundary, stated explicitly

Restated by the user on 2026-09-12: *fix the UI; the logic must stay exactly as it was.* Reading
that as a working rule for Phases 3-5:

| May change (UI) | Must not change (logic / content) |
|---|---|
| Where the panel is, how big it is, its background | How questions or choices are parsed |
| Grid column count and gaps | Choice order, keys, `correctAnswer` parsing |
| Font scale applied at the **container** | Inline styles on injected markup |
| Scroll affordances | `replaceURL`, the `innerHTML` injection points |
| z-index band, safe areas, which element owns the banner | Scoring, timing, lives, scene transitions |
| Moving fish/name/timer/paper from Phaser to DOM | Which question is selected, or `fishQuizQuestionIndex` |
| Removing duplicated *rendering* of the same thing | Anything gated on `gameType` |

Two calls made under this rule, both open to veto:

1. **Phase 4's level-2 grid switch** (`1fr 1fr` → `1fr` when content will not fit) is treated as
   UI and therefore allowed. It changes column count, not content. Say so if you consider a
   runtime column change out of bounds — it is the ladder's main lever once font scaling is
   restricted, so removing it leaves only "more room" and "scroll".
2. **`max-width: 100%` on injected images** is treated as UI, because it prevents horizontal
   escape rather than restyling authored intent. It is nevertheless a style applied to injected
   markup, which is the one place this rule is genuinely blurry. Currently question images are
   already hard-clamped to `150x100` (`quizScene.ts:795-796`), so a clamp of some kind is
   pre-existing behaviour rather than something this plan introduces.

Nothing else in Phases 3-5 touches the right-hand column. Phase 5's deletions are all
*duplicate rendering paths* and unreferenced files, not behaviour.

## Open questions

1. ~~**Fish, fish name, timer and paper background: move to DOM, or keep on canvas?**~~
   **RESOLVED 2026-09-12: Option A, move all four to DOM.** See `decisions.md` and
   `snippets-header.md`. Option B rejected — it keeps a `getBoundingClientRect` dependency, the
   exact mechanism this plan removes.
   Cost of Option A, verified: the fish is a single 16x16 PNG, not a spritesheet, so DOM
   rendering is a plain `<img src={getFishPath(...)}>`. The paper background is generated vector
   graphics, reproducible in pure CSS with better fidelity than today. Neither carries the risk
   originally assumed.

2. ~~Should the lives/progress/points HUD stay visible during a quiz?~~
   **RESOLVED 2026-09-12: yes, it stays visible.**

   Implementation consequences, from reading `createHtmlUIOverlay()` (`gameScene.ts:2312-2334`):
   - The HUD is `position: fixed`, anchored to `canvasRect.left/top + 10`, **width 350px**, and
     `pointerEvents: none` (`:2317-2322`). Because it ignores pointer events, it can sit above the
     modal without stealing clicks.
   - Its z-index is `1000` — the same value as the current question container
     (`quizScene.ts:732`). Equal z-index means DOM order decides, and the quiz appends later, so
     the quiz wins. That is why the panel covers the HUD in the bug screenshots.
   - Fix: the modal takes a band strictly below the HUD, or the HUD is raised above the modal.
     Either way the modal's `.panel` must leave the top-left clear so the HUD does not sit on top
     of quiz content. The `.header` row is the natural place to absorb this: keep roughly its
     leftmost 350px (scaled) empty and put fish, name and timer centre and right.
   - Note the HUD sizes its text with `2.2vh` (`:2328-2330`) — viewport *height*, the opposite
     basis from the quiz's `1.4vw`. Do not copy either; use `--ui-scale`.

3. ~~What answer counts must the grid support?~~
   **RESOLVED 2026-09-12: keep the existing behaviour, add nothing.**

   No code change is needed and none should be made. `gridTemplateColumns: '1fr 1fr'`
   (`quizScene.ts:1145`) with three children auto-places them as 2 + 1; CSS grid auto-placement
   already handles any count. An earlier revision proposed deriving the grid from
   `choices.length`; that is withdrawn as unnecessary added logic.

4. ~~How should inline `font-size` in backend HTML be handled?~~ **ANSWERED by the constraint
   above: respected, never neutralised.** The question region therefore has only "more room" and
   "scroll" available when content pins its own size.

5. **Can a real API response be captured for use as a fixture?** Needed before the test matrix
   can claim anything about production content. Requires either a captured response pasted in, or
   permission to call the backend with real launch parameters.

## Notes

`ak` CLI is not installed in this environment, so this plan was scaffolded as files directly.
Files are the source of truth regardless; run `ak plan reindex` if the CLI is added later.

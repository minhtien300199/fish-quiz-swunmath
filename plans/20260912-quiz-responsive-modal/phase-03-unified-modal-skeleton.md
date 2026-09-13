---
phase: 3
title: "Unified modal skeleton"
status: pending
priority: P1
effort: "2d"
dependencies: [2]
---

# Phase 3: Unified modal skeleton

## Overview

Replace the three independently positioned DOM blocks with one flex-column modal that owns
the entire quiz surface. Removes every canvas-coordinate dependency, which is what makes the
overlap and clipping structurally impossible rather than tuned away.

## Requirements

- Functional: question, answers, submit and result banner render in one layout flow; no
  element can overlap another.
- Functional: all sizing derives from one `--ui-scale` custom property recomputed on resize.
- Functional: raw HTML content including `<img>` renders correctly inside answer and question
  slots.
- Non-functional: zero calls to `getBoundingClientRect()` for layout, zero references to
  `paperBg` geometry, zero CSS viewport units for font sizing.
- Non-functional: `gameType === 0` flow unchanged end to end; `gameType === 1` untouched.

## Architecture

**New component.** `src/components/QuizModal.ts` owns creation, update and disposal of the
whole DOM tree. `quizScene.ts` becomes a caller: it constructs the modal, hands it the
question, subscribes to answer-selection and submit events, and disposes it on shutdown. This
keeps the 64KB scene from growing and gives the layout a single place to reason about.

**Structure.**

```
#quiz-modal            position: fixed; inset: 0; display: flex;
                       flex-direction: column; overflow: hidden
  .backdrop            absolute inset 0, semi-transparent, behind content
  .panel               flex column; margin: auto; the paper surface
    .header            flex: 0 0 auto   fish image, fish name, timer
    .question          flex: 1 1 auto; min-height: 0
    .answers           flex: 0 0 auto; display: grid
      [data-choice-key] x4
    .submit            flex: 0 0 auto
    .banner            flex: 0 0 auto; reserved row, hidden until result
```

`min-height: 0` on `.question` is required or flex refuses to shrink it below content size,
which is the standard flexbox trap that would reproduce the original clipping.

The banner occupies a **reserved row** rather than an overlay, so revealing it cannot displace
or cover anything. Reserve its height from the start and toggle `visibility`, not `display`,
to avoid a layout shift when the result appears.

**Scale.** One number, recomputed by `ResizeObserver` on `document.documentElement`:

```ts
const base = Math.min(width / 1588, height / 810); // 1588x810 is the known-good baseline
const scale = clamp(base, MIN_SCALE, 1);
root.style.setProperty('--ui-scale', String(scale));
```

Every size is `calc(var(--ui-scale) * Npx)`. Using `Math.min` over both dimensions is the
whole fix: the previous code took width only, which is why a short wide viewport broke it.
`ResizeObserver` rather than `window.resize` because it also fires for iframe resizes driven
by the parent and for browser zoom.

**Paper surface — pure CSS, no asset.** There is no paper PNG. `paper-bg` is generated at runtime
by Phaser graphics (`quizScene.ts:118-150`) and `preloadScene.ts` never loads anything matching
`paper`, so the generate branch always runs. It is a plain fill, ruled lines, a margin band and
binding holes — all reproducible in CSS. Doing so also removes a visible defect: the texture is
currently stretched 3.84x horizontally against 1.84x vertically, which is why the binding holes
render as 2.09:1 ovals. Exact colours, derived constants and the CSS are in `snippets-header.md`.

**Open Question 1 is resolved: Option A.** The `.header` holds DOM fish, name and timer, and
`createQuizUI()` stops creating the Phaser equivalents. Option B is rejected. See `decisions.md`
for the decision and `snippets-header.md` for the verified geometry and the fish `<img>` recipe.

**The HUD stays visible (Open Question 2, resolved).** The lives/progress/points overlay
(`gameScene.ts:2312-2334`) is `position: fixed`, 350px wide at the canvas top-left, z-index 1000,
`pointerEvents: none`. Keep the `.header`'s leftmost ~350px (scaled) clear so the HUD does not sit
on quiz content, and put fish, name and timer centre and right. Because the HUD ignores pointer
events it can sit above the modal without stealing clicks.

**Content injection — do not restyle injected markup.** Keep `replaceURL()` before every
`innerHTML` assignment. Retain the inline-`<style>` patch at `:750-755` exactly as it is.

Do **not** add a scoped reset over injected children. An earlier revision of this phase specified
`[data-choice-key] * { max-width: 100% }` and margin zeroing; both are withdrawn under the
"question/answer core is off limits" constraint in `plan.md`. Content renders as authored.

The one allowed exception, and it is a judgement call open to veto: `max-width: 100%; height: auto`
on injected `<img>`, to stop horizontal escape. A clamp already exists — question images are hard
-capped at `150x100` (`:795-796`) — so this is pre-existing behaviour, not new interference. Make
that cap scale-relative rather than a fixed pixel pair.

Consequence to carry into Phase 4: with descendant font-size untouchable, the only levers left for
content that will not fit are more room and scrolling.

## Related Code Files

- Create: `src/components/QuizModal.ts`
- Modify: `src/scenes/quizScene.ts` — remove `createHtmlContainer()` (`:689-781`),
  `createHtmlAnswersContainer()` (`:1099-1263`), the DOM banner (`:1065-1093`), and the
  `updatePosition`/`handleWindowResize` pair (`:761-780`, `:44`, `:1000-1001`); rewire
  `toggleHtmlAnswer()` (`:1265`), `updateHtmlSubmitButton()` (`:1307`), `submitHtmlAnswer()`
  (`:1332`), `showResult()` (`:1400`) and `shutdown()` (`:1800`) to the modal API
- Modify: `src/scenes/quizScene.ts` `createQuizUI()` (`:213`) — stop creating the Phaser fish
  sprite, fish name and timer. Keep `cleanupChoiceImages()`, `cleanupUIElements()` and the DOM
  cursor call; the function itself stays
- Modify: `src/scenes/quizScene.ts` `createPaperBackground()` (`:118`) — remove; the panel owns
  the paper in CSS. Remove the `'paper-bg'` case in the texture cleanup at `:1761` with it
- Preserve: the four `data-testid` hooks added in Phase 2 (`quiz-question`, `quiz-answers`,
  `quiz-submit`, `quiz-banner`). The layout suite addresses the DOM through them

## Implementation Steps

1. Read `decisions.md` and `snippets-header.md` first — they carry the resolved decisions and the
   verified geometry this phase depends on.
2. Write `QuizModal.ts` with an explicit API: `open(question)`, `setTimer(seconds)`,
   `onSelect(cb)`, `onSubmit(cb)`, `showResult(isCorrect, correctKeys)`, `dispose()`.
3. Build the DOM tree above with a single stylesheet injected once, not per-element inline
   styles. Inline styles are why the current code has three divergent copies of the same
   intent.
4. Implement the `ResizeObserver` scale computation and disconnect it in `dispose()`.
5. Port the selection, hover and submit behaviour from `:1176-1247` and `:1265-1330`,
   preserving multi-select support — `selectedAnswers` is a `Set` and `correctAnswerKeys` is
   an array, so more than one correct answer is already possible.
6. Port the result highlight from `:1040-1062` (correct green, chosen-wrong red).
7. Move the banner into the reserved row; delete the `document.body.appendChild` version.
8. Replace the `24px` banner font and the `clamp(vw)` sizes at `:1165`, `:1202`, `:1233` with
   `--ui-scale` expressions.
9. Render fish, name and timer in `.header`, keeping its leftmost ~350px clear for the HUD; drive
   the timer from the existing `timeRemaining` update at `:168`.
10. Wire `dispose()` into `shutdown()` (`:1800`) and verify no listener or node leaks across
    consecutive quizzes — open six in a row and count nodes.
11. Run `npm run test:layout`. Clipping assertions should pass at all six sizes; auto-fit
    assertions for extreme content may still fail and are Phase 4's job.

## Success Criteria

- [ ] `grep -n "getBoundingClientRect\|paperBg\.\|scaleX\|scaleY" src/scenes/quizScene.ts`
      returns nothing in the quiz UI path
- [ ] `grep -n "vw\|vh" src/components/QuizModal.ts` returns nothing for font sizing
- [ ] Question, answers, submit and banner never overlap at any of the six sizes
- [ ] Baseline failures from Phase 2 for the `short` and `long` fixtures now pass at all six
      sizes
- [ ] Resizing with the quiz open never leaves an element misaligned from the panel
- [ ] Six consecutive quizzes leave no orphaned DOM nodes and no leaked listeners
- [ ] Multi-correct-answer questions still work
- [ ] `gameType=1` still routes to `FishingMiniGameScene`

## Risk Assessment

- **Risk:** the rewrite silently drops a behaviour buried in the 165 lines being deleted —
  hover states, cursor handling (`cursor: none` everywhere, because a custom DOM cursor is
  drawn at `:901`), or the image detail overlay at `:835-860`.
  Signal: a feature quietly stops working with no error.
  Response: enumerate every behaviour in the deleted ranges into a checklist before deleting,
  and tick each one off in the new component. The image click-to-enlarge overlay at `:835` is
  the most likely casualty.
- **Risk:** `min-height: 0` omitted on a flex child, reproducing the original clipping in new
  code. Signal: question clips at small sizes despite the rewrite. Response: it is in the
  success criteria; the Phase 2 assertion catches it.
- **Risk (narrowed):** the 16px fish PNG renders blurry at a fractional scale. There is no
  spritesheet — fish are single images (`fishFactory.ts:241,257`) — so the frame-selection risk
  originally recorded here does not exist. Signal: smeared pixel art. Response: integer scale
  multiples plus `image-rendering: pixelated`; see `snippets-header.md`.
- **Risk:** the fish variant shown changes behaviour. `FishFactory.createFish()` randomises the
  variant per call (`fishFactory.ts:121-126`). The port must reuse that same selection, not
  reimplement it and not "fix" it — the variant mismatch is out of scope by decision. Signal: the
  quiz starts showing a consistently different fish than before. Response: extract the existing
  selection into one shared helper so factory and modal cannot diverge.
- **Risk:** the full-viewport modal covers the lives/progress/points DOM HUD from
  `gameScene.ts:2274`. Signal: HUD disappears during quizzes. Response: Open Question 2 —
  decide deliberately rather than discovering it.

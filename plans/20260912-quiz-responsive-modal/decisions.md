# Decisions

Recorded separately from `plan.md` because three red-team reviewers are reading the plan files
concurrently. Fold into `plan.md`, `phase-03` and `phase-05` during the mandatory Whole-Plan
Consistency Sweep after red-team adjudication.

## Branch

`fix/quiz-responsive-modal`, cut from `no-math` on 2026-09-12. Working-tree changes carried
over: the dev harness (`src/iframe-host.html`, `src/index.html`, `webpack.config.js`) plus
pre-existing modifications to `howToPlayScene.ts` and `apiService.js` that were already
uncommitted.

## Open Question 1 — RESOLVED: Option A

User decision, 2026-09-12: move the fish and everything related to it into the DOM. Option B
(keep them on canvas, size the modal to the canvas rect) is **rejected** — it retains a
`getBoundingClientRect` dependency, which is the exact mechanism the plan exists to remove.

Phase 3 proceeds with the `.header` row. Phase 5's Option A branch is now the only branch.

## Recipe 1 — Paper surface: pure CSS, zero assets

`paper-bg` is not an asset file. `createPaperBackground()` (`quizScene.ts:118-150`) generates it
at runtime with Phaser graphics, and `preloadScene.ts` never loads anything matching `paper` —
so the generate branch at `:120` always executes. What it draws:

| Element | Code | CSS equivalent |
|---|---|---|
| base fill `#f0f0f0`, 400x500 | `:125-126` | `background-color: #f0f0f0` |
| ruled lines `#ccccff` @ 50% alpha, every 30px from y=40, x 20→380 | `:129-135` | `repeating-linear-gradient` |
| left margin band `#dddddd`, 20px wide | `:138-139` | `border-left` or a `linear-gradient` stop |
| binding holes `#333333`, r=5 at x=10, every 80px from y=50 | `:142-145` | `repeating-radial-gradient` |

The texture is then stretched by `setDisplaySize(camera.width * 0.8, camera.height * 0.85)`
(`:153-162`), i.e. 400x500 → 1536x918 on the 1920x1080 design surface. That is **3.84x
horizontal and 1.84x vertical** — a non-uniform stretch. It is why the binding holes render as
ovals rather than circles in both bug screenshots, and why line spacing looks wrong.

Consequence: moving the paper to CSS is a fidelity **improvement**, not a risk. Holes stay
circular, line spacing scales with `--ui-scale`, and no texture generation or Phaser image is
needed. The Phase 3 risk "moving fish/timer to DOM loses the pixel-art look" does not apply to
the paper at all — the paper was never pixel art.

Keep `graphics.destroy()` semantics in mind: once `createPaperBackground()` is removed, the
texture-key cleanup at `:1761` that special-cases `'paper-bg'` becomes dead and must go with it.

## Recipe 2 — Fish sprite: a plain `<img>`

Fish are single images, not spritesheets: `scene.load.image(fishKey, fishPath)`
(`fishFactory.ts:241`, `:257`). So DOM rendering needs no texture extraction, no canvas
round-trip, and no `background-position` frame maths.

- **URL** — `getFishPath(fishType, variant?)` (`const/fishType.ts:258`) is the single source of
  the path, built on `fishPath = 'assets/fish/'` (`:161`). Call it directly from the modal;
  do not hand-build paths.
- **Intrinsic size** — `fishSizes` (`const/fishType.ts:66-68`): every fish is 16x16 except
  `shark_whale` at 48x16.
- **Scaling** — because the source is 16px, pick an **integer** multiple so pixel art stays
  crisp: `width: calc(16px * var(--fish-k) * var(--ui-scale))` with `--fish-k` an integer
  chosen to fill the header band. Add `image-rendering: pixelated` to match the canvas
  treatment already applied globally in `index.html:30-31`.
- **Asset resolution inside the iframe** — the inner frame is `/index.html`, so the relative
  `assets/fish/...` URL resolves correctly; `webpack.config.js` copies `assets` to the output
  root. The harness page at `/iframe-host.html` never loads fish assets itself.

### Pre-existing bug to decide on, not to inherit silently

`FishFactory.createFish()` picks a variant **at random** (`fishFactory.ts:121-126`) every time
it is called. `createQuizUI()` calls it at `:227`, independently of whichever variant was shown
when the fish was caught. So today the quiz can already display a different variant of the
right species.

### Verified cost — corrected

An earlier note in this file called it "a one-field change". That was wrong. Verified:

- `gameScene.ts:919` stores only `this.currentFish` as a `FishType`. No variant is persisted
  anywhere.
- The variant is randomised **independently at three separate call sites**:
  `fishFactory.ts:121-126` (used by the quiz via `createQuizUI():227`), a second ad-hoc random
  pick at `gameScene.ts:3904-3913`, and another `createFish` call for the catch animation at
  `gameScene.ts:4020`.
- Consequence: the swimming fish, the catch-effect fish, and the quiz fish can already be three
  different variants of the same species today.

Making the quiz show "the caught fish" therefore requires choosing and storing a variant at
catch time (`:919`), adding an optional `variant` parameter to `FishFactory.createFish`, passing
it through the QuizScene launch payload (`:1028`), and updating `:3904` and `:4020` so all three
sites agree. Four touch points, two files, one factory signature change.

**Conflict with a standing project rule.** `no-math-case-plan.md` states "Do not change any
logic with gameType!=1". Threading variant state through `gameScene` is a change to `gameType 0`
logic. This makes the variant fix a separate decision from the layout work, not a rider on it.

**RESOLVED 2026-09-12: port keeps the random pick; the variant bug is split out.**

Phase 3 calls `getFishPath(fishType, variant)` with a variant chosen exactly the way
`fishFactory.ts:121-126` chooses it today, so observable behaviour is unchanged and `gameScene`
is not touched. No conflict with the `gameType!=1` rule.

The variant mismatch is recorded as a known pre-existing defect, out of scope for this plan. It
needs its own change with its own justification, and it should fix all three call sites together
(`fishFactory.ts:121-126`, `gameScene.ts:3904-3913`, `gameScene.ts:4020`) rather than only the
quiz — fixing the quiz alone would make the inconsistency more visible, not less.

Implementation note: to keep the random pick identical, the modal must reuse the same selection
expression rather than reimplementing it. Extract it into a small exported helper used by both
`FishFactory.createFish` and the modal, so the two cannot drift.

## Recipe 3 — Fish name

`formatFishName()` (`quizScene.ts:255`) already produces the display string. Render as DOM text
in `.header`, replacing the Phaser text at `:256-267` (currently 24px hardcoded with a white
stroke — the stroke exists to lift it off the paper and is unnecessary once it sits in a styled
DOM row).

## Recipe 4 — Countdown timer

Phaser text at `:274-285` (28px hardcoded, yellow, positioned `cameras.main.width - 80, 30`)
updated via `setText` at `:168`. Replace with `modal.setTimer(seconds)` writing into a
`.header` element. The update call site at `:168` stays; only the sink changes.

Note the current position is the top-right of the **camera**, not the paper — so at small
scales it already floats away from the panel it belongs to. Putting it in the header fixes that
as a side effect.

## Risk register delta

- **Removed** — "Option A's DOM fish rendering does not match FishFactory's spritesheet frame
  selection" (Phase 3). There is no spritesheet; fish are single PNGs.
- **Removed** — "moving fish/timer to DOM loses the pixel-art look" as it applies to the paper
  surface. The paper is generated vector graphics, not pixel art.
- **Retained, narrowed** — pixel-art crispness still matters for the 16px fish PNG. Mitigation
  is integer scaling plus `image-rendering: pixelated`.
- **New, low** — removing `createPaperBackground()` orphans the `'paper-bg'` branch of the
  texture cleanup at `quizScene.ts:1761`. Delete together or the cleanup silently no-ops.
- **New, medium** — the fish-variant decision above changes observable behaviour. Must be an
  explicit choice with the user, not a side effect of the port.

# Phase 3 header snippets — paper surface, fish sprite, name, timer

Concrete implementation detail for the `.header` and `.panel` of `QuizModal.ts`, so Phase 3 is
mechanical rather than exploratory. Every constant is derived from the Phaser code being
replaced, computed rather than eyeballed, so the port lands on the current look instead of
someone's guess at it.

## Derivation

`createPaperBackground()` (`quizScene.ts:118-163`) generates a 400x500 texture, then stretches
it with `setDisplaySize(camera.width * 0.8, camera.height * 0.85)` — 1536x918 on the 1920x1080
design surface, i.e. **3.840x horizontal and 1.836x vertical**. Non-uniform. `Scale.FIT` then
multiplies everything by 0.7481 at the 1588x810 baseline iframe.

What the player actually sees today, in CSS pixels at that baseline:

| Feature | Source (400x500) | Rendered today | CSS constant at `--ui-scale: 1` |
|---|---|---|---|
| panel | 400 x 500 | 1149 x 687 | superseded, see below |
| ruled line spacing | 30 | 41.2 | `41px` |
| first line offset | 40 | 54.9 | `55px` |
| left margin width | 20 | 57.5 | `58px` |
| hole spacing | 80 | 109.9 | `110px` |
| first hole offset | 50 | 68.7 | `69px` |
| hole size | r=5 circle | 28.7 x 13.7 **oval** | `14px` circle |

The 2.09:1 oval is the visible artefact of the non-uniform stretch — the binding holes in both
bug screenshots are elongated blobs. CSS restores circles.

**Panel size deliberately changes.** The old panel was 80% x 85% of the camera, which is
1149x687 CSS px at baseline. Option A drops those fractions and fills the modal minus a small
gutter: ~1572x794 at the same baseline. That is **+58% panel area**, and it goes straight into
the answers region — which is the cheapest way to keep the Phase 4 auto-fit ladder off its 11px
floor. Record it as intended, not incidental.

## Paper surface — CSS, no assets

```css
#quiz-modal .panel {
  --line-step:   calc(41px  * var(--ui-scale));
  --line-first:  calc(55px  * var(--ui-scale));
  --margin-w:    calc(58px  * var(--ui-scale));
  --hole-step:   calc(110px * var(--ui-scale));
  --hole-first:  calc(69px  * var(--ui-scale));
  --hole-d:      calc(14px  * var(--ui-scale));

  background-color: #f0f0f0;

  /* Layer order is paint order, topmost first. The margin band sits ABOVE the
     ruled lines so the lines stop at the band instead of crossing it, matching
     the original which drew lines from x=20 only (quizScene.ts:132-133). */
  background-image:
    radial-gradient(circle closest-side, #333333 100%, transparent 100%),
    linear-gradient(to right, #dddddd 0 var(--margin-w), transparent var(--margin-w)),
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(var(--line-step) - 1px),
      rgba(204, 204, 255, 0.5) calc(var(--line-step) - 1px),
      rgba(204, 204, 255, 0.5) var(--line-step)
    );
  background-repeat: repeat-y, no-repeat, repeat;
  background-size:
    var(--hole-d) var(--hole-step),
    100% 100%,
    100% 100%;
  background-position:
    calc((var(--margin-w) - var(--hole-d)) / 2) var(--hole-first),
    0 0,
    0 var(--line-first);
}
```

Colours taken verbatim from `:125` (`0xf0f0f0`), `:129` (`0xccccff` at alpha 0.5), `:138`
(`0xdddddd`), `:142` (`0x333333`).

## Fish sprite — a plain `<img>`

No spritesheet exists; `fishFactory.ts:241,257` load single images via `scene.load.image`.

```ts
import { getFishPath, fishSizes, FishType } from '../const/fishType';

private buildFish(fishType: FishType, variant?: string): HTMLImageElement {
  const img = document.createElement('img');
  img.src = getFishPath(fishType, variant);   // const/fishType.ts:258
  img.alt = '';                               // decorative: the name renders as text alongside
  const dim = fishSizes[fishType] ?? { width: 16, height: 16 };  // :66-68
  img.style.width  = `calc(${dim.width}px  * var(--fish-k) * var(--ui-scale))`;
  img.style.height = `calc(${dim.height}px * var(--fish-k) * var(--ui-scale))`;
  img.style.imageRendering = 'pixelated';     // matches index.html:30-31
  return img;
}
```

`--fish-k: 4` gives a 64px fish at `--ui-scale: 1`. Keep it an **integer** — 16px pixel art at a
fractional multiple smears, which is the one real crispness risk in this port. `shark_whale` is
48x16 (`:68`) and the only non-square case; deriving both axes from `fishSizes` handles it
without a special case.

`getFishPath` is the sole path builder — do not hand-assemble URLs from
`fishPath = 'assets/fish/'` (`:161`). The inner frame is served at `/index.html`, so the
relative URL resolves; `webpack.config.js` copies `assets` to the output root.

### Variant: keep the current random pick

Decided 2026-09-12 — the port must not change observable behaviour. `FishFactory.createFish()`
randomises the variant on every call (`fishFactory.ts:121-126`) and `createQuizUI()` calls it at
`:227` without reference to what was caught, so the quiz can already show a different variant of
the right species. That stays as-is here.

Extract the selection into one exported helper used by both `FishFactory.createFish` and
`buildFish` above, so the two cannot drift apart. Do **not** reimplement the `Math.random()`
expression in the modal.

The variant mismatch is a known pre-existing defect, out of scope for this plan. Fixing it means
touching `gameScene.ts:919`, `:3904-3913`, `:4020` and the factory signature, which collides with
the `Do not change any logic with gameType!=1` rule in `no-math-case-plan.md`. See
`decisions.md`.

## Name and timer

```ts
// name — reuse the existing formatter at quizScene.ts:255
nameEl.textContent = this.formatFishName(fishType);

// timer — replaces the Phaser text at :274-285; the update site at :168 keeps its shape
public setTimer(seconds: number): void {
  this.timerEl.textContent = `Time: ${seconds}`;
}
```

The Phaser timer sits at `cameras.main.width - 80, 30` (`:275-276`) — anchored to the camera, not
the paper, so it already drifts away from the panel at small scales. Moving it into `.header`
fixes that as a side effect. Its hardcoded 28px and the name's hardcoded 24px (`:261`) both
become `--ui-scale` expressions; the name's white stroke (`:264-265`) exists to lift it off the
paper and is unnecessary in a styled DOM row.

## Cleanup coupling

Removing `createPaperBackground()` orphans the `'paper-bg'` case in the texture cleanup at
`quizScene.ts:1761`. Delete both together or the cleanup silently no-ops on a key that no longer
exists.

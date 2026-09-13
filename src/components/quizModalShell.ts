/**
 * Quiz modal shell — DOM structure, scaling and fitting only.
 *
 * Owns no quiz behaviour. QuizScene keeps every handler, every selection rule and every API call
 * it had; this module only provides the boxes those things live in, and guarantees they cannot
 * overlap or clip.
 *
 * Why it exists: the old layout positioned three separate `position: fixed` blocks by converting
 * Phaser world coordinates through `canvas.getBoundingClientRect()`, while sizing text from CSS
 * viewport units. Box height therefore tracked the canvas scale and font tracked the iframe width
 * — two unrelated measures, so every constant was correct at exactly one screen size. Here
 * everything is one flex column and one scale factor.
 *
 * Constraint honoured throughout: injected question/answer markup is never restyled. No descendant
 * font-size override, no margin reset. Fitting is done by changing the container — scale, column
 * count, scroll — never the content.
 */

/** Design baseline: the iframe inner size at viewport 1920x1080. See iframe_clue.md. */
const BASE_W = 1586;
const BASE_H = 808;

/** Answer text never renders below this, whatever the fit ladder decides. */
const FONT_FLOOR_PX = 11;
const ANSWER_FONT_PX = 16;

/** Width the lives/progress/points HUD occupies at the top-left (gameScene.ts:2320). */
const HUD_SAFE_W = 350;

const STYLE_ID = 'quiz-modal-style';

export interface QuizModalShell {
  root: HTMLDivElement;
  /** Mount point for the question block. */
  questionSlot: HTMLDivElement;
  /** Mount point for the answers grid + submit button. */
  answersSlot: HTMLDivElement;
  /** Mount point for the submit button. Its own row so it never scrolls out of reach. */
  submitSlot: HTMLDivElement;
  /** Reserved row for the result banner. Visibility is toggled, never display. */
  bannerSlot: HTMLDivElement;
  /** Seconds remaining. Formatting and the urgent state are presentation, decided here. */
  setTimer(secondsRemaining: number): void;
  /** Arbitrary header chip text — the review modal shows points here rather than a countdown. */
  setChip(text: string, urgent?: boolean): void;
  /** Run the fit ladder. Safe to call repeatedly; no-ops after dispose. */
  fit(): void;
  dispose(): void;
}

function styleSheet(): string {
  return `
#quiz-modal {
  position: fixed;
  inset: 0;
  z-index: 999;                 /* above the canvas, below the HUD (1000) so the HUD stays visible */
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-family: Arial, sans-serif;
  color: #000;
  cursor: none;
  --ui-scale: 1;
  --answers-cols: 1fr 1fr;

  /* Palette. Warm ivory paper rather than the old cold #f0f0f0 grey, a softer rule colour, and a
     red margin line — the notebook look, done deliberately instead of incidentally. */
  --paper: #faf6ec;
  --paper-band: #f3eddd;
  --paper-edge: #e0d7c2;
  --rule: #dfe3f5;
  --hole: #cbc3b4;
  --accent: #c0392b;
  --ink: #2c3e50;
  --ink-soft: #5a6b7a;
  --card: #fffdf7;
  --card-edge: #d9d2c2;
  --card-edge-hover: #b9ad93;
  --ok: #2e7d32;
  --ok-bg: #e8f5e9;
  --bad: #c62828;
  --bad-bg: #fdecea;
  --go: #2f6f4f;
}

#quiz-modal .qm-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
}

#quiz-modal .qm-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: calc(100% - 16px);
  height: calc(100% - 16px);
  box-sizing: border-box;
  padding: calc(10px * var(--ui-scale));
  overflow: hidden;

  /* Paper surface, reproducing quizScene.createPaperBackground() in CSS. Constants derived from
     the generated 400x500 texture and its 3.84x / 1.84x non-uniform stretch; see
     plans/.../snippets-header.md. Circles stay circles here, which the stretch broke. */
  --line-step:  calc(41px  * var(--ui-scale));
  --line-first: calc(55px  * var(--ui-scale));
  --margin-w:   calc(58px  * var(--ui-scale));
  --hole-step:  calc(110px * var(--ui-scale));
  --hole-first: calc(69px  * var(--ui-scale));
  --hole-d:     calc(14px  * var(--ui-scale));

  border-radius: calc(6px * var(--ui-scale));
  border: 1px solid var(--paper-edge);
  box-shadow: 0 calc(6px * var(--ui-scale)) calc(24px * var(--ui-scale)) rgba(31, 26, 18, 0.28);

  background-color: var(--paper);
  background-image:
    /* binding holes, down the margin band */
    radial-gradient(circle closest-side, var(--hole) 100%, transparent 100%),
    /* the red margin rule */
    linear-gradient(
      to right,
      transparent 0 calc(var(--margin-w) - 1.5px),
      var(--accent) calc(var(--margin-w) - 1.5px) var(--margin-w),
      transparent var(--margin-w)
    ),
    /* margin band, a shade cooler than the page */
    linear-gradient(to right, var(--paper-band) 0 var(--margin-w), transparent var(--margin-w)),
    /* ruled lines */
    repeating-linear-gradient(
      to bottom,
      transparent 0,
      transparent calc(var(--line-step) - 1px),
      var(--rule) calc(var(--line-step) - 1px),
      var(--rule) var(--line-step)
    );
  background-repeat: repeat-y, no-repeat, no-repeat, repeat;
  background-size:
    var(--hole-d) var(--hole-step),
    100% 100%,
    100% 100%,
    100% 100%;
  background-position:
    calc((var(--margin-w) - var(--hole-d)) / 2) var(--hole-first),
    0 0,
    0 0,
    0 var(--line-first);
}

/* Header: fish, name, timer. Its left region is kept clear for the game HUD. */
#quiz-modal .qm-header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: calc(10px * var(--ui-scale));
  padding-left: calc(${HUD_SAFE_W}px * var(--ui-scale));
  padding-bottom: calc(8px * var(--ui-scale));
  margin-bottom: calc(8px * var(--ui-scale));
  border-bottom: 1px solid var(--paper-edge);
  min-height: calc(72px * var(--ui-scale));
}

#quiz-modal .qm-fish {
  flex: 0 0 auto;
  image-rendering: pixelated;
  display: block;
}

#quiz-modal .qm-fishname {
  flex: 1 1 auto;
  font-weight: bold;
  color: var(--ink);
  font-size: max(12px, calc(24px * var(--ui-scale)));
  letter-spacing: 0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Timer as a chip so it reads as a status, and turns urgent on its own. The threshold is a pure
   presentation read of the countdown the scene already maintains; no timing logic changes. */
#quiz-modal .qm-timer {
  flex: 0 0 auto;
  font-weight: bold;
  color: var(--ink);
  background: var(--paper-band);
  border: 1px solid var(--paper-edge);
  border-radius: 999px;
  padding: calc(4px * var(--ui-scale)) calc(14px * var(--ui-scale));
  font-size: max(12px, calc(22px * var(--ui-scale)));
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}

#quiz-modal .qm-timer.is-urgent {
  color: #fff;
  background: var(--accent);
  border-color: var(--accent);
}

/* Question: the only row allowed to absorb slack. min-height:0 is required or flex refuses to
   shrink it below content size, which is exactly how the original clipped. */
/* The question takes its content height and is not the slack absorber — a squeezed question is
   unreadable, and a child taller than its slot reaches into the answers row. Capped so a very tall
   question cannot starve the answers instead. */
/* flex-shrink 0: the question must never be squeezed below its own content height. With shrink 1
   the slot got smaller than its child, and the child then reached down into the answers row —
   invisible thanks to overflow:hidden, but a real geometric overlap. Tall questions are bounded by
   max-height instead, and scroll if they hit it. */
#quiz-modal .qm-question {
  flex: 0 0 auto;
  min-height: 0;
  max-height: 55%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* flex-start, not center: with center, a child taller than the slot bleeds equally out of both
     ends instead of staying inside it. Visually the slot clips it, but it still reaches into the
     answers row's space, which is exactly the overlap this design exists to make impossible. */
  justify-content: flex-start;
  /* Same reasoning as .qm-choice: wrap a long token instead of letting it escape the panel. */
  overflow-wrap: anywhere;
  word-break: break-word;
  font-size: max(${FONT_FLOOR_PX}px, calc(${ANSWER_FONT_PX}px * var(--ui-scale)));
  line-height: 1.4;
  text-align: left;
}

/* 0 1 auto, not 0 0 auto: the answers row must be allowed to shrink below its content height.
   Otherwise it grows to whatever the content wants — four 200px images demand ~560px — the question
   row is squeezed to nothing, and turning on overflow-y at the terminal fit level does nothing
   because an unbounded box has nothing to scroll within. */
/* The answers row absorbs the slack: it grows into spare space and, crucially, is bounded by what
   is left so 'overflow-y: auto' at the terminal fit level has something to scroll within. With
   '0 0 auto' it grew to content instead — four 200px images demanded ~560px, the question was
   squeezed below its own height, and scrolling never engaged.
   (Note: no backticks in here — this comment lives inside a template literal.) */
#quiz-modal .qm-answers {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}

/* Submit gets its own non-scrolling row. Nested inside the answers region it scrolled away with
   the options and got clipped, which makes the quiz unfinishable at small sizes. */
#quiz-modal .qm-submit {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
}

#quiz-modal .qm-banner-slot {
  flex: 0 0 auto;
  min-height: calc(46px * var(--ui-scale));
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Scroll is the terminal fit level, reached only when scaling and reflow are exhausted. */
#quiz-modal .qm-scroll-y { overflow-y: auto; }
#quiz-modal .qm-scroll-x { overflow-x: auto; }

#quiz-modal .qm-scroll-y::-webkit-scrollbar { width: calc(10px * var(--ui-scale)); }
#quiz-modal .qm-scroll-y::-webkit-scrollbar-thumb {
  background: var(--card-edge-hover);
  border-radius: 999px;
}
#quiz-modal .qm-scroll-y::-webkit-scrollbar-track { background: transparent; }

/* ---------- answer options ----------
   These boxes are chrome our own code creates, so styling them is fair game. The injected answer
   markup inside them is never touched. State lives in classes rather than inline styles, which also
   removes an old inconsistency: creation painted an unselected box #f5f5f5/#90caf9 while the toggle
   handler repainted it #f9f9f9/#ddd, so a box looked different before and after being touched. */
#quiz-modal .qm-choice {
  display: flex;
  align-items: flex-start;
  gap: calc(10px * var(--ui-scale));
  /* Let an unbreakable token wrap rather than escape the box. This is our container deciding how to
     cope with content that does not fit, not an override of anything the author set — backend markup
     does not specify overflow-wrap. The alternative is a horizontal scrollbar inside every answer
     box, which is worse for the age group. Flagged as a judgement call in plan.md. */
  overflow-wrap: anywhere;
  word-break: break-word;
  /* Here rather than inline on the element, so the fit ladder's .qm-scroll-x class can override it
     for a box whose content genuinely cannot wrap. */
  overflow: hidden;
  background: var(--card);
  border: 1px solid var(--card-edge);
  border-left: calc(3px * var(--ui-scale)) solid var(--card-edge);
  border-radius: calc(10px * var(--ui-scale));
  box-shadow: 0 1px calc(3px * var(--ui-scale)) rgba(31, 26, 18, 0.10);
  transition: border-color 120ms ease, background-color 120ms ease, box-shadow 120ms ease;
}

#quiz-modal .qm-choice:hover {
  background: #fffaf0;
  border-color: var(--card-edge-hover);
  border-left-color: var(--accent);
  box-shadow: 0 calc(2px * var(--ui-scale)) calc(8px * var(--ui-scale)) rgba(31, 26, 18, 0.14);
}

#quiz-modal .qm-choice.is-selected {
  background: #eef1f4;
  border-color: var(--ink);
  border-left-color: var(--ink);
}

#quiz-modal .qm-choice.is-correct {
  background: var(--ok-bg);
  border-color: var(--ok);
  border-left-color: var(--ok);
}

#quiz-modal .qm-choice.is-wrong {
  background: var(--bad-bg);
  border-color: var(--bad);
  border-left-color: var(--bad);
}

/* After submitting, options stop responding but stay legible — the old 0.7 opacity washed out the
   very answer the player is being shown as correct. */
#quiz-modal .qm-choice.is-locked { pointer-events: none; }
#quiz-modal .qm-choice.is-locked:hover {
  background: var(--card);
  border-color: var(--card-edge);
  border-left-color: var(--card-edge);
  box-shadow: 0 1px calc(3px * var(--ui-scale)) rgba(31, 26, 18, 0.10);
}
#quiz-modal .qm-choice.is-locked.is-selected { background: #eef1f4; }
#quiz-modal .qm-choice.is-locked.is-correct { background: var(--ok-bg); border-color: var(--ok); }
#quiz-modal .qm-choice.is-locked.is-wrong { background: var(--bad-bg); border-color: var(--bad); }

/* Letter badge. A round chip reads as a label instead of competing with the answer text. */
#quiz-modal .qm-chip {
  flex: 0 0 auto;
  width: calc(26px * var(--ui-scale));
  height: calc(26px * var(--ui-scale));
  min-width: 20px;
  min-height: 20px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--ink);
  color: var(--paper);
  font-weight: bold;
  font-size: max(11px, calc(14px * var(--ui-scale)));
  line-height: 1;
  font-family: Arial, sans-serif;
}

#quiz-modal .qm-choice.is-correct .qm-chip { background: var(--ok); }
#quiz-modal .qm-choice.is-wrong   .qm-chip { background: var(--bad); }

/* The injected answer markup goes here. Only the box is styled, never its contents. */
#quiz-modal .qm-choice-body {
  flex: 1 1 auto;
  min-width: 0;
}

/* ---------- submit ---------- */
#quiz-modal .qm-submit-btn {
  font-family: Arial, sans-serif;
  font-weight: bold;
  color: #fff;
  background: var(--go);
  border: none;
  border-radius: 999px;
  box-shadow: 0 calc(2px * var(--ui-scale)) calc(6px * var(--ui-scale)) rgba(31, 26, 18, 0.20);
  transition: background-color 120ms ease, box-shadow 120ms ease, transform 120ms ease;
  cursor: none;
}
#quiz-modal .qm-submit-btn:hover:not(:disabled) {
  background: #275b41;
  box-shadow: 0 calc(3px * var(--ui-scale)) calc(10px * var(--ui-scale)) rgba(31, 26, 18, 0.26);
}
#quiz-modal .qm-submit-btn:disabled {
  background: var(--card-edge);
  color: #8b8375;
  box-shadow: none;
}

/* ---------- result banner ---------- */
#quiz-modal .qm-banner {
  font-family: Arial, sans-serif;
  border: 1px solid transparent;
}
#quiz-modal .qm-banner.is-ok  { background: var(--ok-bg);  color: #1b5e20; border-color: var(--ok); }
#quiz-modal .qm-banner.is-bad { background: var(--bad-bg); color: #8e1b1b; border-color: var(--bad); }

/* ---------- accessibility ---------- */
#quiz-modal :focus-visible {
  outline: calc(3px * var(--ui-scale)) solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  #quiz-modal * { transition: none !important; animation: none !important; }
}
`;
}

/**
 * How far rendered content extends past the space its container provides.
 *
 * A Range over the element's contents bounds the actual rendered extent of text and child
 * border boxes and excludes margins. `scrollHeight - clientHeight` would count an author's
 * trailing block margin as overflow, and since author margins may not be overridden, the
 * measurement has to be the thing that adapts. Mirrors the predicate in tests/quiz-layout.spec.ts.
 */
/** Horizontal twin of contentOverflowPx. Tables and unbreakable tokens escape sideways, not down. */
export function contentOverflowXPx(el: Element): number {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const left = r.left + parseFloat(cs.borderLeftWidth || '0') + parseFloat(cs.paddingLeft || '0');
  const right = r.right - parseFloat(cs.borderRightWidth || '0') - parseFloat(cs.paddingRight || '0');

  const range = document.createRange();
  range.selectNodeContents(el);
  const ink = range.getBoundingClientRect();
  range.detach();

  if (ink.height === 0 && ink.width === 0) return 0;
  return Math.max(0, Math.round(ink.right - right)) + Math.max(0, Math.round(left - ink.left));
}

export function contentOverflowPx(el: Element): number {
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const top = r.top + parseFloat(cs.borderTopWidth || '0') + parseFloat(cs.paddingTop || '0');
  const bottom =
    r.bottom - parseFloat(cs.borderBottomWidth || '0') - parseFloat(cs.paddingBottom || '0');

  const range = document.createRange();
  range.selectNodeContents(el);
  const ink = range.getBoundingClientRect();
  range.detach();

  if (ink.height === 0 && ink.width === 0) return 0;
  return Math.max(0, Math.round(ink.bottom - bottom)) + Math.max(0, Math.round(top - ink.top));
}

export interface ShellOptions {
  /** Fish image URL, from getFishPath(). */
  fishSrc: string;
  /** Intrinsic pixel size of the fish image, from fishSizes[]. */
  fishW: number;
  fishH: number;
  fishName: string;
}

export function createQuizModalShell(opts: ShellOptions): QuizModalShell {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = styleSheet();
    document.head.appendChild(style);
  }

  const root = document.createElement('div');
  root.id = 'quiz-modal';

  const backdrop = document.createElement('div');
  backdrop.className = 'qm-backdrop';

  const panel = document.createElement('div');
  panel.className = 'qm-panel';

  const header = document.createElement('div');
  header.className = 'qm-header';

  const fish = document.createElement('img');
  fish.className = 'qm-fish';
  fish.src = opts.fishSrc;
  fish.alt = '';

  const fishName = document.createElement('div');
  fishName.className = 'qm-fishname';
  fishName.textContent = opts.fishName;

  const timer = document.createElement('div');
  timer.className = 'qm-timer';

  header.appendChild(fish);
  header.appendChild(fishName);
  header.appendChild(timer);

  const questionSlot = document.createElement('div');
  questionSlot.className = 'qm-question';

  const answersSlot = document.createElement('div');
  answersSlot.className = 'qm-answers';

  const submitSlot = document.createElement('div');
  submitSlot.className = 'qm-submit';

  const bannerSlot = document.createElement('div');
  bannerSlot.className = 'qm-banner-slot';

  panel.appendChild(header);
  panel.appendChild(questionSlot);
  panel.appendChild(answersSlot);
  panel.appendChild(submitSlot);
  panel.appendChild(bannerSlot);
  root.appendChild(backdrop);
  root.appendChild(panel);
  document.body.appendChild(root);

  let disposed = false;
  let fitting = false;

  /** Base scale from the viewport. min() over both axes — taking width alone was the original bug. */
  const baseScale = () =>
    Math.min(1, Math.max(0.3, Math.min(window.innerWidth / BASE_W, window.innerHeight / BASE_H)));

  const setScale = (s: number) => {
    root.style.setProperty('--ui-scale', String(s));
    // Pixel art: keep the fish on whole source pixels so it does not smear.
    const k = Math.max(2, Math.round(4 * s));
    fish.style.width = `${opts.fishW * k}px`;
    fish.style.height = `${opts.fishH * k}px`;
  };

  const answerBoxes = () =>
    Array.from(answersSlot.querySelectorAll('[data-choice-key]')) as HTMLElement[];

  const worstOverflow = () => {
    let worst = contentOverflowPx(questionSlot);
    for (const b of answerBoxes()) worst = Math.max(worst, contentOverflowPx(b));
    worst = Math.max(worst, contentOverflowPx(answersSlot));
    return worst;
  };

  const clearFitState = () => {
    root.style.setProperty('--answers-cols', '1fr 1fr');
    questionSlot.classList.remove('qm-scroll-y', 'qm-scroll-x');
    answersSlot.classList.remove('qm-scroll-y', 'qm-scroll-x');
  };

  /** Widest horizontal escape across the question and every answer box. */
  const worstOverflowX = () => {
    let worst = contentOverflowXPx(questionSlot);
    for (const b of answerBoxes()) worst = Math.max(worst, contentOverflowXPx(b));
    return worst;
  };

  const fit = () => {
    if (disposed || fitting) return;
    fitting = true;
    try {
      clearFitState();

      // Level 0/1: scale down from the viewport-derived base. Font bottoms out at FONT_FLOOR_PX
      // via CSS max(), so below that this only buys padding and header space.
      let s = baseScale();
      setScale(s);
      const MIN_SCALE = FONT_FLOOR_PX / ANSWER_FONT_PX;
      let guard = 0;
      while (worstOverflow() > 1 && s > MIN_SCALE && guard++ < 24) {
        s = Math.max(MIN_SCALE, s - 0.04);
        setScale(s);
      }
      if (worstOverflow() <= 1) return;

      // Level 2: one column. Taller rows, but each row is twice as wide, so wrapped answers may
      // collapse to fewer lines. Re-measure — it does not always help.
      root.style.setProperty('--answers-cols', '1fr');
      if (worstOverflow() <= 1) return;
      root.style.setProperty('--answers-cols', '1fr 1fr');

      // Level 3: scroll. Terminal, and legitimate — content that pins its own size cannot be
      // shrunk without restyling it, which is forbidden.
      questionSlot.classList.add('qm-scroll-y');
      answersSlot.classList.add('qm-scroll-y');
    } finally {
      // Horizontal is independent of the vertical ladder and has no scaling remedy: overflow-wrap
      // handles long tokens, but a table with fixed column widths cannot wrap at all. Scrolling is
      // the only option left that does not restyle the author's markup.
      // Per region, not blanket. Tagging both slots gave the answers region a scrollbar with
      // nothing to scroll whenever the overflow was actually in the question.
      if (contentOverflowXPx(questionSlot) > 1) {
        questionSlot.classList.add('qm-scroll-x');
      }
      // An answer box scrolls itself; scrolling its slot would not reveal content inside the box.
      for (const b of answerBoxes()) {
        b.classList.toggle('qm-scroll-x', contentOverflowXPx(b) > 1);
      }
      fitting = false;
    }
  };

  let ro: ResizeObserver | null = null;
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => {
      if (!disposed && !fitting) fit();
    });
    ro.observe(document.documentElement);
  }
  const onResize = () => {
    if (!disposed && !fitting) fit();
  };
  window.addEventListener('resize', onResize);

  setScale(baseScale());

  return {
    root,
    questionSlot,
    answersSlot,
    submitSlot,
    bannerSlot,
    setTimer(secondsRemaining: number) {
      const s = Math.max(0, Math.floor(secondsRemaining));
      timer.textContent = `Time: ${s}`;
      timer.classList.toggle('is-urgent', s <= 5);
    },
    setChip(text: string, urgent = false) {
      timer.textContent = text;
      timer.classList.toggle('is-urgent', urgent);
    },
    fit,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
      if (root.parentNode) root.parentNode.removeChild(root);
    }
  };
}

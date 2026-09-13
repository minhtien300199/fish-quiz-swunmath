import { test, expect, Page } from '@playwright/test';

/**
 * Small and narrow screens: the question and the answers must actually be shown.
 *
 * quiz-layout.spec.ts covers six sizes, but every one of them is landscape with an
 * aspect ratio between 1.95 and 2.24. Phaser's Scale.FIT only letterboxes
 * vertically once the viewport is *taller* than the 16:9 canvas, and the game HUD
 * is a viewport-fixed overlay anchored to the canvas rect at z-index 1000 — above
 * the modal's 999. So on a window snapped to half an HD screen (683x768, aspect
 * 0.89) the canvas top edge moved down ~192px and the HUD landed on top of the
 * answers. No size in that matrix could catch it.
 *
 * These cases therefore pin two things the fit ladder alone does not guarantee:
 * nothing overlaps the question or the answers, and no content is stranded
 * without a scrollbar to reach it.
 */

const SIZES = [
  { label: '1036x530 (HD 1366x768 host iframe)', width: 1036, height: 530 },
  { label: '951x488 (1280x720 host iframe)', width: 951, height: 488 },
  // Aspect 0.89. Taller than the canvas, so Scale.FIT letterboxes vertically.
  { label: '683x768 (window snapped to half an HD screen)', width: 683, height: 768 },
  // min(w/1586, h/808) drops under the 0.3 clamp here, so --ui-scale stops responding.
  { label: '476x532 (--ui-scale floor)', width: 476, height: 532 }
] as const;

/** Shapes that resist shrinking: a fixed-width table, six choices, an image. */
const FIXTURES = ['table', 'many6', 'img'] as const;

interface Rect { x: number; y: number; w: number; h: number }

const intersects = (a: Rect, b: Rect) =>
  a.w > 0 && a.h > 0 && b.w > 0 && b.h > 0 &&
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

async function openQuiz(page: Page, fixture: string): Promise<void> {
  await page.goto(`/index.html?devQuiz=${fixture}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-choice-key]', { state: 'attached', timeout: 60_000 });
  await page
    .waitForFunction(
      () =>
        Array.from(document.querySelectorAll('#quiz-modal img')).every(
          i => (i as HTMLImageElement).complete
        ),
      { timeout: 20_000 }
    )
    .catch(() => {
      /* a stuck image is itself a finding, reported by the overflow assertions */
    });
  await page.waitForTimeout(600); // let the fit ladder settle
}

async function report(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) return { x: 0, y: 0, w: 0, h: 0 };
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };

    /** Overflow with no scrollbar on the axis is content the player cannot reach. */
    const strandedY = (el: Element | null) => {
      if (!el) return 0;
      const over = Math.max(0, el.scrollHeight - el.clientHeight);
      return over > 1 && !['auto', 'scroll'].includes(getComputedStyle(el).overflowY) ? over : 0;
    };
    const strandedX = (el: Element | null) => {
      if (!el) return 0;
      const over = Math.max(0, el.scrollWidth - el.clientWidth);
      return over > 1 && !['auto', 'scroll'].includes(getComputedStyle(el).overflowX) ? over : 0;
    };

    const question = document.querySelector('#quiz-modal .qm-question');
    const answers = document.querySelector('#quiz-modal .qm-answers');
    const submit = document.querySelector('[data-testid="quiz-submit"]');
    const hud = document.getElementById('game-hud');

    return {
      hasModal: !!document.getElementById('quiz-modal'),
      question: box(question),
      answers: box(answers),
      submit: box(submit),
      hud: box(hud),
      hudHidden: !hud || getComputedStyle(hud).display === 'none',
      choices: Array.from(document.querySelectorAll('[data-choice-key]')).map(el => ({
        key: el.getAttribute('data-choice-key') || '?',
        rect: box(el),
        strandedX: strandedX(el)
      })),
      strandedY: Math.max(strandedY(question), strandedY(answers)),
      strandedX: Math.max(strandedX(question), strandedX(answers)),
      viewport: { w: window.innerWidth, h: window.innerHeight }
    };
  });
}

for (const size of SIZES) {
  test.describe(size.label, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const fixture of FIXTURES) {
      test(`"${fixture}" shows question and answers`, async ({ page }) => {
        await openQuiz(page, fixture);
        const r = await report(page);

        expect(r.hasModal, 'quiz modal mounted').toBe(true);
        expect(r.choices.length, 'answers rendered').toBeGreaterThan(0);

        // The HUD must not cover the question or any answer. Hiding it satisfies
        // this; so would moving it somewhere harmless.
        expect(
          intersects(r.hud, r.question),
          `game HUD overlaps the question (hud ${JSON.stringify(r.hud)})`
        ).toBe(false);
        expect(
          intersects(r.hud, r.answers),
          `game HUD overlaps the answers (hud ${JSON.stringify(r.hud)})`
        ).toBe(false);
        for (const c of r.choices) {
          expect(intersects(r.hud, c.rect), `game HUD overlaps answer ${c.key}`).toBe(false);
        }

        // Content may be off-screen, but never unreachable.
        expect(r.strandedY, 'vertical overflow with no scrollbar').toBeLessThanOrEqual(1);
        expect(r.strandedX, 'horizontal overflow with no scrollbar').toBeLessThanOrEqual(1);
        for (const c of r.choices) {
          expect(c.strandedX, `answer ${c.key} clipped sideways`).toBeLessThanOrEqual(1);
        }

        // The player has to be able to submit.
        expect(r.submit.w, 'submit button rendered').toBeGreaterThan(0);
        expect(r.submit.y, 'submit button top on screen').toBeGreaterThanOrEqual(-1);
        expect(
          r.submit.y + r.submit.h,
          'submit button bottom on screen'
        ).toBeLessThanOrEqual(r.viewport.h + 1);
      });
    }
  });
}

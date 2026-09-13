import { test, expect, Page } from '@playwright/test';

/**
 * Quiz layout regression suite.
 *
 * Viewports are the INNER sizes of the host iframe measured in iframe_clue.md (border-box
 * minus the 1px border each side), plus one stress size below every real configuration.
 */
const SIZES = [
  { label: '1586x808 (viewport 1920x1080)', width: 1586, height: 808 },
  { label: '1586x709 (Chrome maximized 1920x969)', width: 1586, height: 709 },
  { label: '1268x648 (viewport 1600x900)', width: 1268, height: 648 },
  { label: '1036x530 (viewport 1366x768)', width: 1036, height: 530 },
  { label: '951x488 (viewport 1280x720)', width: 951, height: 488 },
  { label: '898x418 (stress, below all real sizes)', width: 898, height: 418 }
] as const;

/**
 * Fixture ids from src/dev/quizFixtures.ts. `fallback*` reuse entries from the offline fallback
 * bank, which is NOT representative of backend content. A fixture from a captured real API
 * response is still missing; until then this matrix bounds nothing about production content.
 */
const FIXTURES = [
  'fallback3',
  'fallback4',
  'short',
  'wrap',
  'img',
  'imgq',
  'mixed',
  // Shapes chosen because they are the ones that break layouts: tables and unbreakable tokens
  // resist shrinking horizontally, MathML takes its own rendering path, choice counts other than
  // four break grid assumptions, rich inline markup nests, and a missing image must still trigger
  // a refit through the error listener rather than the load one.
  'table',
  'longword',
  'math',
  'many6',
  'two',
  'rich',
  'brokenimg'
] as const;

const FONT_FLOOR_PX = 11;

interface ChoiceReport {
  key: string;
  overflowBy: number;
  overflowXBy: number;
  scrollXActive: boolean;
  scrollableX: boolean;
  fontPx: number;
  rect: { x: number; y: number; w: number; h: number };
}

interface LayoutReport {
  found: { question: boolean; answers: boolean; submit: boolean };
  question: {
    overflowBy: number;
    overflowXBy: number;
    rect: { x: number; y: number; w: number; h: number };
  } | null;
  answers: { rect: { x: number; y: number; w: number; h: number } } | null;
  submit: { rect: { x: number; y: number; w: number; h: number } } | null;
  answersRegion: { overflowY: string; scrollable: boolean } | null;
  answersScrollX: { active: boolean; scrollable: boolean } | null;
  questionScrollX: { active: boolean; scrollable: boolean } | null;
  choices: ChoiceReport[];
  viewport: { w: number; h: number };
  bannerCount: number;
}

/** Opens the quiz directly via the dev route and waits for content and images to settle. */
async function openQuiz(page: Page, fixture: string): Promise<void> {
  await page.goto(`/index.html?devQuiz=${fixture}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="quiz-answers"]', { state: 'attached', timeout: 60_000 });
  await page.waitForSelector('[data-choice-key]', { state: 'attached', timeout: 60_000 });

  // Answer content can contain <img>. Measuring before decode reports the wrong height, so
  // wait for every image inside the quiz to settle (complete covers cache hits and errors).
  await page
    .waitForFunction(
      () => {
        const roots = document.querySelectorAll(
          '[data-testid="quiz-question"], [data-testid="quiz-answers"]'
        );
        const imgs: HTMLImageElement[] = [];
        roots.forEach(r => r.querySelectorAll('img').forEach(i => imgs.push(i as HTMLImageElement)));
        return imgs.every(i => i.complete);
      },
      { timeout: 20_000 }
    )
    .catch(() => {
      /* fall through: a stuck image is itself a finding, reported by the overflow assertions */
    });

  // One extra frame so layout is flushed after the last decode.
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
}

async function collectLayout(page: Page): Promise<LayoutReport> {
  return page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    };

    /**
     * How far the rendered content extends beyond the space its container gives it.
     *
     * Deliberately NOT `scrollHeight - clientHeight`. That counts an author's trailing block
     * margin as overflow, so a box whose text is fully visible still reports a deficit — the
     * `<p>` wrappers in quiz content made every fixture fail by ~30px for that reason alone.
     * Since overriding author margins is off limits, the assertion has to change instead.
     *
     * A Range over the element's contents bounds the actual rendered extent of text and child
     * border-boxes and excludes margins, which is exactly "does the content fit the space".
     * Range rects and element rects are both viewport-relative, so the comparison is valid as
     * long as nothing is scrolled — this suite never scrolls.
     */
    /** Horizontal twin of `overflow`. Tables and unbreakable tokens escape sideways, not down. */
    const overflowX = (el: Element) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const left = r.left + parseFloat(cs.borderLeftWidth || '0') + parseFloat(cs.paddingLeft || '0');
      const right =
        r.right - parseFloat(cs.borderRightWidth || '0') - parseFloat(cs.paddingRight || '0');
      const range = document.createRange();
      range.selectNodeContents(el);
      const ink = range.getBoundingClientRect();
      range.detach();
      if (ink.height === 0 && ink.width === 0) return 0;
      return Math.max(0, Math.round(ink.right - right)) + Math.max(0, Math.round(left - ink.left));
    };

    const overflow = (el: Element) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const top = r.top + parseFloat(cs.borderTopWidth || '0') + parseFloat(cs.paddingTop || '0');
      const bottom =
        r.bottom -
        parseFloat(cs.borderBottomWidth || '0') -
        parseFloat(cs.paddingBottom || '0');

      const range = document.createRange();
      range.selectNodeContents(el);
      const ink = range.getBoundingClientRect();
      range.detach();

      if (ink.height === 0 && ink.width === 0) return 0; // nothing rendered yet
      return (
        Math.max(0, Math.round(ink.bottom - bottom)) + Math.max(0, Math.round(top - ink.top))
      );
    };

    const q = document.querySelector('[data-testid="quiz-question"]');
    const a = document.querySelector('[data-testid="quiz-answers"]');
    const s = document.querySelector('[data-testid="quiz-submit"]');

    const choices: any[] = [];
    document.querySelectorAll('[data-choice-key]').forEach(el => {
      // Measure the smallest element that actually holds the answer text, so a font-size set
      // inline by backend HTML is what gets reported rather than the container's value.
      const textHost = (el.querySelector('p, span') as HTMLElement) || (el as HTMLElement);
      choices.push({
        key: el.getAttribute('data-choice-key') || '?',
        overflowBy: overflow(el),
        overflowXBy: overflowX(el),
        // A box that cannot wrap its content scrolls itself; scrolling its container would not
        // reveal anything inside the box.
        scrollXActive: ['auto', 'scroll'].includes(getComputedStyle(el).overflowX),
        scrollableX: el.scrollWidth > el.clientWidth + 1,
        fontPx: parseFloat(getComputedStyle(textHost).fontSize) || 0,
        rect: box(el)
      });
    });

    const RESULT_TEXTS = ['got away', 'You caught the fish'];
    let bannerCount = 0;
    document.querySelectorAll('body *').forEach(el => {
      const own = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent || '')
        .join('');
      if (RESULT_TEXTS.some(t => own.includes(t))) bannerCount++;
    });

    // The shell's answers row. When the fit ladder reaches its terminal level this becomes
    // scrollable, which is the agreed outcome for content that cannot be shrunk — author markup
    // may not be restyled, so "more room or scroll" is all that is left.
    const slot = document.querySelector('#quiz-modal .qm-answers');
    const answersRegion = slot
      ? {
          overflowY: getComputedStyle(slot).overflowY,
          scrollable: slot.scrollHeight > slot.clientHeight + 1
        }
      : null;

    // Horizontal escape has no scaling remedy — overflow-wrap handles long tokens, but a table with
    // fixed column widths cannot wrap. Scrolling sideways is the terminal option, so the same
    // reachability rule applies: off-screen is fine, unreachable is not.
    const qSlot = document.querySelector('#quiz-modal .qm-question');
    const scrollXRegion = (el: Element | null) =>
      el
        ? {
            active: ['auto', 'scroll'].includes(getComputedStyle(el).overflowX),
            scrollable: el.scrollWidth > el.clientWidth + 1
          }
        : null;
    const answersScrollX = scrollXRegion(slot);
    const questionScrollX = scrollXRegion(qSlot);

    return {
      found: { question: !!q, answers: !!a, submit: !!s },
      question: q ? { overflowBy: overflow(q), overflowXBy: overflowX(q), rect: box(q) } : null,
      answers: a ? { rect: box(a) } : null,
      submit: s ? { rect: box(s) } : null,
      answersRegion,
      answersScrollX,
      questionScrollX,
      choices,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      bannerCount
    };
  });
}

const intersects = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

const insideViewport = (
  r: { x: number; y: number; w: number; h: number },
  v: { w: number; h: number }
) => r.x >= -1 && r.y >= -1 && r.x + r.w <= v.w + 1 && r.y + r.h <= v.h + 1;

/**
 * Answer-review modal. Built on the same shell and given the same data-testid hooks, so the same
 * measurements apply. Covered because the previous version was a Phaser/DOM hybrid at hardcoded
 * pixel sizes and clipped silently below a ~1038x532 host iframe — the exact defect the answering
 * UI had, in a screen nobody was testing.
 */
const REVIEW_FIXTURES = ['short', 'wrap', 'img', 'table', 'many6'] as const;

async function openReview(page: Page, fixture: string): Promise<void> {
  await page.goto(`/index.html?devReview=${fixture}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-testid="quiz-answers"]', { state: 'attached', timeout: 60_000 });
  await page.waitForSelector('[data-choice-key]', { state: 'attached', timeout: 60_000 });
  await page
    .waitForFunction(
      () => {
        const imgs = Array.from(document.querySelectorAll('#quiz-modal img'));
        return imgs.every(i => (i as HTMLImageElement).complete);
      },
      { timeout: 20_000 }
    )
    .catch(() => {
      /* a stuck image is itself a finding, reported by the overflow assertions */
    });
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => r(null))));
}

for (const size of SIZES) {
  test.describe(`review @ ${size.label}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const fixture of REVIEW_FIXTURES) {
      test(`review "${fixture}" fits without clipping`, async ({ page }) => {
        await openReview(page, fixture);
        const r = await collectLayout(page);

        expect(r.found.question, 'question block present').toBe(true);
        expect(r.found.answers, 'answers block present').toBe(true);
        expect(r.choices.length, 'choices rendered').toBeGreaterThan(0);

        for (const c of r.choices) {
          expect(
            c.overflowBy,
            `review answer ${c.key} content extends ${c.overflowBy}px past the space its box provides`
          ).toBeLessThanOrEqual(1);
          if (!c.scrollXActive) {
            expect(
              c.overflowXBy,
              `review answer ${c.key} extends ${c.overflowXBy}px past its box horizontally with no ` +
                'horizontal scroll available'
            ).toBeLessThanOrEqual(1);
          }
          expect(c.fontPx, `review answer ${c.key} font-size`).toBeGreaterThanOrEqual(FONT_FLOOR_PX);
        }

        expect(
          r.question!.overflowBy,
          `review question content extends ${r.question!.overflowBy}px past the space provided`
        ).toBeLessThanOrEqual(1);

        expect(
          intersects(r.question!.rect, r.answers!.rect),
          'review question overlaps the answers block'
        ).toBe(false);

        // The Close button carries the quiz-submit testid. It must be visible and clear of the
        // question — the old modal's clickable area was a Phaser rect that drifted from its label.
        expect(r.found.submit, 'close button present').toBe(true);
        expect(
          insideViewport(r.submit!.rect, r.viewport),
          `close button escapes the viewport: ${JSON.stringify(r.submit!.rect)}`
        ).toBe(true);
        expect(
          intersects(r.submit!.rect, r.question!.rect),
          'close button overlaps the question'
        ).toBe(false);

        // The result/points banner is always shown in review.
        await expect(page.locator('[data-testid="quiz-banner"]')).toHaveCount(1);
      });
    }

    test('review closes via the Close button', async ({ page }) => {
      await openReview(page, 'short');
      await page.locator('[data-testid="quiz-submit"]').click();
      await expect(page.locator('#quiz-modal')).toHaveCount(0);
    });
  });
}

test.describe('dev route containment', () => {
  test.use({ viewport: { width: 1036, height: 530 } });

  test('without ?devQuiz the game boots to the menu and no quiz opens', async ({ page }) => {
    await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
    // Give the boot chain (Boot -> Preload -> Menu) more than enough time.
    await page.waitForTimeout(8_000);
    await expect(
      page.locator('[data-testid="quiz-answers"]'),
      'quiz must not open without the dev param'
    ).toHaveCount(0);
    await expect(page.locator('canvas'), 'game canvas rendered').toHaveCount(1);
  });

  test('an unknown ?devQuiz value is ignored', async ({ page }) => {
    await page.goto('/index.html?devQuiz=nope', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(8_000);
    await expect(
      page.locator('[data-testid="quiz-answers"]'),
      'unknown fixture id must not open the quiz'
    ).toHaveCount(0);
  });
});

for (const size of SIZES) {
  test.describe(`@ ${size.label}`, () => {
    test.use({ viewport: { width: size.width, height: size.height } });

    for (const fixture of FIXTURES) {
      test(`fixture "${fixture}" fits without clipping`, async ({ page }) => {
        await openQuiz(page, fixture);
        const r = await collectLayout(page);

        expect(r.found.question, 'question container present').toBe(true);
        expect(r.found.answers, 'answers container present').toBe(true);
        expect(r.choices.length, 'at least one answer rendered').toBeGreaterThan(0);

        // 1. No answer box clips its own content.
        for (const c of r.choices) {
          expect(
            c.overflowBy,
            `answer ${c.key} content extends ${c.overflowBy}px past the space its box provides`
          ).toBeLessThanOrEqual(1);
        }

        // 2. The question block does not clip its own content.
        expect(
          r.question!.overflowBy,
          `question content extends ${r.question!.overflowBy}px past the space its box provides`
        ).toBeLessThanOrEqual(1);

        // 2b. Nothing escapes sideways unreachably. Long tokens wrap; a fixed-width table cannot,
        // so sideways scrolling is the terminal option. Same rule as vertical: off-screen is fine,
        // unreachable is not.
        for (const c of r.choices) {
          if (c.scrollXActive) {
            expect(
              c.scrollableX,
              `answer ${c.key} is in horizontal scroll mode but has nothing to scroll`
            ).toBe(true);
          } else {
            expect(
              c.overflowXBy,
              `answer ${c.key} content extends ${c.overflowXBy}px past its box horizontally with no ` +
                'horizontal scroll available'
            ).toBeLessThanOrEqual(1);
          }
        }

        if (r.questionScrollX?.active) {
          expect(
            r.questionScrollX.scrollable,
            'question is in horizontal scroll mode but has nothing to scroll'
          ).toBe(true);
        } else {
          expect(
            r.question!.overflowXBy,
            `question content extends ${r.question!.overflowXBy}px past its box horizontally with ` +
              'no horizontal scroll available'
          ).toBeLessThanOrEqual(1);
        }

        // 3. Answer text never renders below the readable floor.
        for (const c of r.choices) {
          expect(c.fontPx, `answer ${c.key} font-size`).toBeGreaterThanOrEqual(FONT_FLOOR_PX);
        }

        // 4. Question and answers occupy disjoint space.
        expect(
          intersects(r.question!.rect, r.answers!.rect),
          `question rect ${JSON.stringify(r.question!.rect)} overlaps answers rect ` +
            `${JSON.stringify(r.answers!.rect)}`
        ).toBe(false);

        // 5. Everything stays on screen.
        expect(
          insideViewport(r.question!.rect, r.viewport),
          `question escapes the viewport: ${JSON.stringify(r.question!.rect)} vs ${JSON.stringify(r.viewport)}`
        ).toBe(true);
        // Answers must be on screen UNLESS the fit ladder has legitimately fallen through to
        // scrolling. Content that pins its own size cannot be shrunk without restyling author
        // markup, which is forbidden here, so scrolling is the agreed terminal outcome. When that
        // happens the requirement becomes "reachable by scrolling", not "all visible at once".
        const scrolling =
          !!r.answersRegion &&
          (r.answersRegion.overflowY === 'auto' || r.answersRegion.overflowY === 'scroll');
        if (scrolling) {
          expect(
            r.answersRegion!.scrollable,
            'answers region is in scroll mode but has nothing to scroll — answers would be ' +
              'unreachable rather than merely off-screen'
          ).toBe(true);
        } else {
          for (const c of r.choices) {
            expect(
              insideViewport(c.rect, r.viewport),
              `answer ${c.key} escapes the viewport: ${JSON.stringify(c.rect)}`
            ).toBe(true);
          }
        }

        // 6. Submit is present, on screen, and not buried under the question block.
        expect(r.found.submit, 'submit button present').toBe(true);
        expect(
          insideViewport(r.submit!.rect, r.viewport),
          `submit escapes the viewport: ${JSON.stringify(r.submit!.rect)}`
        ).toBe(true);
        expect(
          intersects(r.submit!.rect, r.question!.rect),
          'submit button overlaps the question block'
        ).toBe(false);

        // 7. No result banner before answering, and never more than one.
        expect(r.bannerCount, 'result banner nodes present before answering').toBe(0);
      });
    }

    test('result banner renders once and clear of the question', async ({ page }) => {
      await openQuiz(page, 'short');

      await page.locator('[data-choice-key]').first().click();
      await page.locator('[data-testid="quiz-submit"]').click();
      await page.waitForSelector('[data-testid="quiz-banner"]', { state: 'attached', timeout: 10_000 });

      const r = await collectLayout(page);
      const banner = await page.locator('[data-testid="quiz-banner"]').boundingBox();

      // Exactly one node owns the result message. Two was the original defect: a Phaser text
      // at camera centre plus this DOM banner.
      expect(r.bannerCount, 'number of nodes holding the result message').toBe(1);
      expect(banner, 'banner has a box').not.toBeNull();
      expect(
        intersects(
          { x: banner!.x, y: banner!.y, w: banner!.width, h: banner!.height },
          r.question!.rect
        ),
        'result banner overlaps the question text'
      ).toBe(false);
    });
  });
}

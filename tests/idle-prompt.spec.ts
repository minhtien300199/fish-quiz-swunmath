import { test, expect, Page } from '@playwright/test';

/**
 * Regression suite for the idle prompt: after ~5s of no interaction, the
 * character shows a speech bubble telling the player what to do.
 *
 * The bubble is armed by GameScene.startIdleDetection(), which runs once from a
 * 3s delayedCall in create(). That call lands while a new player's tutorial is
 * still open, so it hits the "tutorial active" guard and returns. The tutorial's
 * completion callback has to re-arm it; without that, every remaining path that
 * arms the timer (resetIdleTimer) hangs off a movement or cast, so a player who
 * just sits there never gets prompted. These tests cover both the new-player and
 * returning-player routes into that timer.
 */

const BUBBLE = 'text=Press SPACEBAR to throw your bait';
const TUTORIAL_STEP = 'text=STEP 1 OF';

/**
 * The startup greeting uses the SAME message as the idle prompt, so presence
 * alone proves nothing. The greeting is created with a 4s auto-hide while the
 * idle prompt is indefinite, so we demand a window where the bubble is present
 * on every sample for this long. Only the idle prompt can satisfy that.
 */
const PERSIST_MS = 6000;
const SAMPLE_MS = 300;

/** Boots to the menu with a known tutorial state, then starts a new game. */
async function startGame(page: Page, tutorialAlreadyDone: boolean): Promise<void> {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(done => {
    localStorage.clear();
    if (done) localStorage.setItem('fishQuizTutorialCompleted', 'true');
  }, tutorialAlreadyDone);
  await page.reload({ waitUntil: 'domcontentloaded' });

  // BootScene -> PreloadScene has to finish before the menu accepts input.
  await page.waitForTimeout(6000);

  // "New Game" is drawn on the canvas, so click it by position.
  await page.locator('canvas').click({ position: { x: 800, y: 333 } });
}

/**
 * Assert an indefinitely-shown bubble appears. Deliberately does NOT interact
 * with the page: any keypress or click arms the timer via resetIdleTimer() and
 * would mask the bug this suite exists to catch.
 *
 * Scans for a PERSIST_MS window of unbroken presence. A greeting that shows and
 * then auto-hides breaks the run and the scan simply keeps looking, so this does
 * not race the startup greeting.
 */
async function expectPersistentBubble(page: Page, budgetMs = 30_000): Promise<void> {
  const bubble = page.locator(BUBBLE);
  const deadline = Date.now() + budgetMs;
  let presentSince: number | null = null;

  while (Date.now() < deadline) {
    const present = (await bubble.count()) > 0;
    const now = Date.now();

    if (!present) {
      presentSince = null;
    } else {
      if (presentSince === null) presentSince = now;
      if (now - presentSince >= PERSIST_MS) return;
    }
    await page.waitForTimeout(SAMPLE_MS);
  }

  const longest = presentSince === null ? 0 : Date.now() - presentSince;
  throw new Error(
    `Idle prompt never stayed up for ${PERSIST_MS}ms within ${budgetMs}ms ` +
    `(longest unbroken run at timeout: ${longest}ms). The bubble is either ` +
    `never shown, or only the auto-hiding startup greeting appeared.`
  );
}

test('shows the idle prompt after a new player finishes the tutorial', async ({ page }) => {
  await startGame(page, false);

  // Walk the tutorial the way a new player does, ending on its final button.
  await expect(page.locator(TUTORIAL_STEP)).toHaveCount(1, { timeout: 20_000 });
  for (let i = 0; i < 15; i++) {
    // The final step's button is "Let's Go!", not "Next" (TutorialStepper.ts).
    const done = page.getByRole('button', { name: /Let.s Go|Finish|Got it|Start/i });
    if ((await done.count()) > 0) {
      await done.first().click();
      break;
    }
    const next = page.getByRole('button', { name: 'Next' });
    if ((await next.count()) === 0) break;
    await next.first().click();
    await page.waitForTimeout(300);
  }
  // Guard the walkthrough itself: if the tutorial is still open, the idle timer
  // is blocked by design and this test would be asserting the wrong thing.
  await expect(
    page.locator('text=/STEP \\d+ OF/'),
    'tutorial should be fully closed before checking for the idle prompt'
  ).toHaveCount(0);

  await expectPersistentBubble(page);
});

test('shows the idle prompt when a new player skips the tutorial', async ({ page }) => {
  await startGame(page, false);

  const skip = page.getByRole('button', { name: 'Skip' });
  await expect(skip).toHaveCount(1, { timeout: 20_000 });

  // Read for a moment before skipping. This matters: create() schedules its one
  // and only startIdleDetection() call 3s in. Skipping faster than that leaves
  // the tutorial already closed when it fires, so the timer arms by luck and the
  // bug hides. Any real player who reads even briefly lands on the broken path.
  await page.waitForTimeout(5000);
  await skip.first().click();

  await expectPersistentBubble(page);
});

test('shows the idle prompt for a returning player with no tutorial', async ({ page }) => {
  await startGame(page, true);

  await expectPersistentBubble(page);
});

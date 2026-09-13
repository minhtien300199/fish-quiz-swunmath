import { defineConfig } from '@playwright/test';

/**
 * Layout regression config for the quiz screen.
 *
 * The viewport is set per-test to the INNER size of the host iframe (the sizes measured in
 * iframe_clue.md, minus the 1px border on each side). A Playwright viewport and an iframe
 * viewport are both browsing-context viewports, so CSS viewport units, ResizeObserver and
 * layout all resolve identically. Driving the game directly at those viewport sizes is
 * therefore equivalent to nesting it in the real host frame, with one less moving part.
 *
 * src/iframe-host.html stays as the human-facing simulator; it reproduces the host page's
 * own CSS defects, which is a different job from asserting the game's internal layout.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:8080',
    headless: true,
    // The game draws a custom DOM cursor and hides the native one; no pointer needed.
    hasTouch: false
  },
  webServer: {
    command: 'npx webpack serve --config webpack.config.js --port 8080',
    url: 'http://localhost:8080/index.html',
    reuseExistingServer: true,
    timeout: 240_000
  }
});

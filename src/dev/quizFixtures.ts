/**
 * DEV ONLY — quiz layout fixtures.
 *
 * Reproducing the quiz layout bug otherwise requires playing until a fish is caught,
 * which makes the layout untestable. This module injects a chosen question set and
 * jumps straight into QuizScene.
 *
 * Injection point is `window.QUIZ_QUESTIONS`, the same global that preloadScene.ts:78
 * populates from the API, so the fixture path exercises the real code path in
 * quizScene.ts:173 rather than a parallel one.
 *
 * Everything here is inert unless served from localhost. See isDevHost().
 */

import { questionBank } from '../datas/quesionBank';

/** Shape consumed by quizScene.ts:94-97. `difficulty` and `questionType` are optional in practice. */
export interface FixtureQuestion {
  question: string;
  choices: { key: string; text: string }[];
  correctAnswer: string;
  difficulty?: number;
  questionType?: string;
}

/** A 300x200 SVG data URI. No network, deterministic intrinsic size, stresses vertical fit. */
const BLOCK_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='200'%3E" +
  "%3Crect width='300' height='200' fill='%23c8d8e8' stroke='%236b8ba4' stroke-width='4'/%3E%3C/svg%3E";

/** A 120x40 SVG data URI, roughly the size of the inline equation images in the real bank. */
const INLINE_IMG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='40'%3E" +
  "%3Crect width='120' height='40' fill='%23efe6d0'/%3E%3C/svg%3E";

const LONG =
  'Round each number to the nearest hundred, then subtract the smaller result from the ' +
  'larger one and explain which estimate is closer to the exact difference';

/**
 * Fixtures are keyed by the `?devQuiz=` value.
 *
 * IMPORTANT: `src/datas/quesionBank.ts` is only the offline **fallback** used when no `UserId`
 * is present (apiService.js:51-61). It is NOT representative of what the backend serves, so
 * nothing about it may be treated as evidence about production content, and no design decision
 * may be derived from it. The `fallback*` entries below exist purely as extra shapes to render,
 * not as a specification.
 *
 * A fixture built from a captured real API response is still missing. Until one exists, this
 * suite proves the layout survives the shapes listed here — no more than that.
 */
export const QUIZ_FIXTURES: Record<string, FixtureQuestion[]> = {
  /** Fallback bank entry: 3 choices, inline base64 equation image in the question. */
  fallback3: [questionBank[0] as FixtureQuestion],

  /** Fallback bank entry: 4 choices, inline font-size spans. */
  fallback4: [questionBank[1] as FixtureQuestion],

  /** The case that already passes today: four short answers, minimal markup. */
  short: [
    {
      question: '<p>What is 7 + 8?</p>',
      choices: [
        { key: 'A', text: '<p>12</p>' },
        { key: 'B', text: '<p>15</p>' },
        { key: 'C', text: '<p>14</p>' },
        { key: 'D', text: '<p>16</p>' }
      ],
      correctAnswer: 'B'
    }
  ],

  /** Every answer wraps to three or more lines at every tested size. */
  wrap: [
    {
      question: `<p>${LONG}</p>`,
      choices: [
        { key: 'A', text: `<p>${LONG} — option one</p>` },
        { key: 'B', text: `<p>${LONG} — option two</p>` },
        { key: 'C', text: `<p>${LONG} — option three</p>` },
        { key: 'D', text: `<p>${LONG} — option four</p>` }
      ],
      correctAnswer: 'A'
    }
  ],

  /** Answers contain a block image. Exercises async decode and intrinsic height. */
  img: [
    {
      question: '<p>Which diagram shows one half shaded?</p>',
      choices: [
        { key: 'A', text: `<p><img src="${BLOCK_IMG}" alt=""></p>` },
        { key: 'B', text: `<p><img src="${BLOCK_IMG}" alt=""></p>` },
        { key: 'C', text: `<p><img src="${BLOCK_IMG}" alt=""></p>` },
        { key: 'D', text: `<p><img src="${BLOCK_IMG}" alt=""></p>` }
      ],
      correctAnswer: 'C'
    }
  ],

  /** Image in the question AND long answers — both regions compete for height. */
  imgq: [
    {
      question:
        `<p>Study the figure below, then choose the expression that matches it.</p>` +
        `<p><img src="${BLOCK_IMG}" alt=""></p>`,
      choices: [
        { key: 'A', text: `<p>${LONG} — first</p>` },
        { key: 'B', text: `<p>${LONG} — second</p>` },
        { key: 'C', text: `<p>${LONG} — third</p>` },
        { key: 'D', text: `<p>${LONG} — fourth</p>` }
      ],
      correctAnswer: 'B'
    }
  ],

  /** Uneven rows: short, wrapping, inline image, medium. Worst case for a fixed-row grid. */
  mixed: [
    {
      question:
        `<p style="text-align: center;"><span style="font-size: 11pt;">` +
        `Which comparison is true?</span></p>`,
      choices: [
        { key: 'A', text: '<p>7</p>' },
        { key: 'B', text: `<p>${LONG}</p>` },
        { key: 'C', text: `<p><img src="${INLINE_IMG}" alt=""> equals nine</p>` },
        { key: 'D', text: '<p style="text-align: left;">Twenty-four thousand seven hundred</p>' }
      ],
      correctAnswer: 'A'
    }
  ]
};

export const FIXTURE_IDS = Object.keys(QUIZ_FIXTURES);

/**
 * Dev surface gate. Mirrors the check in src/index.html so the two cannot disagree.
 * A leaked `?devQuiz=` param on a production hostname does nothing.
 */
export function isDevHost(): boolean {
  const h = window.location.hostname;
  return (
    h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '' || /\.local$/.test(h)
  );
}

/** Returns the requested fixture id, or null when the dev route is not active. */
export function getRequestedFixtureId(): string | null {
  if (!isDevHost()) return null;
  const raw = new URLSearchParams(window.location.search).get('devQuiz');
  if (!raw) return null;
  if (!Object.prototype.hasOwnProperty.call(QUIZ_FIXTURES, raw)) {
    console.warn(`[devQuiz] unknown fixture "${raw}". Available: ${FIXTURE_IDS.join(', ')}`);
    return null;
  }
  return raw;
}

/**
 * Installs the fixture into the global that quizScene.ts:173 reads.
 *
 * Also resets `fishQuizQuestionIndex`, because quizScene.ts:81-89 restores that index from
 * localStorage and would otherwise open a different question than the fixture, or clamp to 0
 * only after the array bound is exceeded.
 */
export function applyQuizFixture(fixtureId: string): void {
  const fixture = QUIZ_FIXTURES[fixtureId];
  if (!fixture) return;
  (window as any).QUIZ_QUESTIONS = fixture;
  (window as any).TOTAL_QUESTIONS = fixture.length;
  localStorage.setItem('fishQuizQuestionIndex', '0');
  console.log(`[devQuiz] fixture "${fixtureId}" installed (${fixture.length} question(s))`);
}

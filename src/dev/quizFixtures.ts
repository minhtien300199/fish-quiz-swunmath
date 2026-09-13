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

  /** An HTML table. Tables resist shrinking, so this is the main horizontal-overflow probe. */
  table: [
    {
      question:
        '<p>Which row shows the correct totals?</p>' +
        // 12 columns with an explicit min width per cell, so it cannot shrink into any tested box.
        // The earlier 6-column version fit inside the panel and therefore tested nothing.
        '<table border="1" cellpadding="8" style="border-collapse: collapse;">' +
        '<tr>' +
        ['Item', 'Unit price', 'Quantity', 'Subtotal', 'Discount', 'Tax rate', 'Tax', 'Shipping',
          'Handling', 'Rounding', 'Adjustment', 'Grand total']
          .map(h => `<th style="min-width:110px;">${h}</th>`)
          .join('') +
        '</tr>' +
        '<tr>' +
        ['Notebook', '2.50', '12', '30.00', '1.50', '8%', '2.40', '4.99', '0.75', '0.01', '0.00',
          '37.15'].map(d => `<td style="min-width:110px;">${d}</td>`).join('') +
        '</tr>' +
        '</table>',
      choices: [
        { key: 'A', text: '<p>Row 1 only</p>' },
        { key: 'B', text: '<p>Row 2 only</p>' },
        { key: 'C', text: '<p>Both rows</p>' },
        { key: 'D', text: '<p>Neither row</p>' }
      ],
      correctAnswer: 'C'
    }
  ],

  /** Unbreakable tokens. A long number or word cannot wrap, so it escapes horizontally. */
  longword: [
    {
      // Deliberately far wider than any box at any tested size. A 40-character number fits a
      // half-width answer box, so the first version of this fixture passed without proving
      // anything — an overflow probe that cannot fail is not a probe.
      question:
        '<p>Round ' +
        '9'.repeat(160) +
        ' to the nearest million, then compare with ' +
        'Supercalifragilisticexpialidocious'.repeat(4) +
        '.</p>',
      choices: [
        { key: 'A', text: '<p>' + '1234567890'.repeat(16) + '</p>' },
        { key: 'B', text: '<p>' + 'Antidisestablishmentarianism'.repeat(5) + '</p>' },
        { key: 'C', text: '<p>' + '8'.repeat(140) + '</p>' },
        { key: 'D', text: '<p>Cannot be determined</p>' }
      ],
      correctAnswer: 'A'
    }
  ],

  /** MathML. quizScene styles <math> explicitly, so this exercises that path. */
  math: [
    {
      question:
        '<p>Simplify:</p><p><math xmlns="http://www.w3.org/1998/Math/MathML">' +
        '<mfrac><mrow><mn>12</mn><mo>+</mo><mn>8</mn></mrow><mn>4</mn></mfrac></math></p>',
      choices: [
        { key: 'A', text: '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>5</mn></math></p>' },
        { key: 'B', text: '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>4</mn></math></p>' },
        { key: 'C', text: '<p><math xmlns="http://www.w3.org/1998/Math/MathML"><mn>3</mn></math></p>' }
      ],
      correctAnswer: 'A'
    }
  ],

  /** Six choices. The grid must not assume four. */
  many6: [
    {
      question: '<p>Which of these are prime?</p>',
      choices: [
        { key: 'A', text: '<p>2</p>' },
        { key: 'B', text: '<p>9</p>' },
        { key: 'C', text: '<p>11</p>' },
        { key: 'D', text: '<p>15</p>' },
        { key: 'E', text: '<p>17</p>' },
        { key: 'F', text: '<p>21</p>' }
      ],
      correctAnswer: 'A'
    }
  ],

  /** Two choices only — the grid leaves a hole in a 2x2 assumption. */
  two: [
    {
      question: '<p>Is 17 a prime number?</p>',
      choices: [
        { key: 'A', text: '<p>Yes</p>' },
        { key: 'B', text: '<p>No</p>' }
      ],
      correctAnswer: 'A'
    }
  ],

  /** Nested markup, entities, sub/superscript, a list — rich text rather than a bare paragraph. */
  rich: [
    {
      question:
        '<p><strong>Read carefully.</strong> Which statement about 5<sup>2</sup> &minus; 3<sub>10</sub> ' +
        'is <em>true</em>?</p><ul><li>It is greater than 20</li><li>It is a multiple of&nbsp;11</li></ul>',
      choices: [
        { key: 'A', text: '<p>5<sup>2</sup> &gt; 20 &amp; not a multiple of 11</p>' },
        { key: 'B', text: '<p><em>Both</em> statements are true</p>' },
        { key: 'C', text: '<p>Neither &mdash; see the <strong>note</strong></p>' },
        { key: 'D', text: '<p>5<sup>2</sup> &minus; 3 = 22, a multiple of&nbsp;11</p>' }
      ],
      correctAnswer: 'D'
    }
  ],

  /** An image that will never load. The refit must still run, via the error listener. */
  brokenimg: [
    {
      question: '<p>Study the figure.</p><p><img src="assets/does-not-exist-12345.png" alt=""></p>',
      choices: [
        { key: 'A', text: '<p><img src="assets/also-missing-98765.png" alt=""> First</p>' },
        { key: 'B', text: '<p>Second</p>' },
        { key: 'C', text: '<p>Third</p>' },
        { key: 'D', text: '<p>Fourth</p>' }
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
 * Builds an answer-review payload from a fixture, for `?devReview=<id>`.
 *
 * Deliberately picks a WRONG answer the player did not get right, so the review renders both the
 * "correct answer" and "your answer" states at once. Picking the correct one would leave half the
 * layout untested.
 */
export function buildReviewFixture(fixtureId: string): any | null {
  const fixture = QUIZ_FIXTURES[fixtureId];
  if (!fixture || !fixture.length) return null;
  const q = fixture[0];
  const correct = (q.correctAnswer || '').split(',').map(k => k.trim());
  const wrong = q.choices.find(c => !correct.includes(c.key));
  return {
    fishType: 'shark_whale', // the only non-square fish (48x16), so the header art is stressed too
    question: q.question,
    choices: q.choices,
    correctAnswer: q.correctAnswer,
    userAnswer: wrong ? wrong.key : q.choices[0]?.key,
    isCorrect: false,
    timeBonus: 7,
    pointsAwarded: 120
  };
}

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

/** Returns the requested review-modal fixture id, or null when that dev route is not active. */
export function getRequestedReviewFixtureId(): string | null {
  return readFixtureParam('devReview');
}

/** True when any dev route is asking to skip the menu and go straight into GameScene. */
export function isAnyDevRouteRequested(): boolean {
  return getRequestedFixtureId() !== null || getRequestedReviewFixtureId() !== null;
}

function readFixtureParam(param: string): string | null {
  if (!isDevHost()) return null;
  const raw = new URLSearchParams(window.location.search).get(param);
  if (!raw) return null;
  if (!Object.prototype.hasOwnProperty.call(QUIZ_FIXTURES, raw)) {
    console.warn(`[${param}] unknown fixture "${raw}". Available: ${FIXTURE_IDS.join(', ')}`);
    return null;
  }
  return raw;
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

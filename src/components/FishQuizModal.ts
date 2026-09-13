import { FishType, fishSizes, fishVariants, getFishPath } from '../const/fishType';
import { createQuizModalShell, QuizModalShell } from './quizModalShell';

// Interface for storing fish with their quiz data
export interface FishQuizData {
    fishType: FishType;
    question: string;
    choices: { key: string; text: string }[];
    correctAnswer: string;
    userAnswer?: string;
    isCorrect: boolean;
    timeBonus: number;
    /** Points credited for this catch, set after they are computed. Display only. */
    pointsAwarded?: number;
}

/**
 * Answer-review modal, opened by clicking a caught fish in the storage box.
 *
 * Rebuilt on the shared quiz modal shell. The previous version was a hybrid: a Phaser overlay,
 * background rectangle and close button rendered on the UI camera, plus a DOM text layer pinned to
 * `canvas.getBoundingClientRect()` at hardcoded pixel sizes — an 800x700 box with 36/28/24/20/18px
 * type inside a `max-height: 90%` cap and `overflow: hidden`. Its fixed vertical budget came to
 * roughly 505px against the 477px available at a 1038x532 host iframe, so it clipped silently
 * before a question was even long. The two halves also drifted apart, because the clickable close
 * area was a Phaser rectangle at container-local (0, 270) while its label was a DOM div positioned
 * `bottom: 80px` by hand.
 *
 * Now there is one DOM flex column that scales from a single --ui-scale, and the close button is a
 * real button rather than two things trying to line up.
 */
export class FishQuizModal {
    private scene: Phaser.Scene;
    private shell: QuizModalShell | null = null;
    private keyHandler: ((e: KeyboardEvent) => void) | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Show the quiz review modal
     * @param quizData The quiz data to display
     */
    public show(quizData: FishQuizData): void {
        this.close();

        // Match FishFactory's variant selection so the fish shown here looks like the one in the box.
        const variants = fishVariants[quizData.fishType];
        const variant =
            variants && variants.length > 0
                ? variants[Math.floor(Math.random() * variants.length)]
                : undefined;
        const dim = fishSizes[quizData.fishType] || { width: 16, height: 16 };

        const shell = createQuizModalShell({
            fishSrc: getFishPath(quizData.fishType, variant),
            fishW: dim.width,
            fishH: dim.height,
            fishName: this.formatFishName(quizData.fishType)
        });
        this.shell = shell;

        // Header chip carries points instead of a countdown.
        const bonusPoints = quizData.timeBonus > 0 ? quizData.timeBonus * 10 : 0;
        const total = quizData.pointsAwarded;
        shell.setChip(total !== undefined ? `Points: +${total}` : 'Review');

        this.buildQuestion(shell, quizData);
        this.buildChoices(shell, quizData);
        this.buildFooter(shell, quizData, bonusPoints);

        // Dismissal: the close button, the backdrop, or Escape. The old modal had exactly one way
        // out, and it was the half that could drift away from its own label.
        const backdrop = shell.root.querySelector('.qm-backdrop') as HTMLElement | null;
        if (backdrop) {
            backdrop.addEventListener('click', () => this.close());
        }
        this.keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') this.close();
        };
        window.addEventListener('keydown', this.keyHandler);

        shell.fit();
        this.refitOnImages(shell);
    }

    private buildQuestion(shell: QuizModalShell, quizData: FishQuizData): void {
        const wrap = document.createElement('div');
        wrap.setAttribute('data-testid', 'quiz-question');
        wrap.style.width = '100%';
        wrap.style.boxSizing = 'border-box';

        const header = document.createElement('div');
        header.textContent = 'Question';
        header.style.fontWeight = 'bold';
        header.style.fontSize = 'max(11px, calc(15px * var(--ui-scale)))';
        header.style.letterSpacing = '0.08em';
        header.style.textTransform = 'uppercase';
        header.style.color = 'var(--ink-soft)';
        header.style.marginBottom = 'calc(6px * var(--ui-scale))';
        wrap.appendChild(header);

        const body = document.createElement('div');
        // Raw backend HTML, unmodified. The old parseQuestionContent() stripped it to plain text but
        // was never actually called — the modal already rendered raw HTML.
        body.innerHTML = quizData.question;
        this.clampImages(body);
        wrap.appendChild(body);

        shell.questionSlot.appendChild(wrap);
    }

    private buildChoices(shell: QuizModalShell, quizData: FishQuizData): void {
        const container = document.createElement('div');
        container.setAttribute('data-testid', 'quiz-answers');
        container.style.width = '100%';
        container.style.boxSizing = 'border-box';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = 'calc(6px * var(--ui-scale))';

        const grid = document.createElement('div');
        grid.style.display = 'grid';
        grid.style.gridTemplateColumns = 'var(--answers-cols, 1fr 1fr)';
        grid.style.gap = 'calc(6px * var(--ui-scale))';
        grid.style.width = '100%';
        grid.style.minHeight = '0';

        const correctKeys = (quizData.correctAnswer || '').split(',').map(k => k.trim());
        const userKeys = (quizData.userAnswer || '').split(',').map(k => k.trim()).filter(Boolean);

        quizData.choices.forEach(choice => {
            const isCorrect = correctKeys.includes(choice.key);
            const wasChosen = userKeys.includes(choice.key);

            const box = document.createElement('div');
            box.className = 'qm-choice';
            box.setAttribute('data-choice-key', choice.key);
            box.style.padding = 'calc(10px * var(--ui-scale)) calc(12px * var(--ui-scale))';
            box.style.fontSize = 'max(11px, calc(16px * var(--ui-scale)))';
            box.style.lineHeight = '1.35';
            box.style.color = 'var(--ink)';
            box.style.boxSizing = 'border-box';
            // Review is read-only; hover styling would imply the box does something.
            box.classList.add('is-locked');
            if (isCorrect) box.classList.add('is-correct');
            else if (wasChosen) box.classList.add('is-wrong');

            const chip = document.createElement('div');
            chip.className = 'qm-chip';
            chip.textContent = choice.key;
            box.appendChild(chip);

            const body = document.createElement('div');
            body.className = 'qm-choice-body';
            body.innerHTML = choice.text;
            this.clampImages(body);

            // A tag rather than a glyph prefixed onto the answer's own markup. The old code built
            // `${key}. ${indicator}${text}` into one innerHTML, which put a tick inside the
            // backend's markup and made the two indistinguishable.
            if (isCorrect || wasChosen) {
                const tag = document.createElement('div');
                tag.style.marginTop = 'calc(4px * var(--ui-scale))';
                tag.style.fontSize = 'max(10px, calc(12px * var(--ui-scale)))';
                tag.style.fontWeight = 'bold';
                tag.style.color = isCorrect ? 'var(--ok)' : 'var(--bad)';
                tag.textContent = isCorrect
                    ? wasChosen
                        ? 'Correct answer — you chose this'
                        : 'Correct answer'
                    : 'Your answer';
                body.appendChild(tag);
            }

            box.appendChild(body);
            grid.appendChild(box);
        });

        container.appendChild(grid);
        shell.answersSlot.appendChild(container);
    }

    private buildFooter(shell: QuizModalShell, quizData: FishQuizData, bonusPoints: number): void {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'qm-submit-btn';
        closeBtn.setAttribute('data-testid', 'quiz-submit');
        closeBtn.textContent = 'Close';
        closeBtn.style.padding = 'calc(9px * var(--ui-scale)) calc(28px * var(--ui-scale))';
        closeBtn.style.fontSize = 'max(12px, calc(18px * var(--ui-scale)))';
        closeBtn.addEventListener('click', () => this.close());
        shell.submitSlot.appendChild(closeBtn);

        const parts: string[] = [quizData.isCorrect ? 'Correct!' : 'Incorrect'];
        if (quizData.pointsAwarded !== undefined) {
            parts.push(`+${quizData.pointsAwarded} points`);
        }
        if (bonusPoints > 0) {
            parts.push(`time bonus +${bonusPoints} (${quizData.timeBonus}s left)`);
        }

        const banner = document.createElement('div');
        banner.setAttribute('data-testid', 'quiz-banner');
        banner.className = quizData.isCorrect ? 'qm-banner is-ok' : 'qm-banner is-bad';
        banner.textContent = parts.join(' · ');
        banner.style.padding = 'calc(10px * var(--ui-scale)) calc(24px * var(--ui-scale))';
        banner.style.borderRadius = '999px';
        banner.style.fontWeight = 'bold';
        banner.style.fontSize = 'max(12px, calc(20px * var(--ui-scale)))';
        banner.style.textAlign = 'center';
        banner.style.maxWidth = '100%';
        shell.bannerSlot.appendChild(banner);
    }

    /**
     * Keep injected images inside their box. This is the only style applied to backend markup, and
     * it prevents horizontal escape rather than changing authored intent — the same call made for
     * the answering UI.
     */
    private clampImages(root: HTMLElement): void {
        root.querySelectorAll('img').forEach(img => {
            const el = img as HTMLImageElement;
            el.style.maxWidth = '100%';
            el.style.maxHeight = 'calc(220px * var(--ui-scale))';
            el.style.height = 'auto';
        });
    }

    /** Images decode asynchronously, so a fit computed before they land is measuring the wrong box. */
    private refitOnImages(shell: QuizModalShell): void {
        const imgs = Array.from(shell.root.querySelectorAll('img')) as HTMLImageElement[];
        for (const img of imgs) {
            if (img.complete) continue; // cache hit: no event will fire
            const refit = () => shell.fit();
            img.addEventListener('load', refit, { once: true });
            img.addEventListener('error', refit, { once: true }); // a broken image changes layout too
        }
        requestAnimationFrame(() => shell.fit());
    }

    /**
     * Close the modal and cleanup
     */
    public close(): void {
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
        }
        if (this.shell) {
            this.shell.dispose();
            this.shell = null;
        }
    }

    /**
     * Format fish name for display
     * @param fishType The fish type
     * @returns Formatted fish name
     */
    private formatFishName(fishType: FishType): string {
        return fishType
            .replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Check if the modal is currently open
     * @returns True if modal is open
     */
    public isOpen(): boolean {
        return this.shell !== null;
    }
}

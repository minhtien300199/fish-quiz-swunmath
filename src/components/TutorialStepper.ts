export interface TutorialStep {
    title: string;
    description: string;
    targetElement?: string; // CSS selector or element identifier
    position: 'top' | 'bottom' | 'left' | 'right' | 'center';
    highlightArea?: { x: number; y: number; width: number; height: number };
    action?: 'click' | 'move' | 'space' | 'wait';
    duration?: number; // Auto-advance after duration (ms)
}

export class TutorialStepper {
    private scene: Phaser.Scene;
    private currentStep: number = 0;
    private steps: TutorialStep[] = [];
    private isActive: boolean = false;
    private onCompleteCallback: (() => void) | null = null;
    private htmlOverlay: HTMLDivElement | null = null;
    private htmlStepCard: HTMLDivElement | null = null;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.initializeSteps();
    }

    private initializeSteps(): void {
        this.steps = [
            {
                title: "Welcome to Fish Quiz!",
                description: "Let's learn how to play! This tutorial will guide you through the basics.",
                position: 'center',
                action: 'click',
            },
            {
                title: "Movement",
                description: "Use WASD keys or arrow keys to move your boat around the water. You can also click and drag to move.",
                position: 'center',
                action: 'click',
            },
            {
                title: "Find Fish Shadows",
                description: "Look for dark fish shadows swimming in the water. These are the fish you can catch!",
                position: 'center',
                action: 'click',
            },
            {
                title: "Start Fishing",
                description: "Press SPACE or right-click to cast your fishing line when you're near water.",
                position: 'center',
                action: 'click',
            },
            {
                title: "Wait for Fish",
                description: "After casting, wait for a fish to bite your bait. You'll see the floater move when a fish is interested!",
                position: 'center',
                action: 'click',
            },
            {
                title: "Catch the Fish",
                description: "When a fish bites (floater shakes), quickly press SPACE or right-click to catch it!",
                position: 'center',
                action: 'click',
            },
            {
                title: "Answer Quiz Questions",
                description: "After catching a fish, you'll answer a math question to keep it. Answer correctly to earn points!",
                position: 'center',
                action: 'click',
            },
            {
                title: "Game Progress",
                description: "Check your progress in the top-left corner. Catch the required number of fish to win!",
                position: 'center',
                highlightArea: { x: 10, y: 10, width: 200, height: 100 },
                action: 'click',
            },
            {
                title: "Ready to Play!",
                description: "You're all set! Remember: Move around, cast your line, catch fish, and answer questions. Good luck!",
                position: 'center',
                action: 'click',
            }
        ];
    }

    /**
     * Start the tutorial
     */
    public start(onComplete?: () => void): void {
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        this.currentStep = 0;
        this.onCompleteCallback = onComplete || null;

        // Inject CSS keyframes once
        if (!document.getElementById('tutorialStepperStyles')) {
            const style = document.createElement('style');
            style.id = 'tutorialStepperStyles';
            style.textContent = `
                @keyframes tutorialFadeIn {
                    from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                }
                @keyframes tutorialDotPulse {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        this.createOverlay();
        this.showCurrentStep();
    }

    /**
     * Stop the tutorial
     */
    public stop(): void {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        this.cleanup();

        if (this.onCompleteCallback) {
            this.onCompleteCallback();
        }
    }

    /**
     * Go to next step
     */
    public nextStep(): void {
        if (!this.isActive) {
            return;
        }

        this.currentStep++;

        if (this.currentStep >= this.steps.length) {
            this.stop();
            return;
        }

        this.showCurrentStep();
    }

    /**
     * Go to previous step
     */
    public previousStep(): void {
        if (!this.isActive || this.currentStep <= 0) {
            return;
        }

        this.currentStep--;
        this.showCurrentStep();
    }

    /**
     * Check if tutorial is active
     */
    public getIsActive(): boolean {
        return this.isActive;
    }

    /**
     * Get current step number
     */
    public getCurrentStep(): number {
        return this.currentStep;
    }

    /**
     * Create the overlay background
     */
    private createOverlay(): void {
        this.htmlOverlay = document.createElement('div');
        this.htmlOverlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            z-index: 9500;
        `;
        document.body.appendChild(this.htmlOverlay);
    }

    /**
     * Show the current step
     */
    private showCurrentStep(): void {
        if (!this.htmlOverlay) return;

        // Remove previous step card
        if (this.htmlStepCard && this.htmlStepCard.parentNode) {
            this.htmlStepCard.parentNode.removeChild(this.htmlStepCard);
            this.htmlStepCard = null;
        }

        const step = this.steps[this.currentStep];
        const isLastStep = this.currentStep >= this.steps.length - 1;
        const isFirstStep = this.currentStep === 0;

        // Build step dots
        let dotsHtml = '';
        for (let i = 0; i < this.steps.length; i++) {
            const isCurrentDot = i === this.currentStep;
            dotsHtml += `<div style="
                width: ${isCurrentDot ? '24px' : '10px'};
                height: 10px;
                border-radius: 5px;
                background: ${isCurrentDot ? '#3498db' : 'rgba(255,255,255,0.3)'};
                transition: all 0.3s ease;
            "></div>`;
        }

        // Create step card
        this.htmlStepCard = document.createElement('div');
        this.htmlStepCard.style.cssText = `
            position: fixed;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%);
            z-index: 9501;
            animation: tutorialFadeIn 0.3s ease forwards;
        `;

        this.htmlStepCard.innerHTML = `
            <div style="
                background: linear-gradient(145deg, #1a2a3a, #2c3e50);
                border: 2px solid #3498db;
                border-radius: 20px;
                padding: 40px 48px 32px;
                max-width: 540px;
                min-width: 420px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 30px rgba(52,152,219,0.15);
                text-align: center;
                font-family: 'Segoe UI', Arial, sans-serif;
            ">
                <!-- Step counter -->
                <div style="
                    font-size: 14px;
                    color: #7f8c8d;
                    margin-bottom: 8px;
                    letter-spacing: 2px;
                    text-transform: uppercase;
                ">Step ${this.currentStep + 1} of ${this.steps.length}</div>

                <!-- Title -->
                <h2 style="
                    font-size: 28px;
                    font-weight: 700;
                    color: #3498db;
                    margin: 0 0 16px 0;
                    line-height: 1.3;
                ">${step.title}</h2>

                <!-- Description -->
                <p style="
                    font-size: 18px;
                    color: #ecf0f1;
                    line-height: 1.6;
                    margin: 0 0 28px 0;
                    font-weight: 400;
                ">${step.description}</p>

                <!-- Step dots -->
                <div style="
                    display: flex;
                    justify-content: center;
                    gap: 6px;
                    margin-bottom: 28px;
                ">${dotsHtml}</div>

                <!-- Navigation buttons -->
                <div style="
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 12px;
                ">
                    ${!isFirstStep ? `
                    <button id="tutorialPrevBtn" style="
                        background: #7f8c8d;
                        color: #fff;
                        border: none;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                        font-family: 'Segoe UI', Arial, sans-serif;
                    ">Previous</button>` : ''}

                    <button id="tutorialSkipBtn" style="
                        background: transparent;
                        color: #95a5a6;
                        border: 2px solid #95a5a6;
                        border-radius: 10px;
                        padding: 12px 24px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-family: 'Segoe UI', Arial, sans-serif;
                    ">Skip</button>

                    <button id="tutorialNextBtn" style="
                        background: ${isLastStep ? '#27ae60' : '#3498db'};
                        color: #fff;
                        border: none;
                        border-radius: 10px;
                        padding: 12px 32px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: background 0.2s;
                        font-family: 'Segoe UI', Arial, sans-serif;
                    ">${isLastStep ? "Let's Go!" : 'Next'}</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.htmlStepCard);

        // Attach event listeners
        const prevBtn = document.getElementById('tutorialPrevBtn');
        const skipBtn = document.getElementById('tutorialSkipBtn');
        const nextBtn = document.getElementById('tutorialNextBtn');

        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousStep());
            prevBtn.addEventListener('mouseenter', () => { prevBtn.style.background = '#6c7a7d'; });
            prevBtn.addEventListener('mouseleave', () => { prevBtn.style.background = '#7f8c8d'; });
        }

        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.stop());
            skipBtn.addEventListener('mouseenter', () => { skipBtn.style.color = '#fff'; skipBtn.style.borderColor = '#fff'; });
            skipBtn.addEventListener('mouseleave', () => { skipBtn.style.color = '#95a5a6'; skipBtn.style.borderColor = '#95a5a6'; });
        }

        if (nextBtn) {
            const hoverColor = isLastStep ? '#229954' : '#2980b9';
            const normalColor = isLastStep ? '#27ae60' : '#3498db';
            nextBtn.addEventListener('click', () => {
                if (isLastStep) {
                    this.stop();
                } else {
                    this.nextStep();
                }
            });
            nextBtn.addEventListener('mouseenter', () => { nextBtn.style.background = hoverColor; });
            nextBtn.addEventListener('mouseleave', () => { nextBtn.style.background = normalColor; });
        }
    }

    /**
     * Clean up tutorial elements
     */
    private cleanup(): void {
        if (this.htmlStepCard && this.htmlStepCard.parentNode) {
            this.htmlStepCard.parentNode.removeChild(this.htmlStepCard);
            this.htmlStepCard = null;
        }

        if (this.htmlOverlay && this.htmlOverlay.parentNode) {
            this.htmlOverlay.parentNode.removeChild(this.htmlOverlay);
            this.htmlOverlay = null;
        }
    }

    /**
     * Handle player actions during tutorial (no longer auto-advances)
     */
    public handleAction(action: 'move' | 'space' | 'click'): void {
        // Actions are tracked but no longer auto-advance the tutorial
        // User must click Next button to proceed
        return;
    }
}
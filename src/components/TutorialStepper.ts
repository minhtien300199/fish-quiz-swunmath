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
    private container: Phaser.GameObjects.Container | null = null;
    private overlay: Phaser.GameObjects.Graphics | null = null;
    private currentStep: number = 0;
    private steps: TutorialStep[] = [];
    private isActive: boolean = false;
    private onCompleteCallback: (() => void) | null = null;
    private stepContainer: Phaser.GameObjects.Container | null = null;
    private highlightGraphics: Phaser.GameObjects.Graphics | null = null;

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
        const camera = this.scene.cameras.main;
        const uiCamera = this.scene.cameras.getCamera('ui') || camera;

        // Create semi-transparent overlay
        this.overlay = this.scene.add.graphics();
        this.overlay.fillStyle(0x000000, 0.7);
        this.overlay.fillRect(0, 0, uiCamera.width, uiCamera.height);
        this.overlay.setDepth(70000); // Higher than other UI elements

        // Create main container
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(70001);

        // Make overlay interactive to prevent clicks behind it
        this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, uiCamera.width, uiCamera.height), Phaser.Geom.Rectangle.Contains);

        // IMPORTANT: Make tutorial elements visible ONLY to UI camera (ignore main camera)
        // This prevents the zoomed duplicate from appearing - following WINDSURF_RULES.md
        this.scene.cameras.main.ignore([this.overlay, this.container]);
    }

    /**
     * Show the current step
     */
    private showCurrentStep(): void {
        if (!this.container || !this.overlay) {
            return;
        }

        // Clear previous step
        if (this.stepContainer) {
            this.stepContainer.destroy();
        }
        if (this.highlightGraphics) {
            this.highlightGraphics.destroy();
            this.highlightGraphics = null;
        }

        const step = this.steps[this.currentStep];
        const camera = this.scene.cameras.main;
        const uiCamera = this.scene.cameras.getCamera('ui') || camera;

        // Create highlight area if specified
        if (step.highlightArea) {
            this.createHighlight(step.highlightArea);
        }

        // Create step container
        this.stepContainer = this.scene.add.container(0, 0);
        this.stepContainer.setDepth(70002);

        // Calculate position - always center horizontally for consistency
        const x = uiCamera.width / 2;
        let y = uiCamera.height / 2; // Default center position

        // Adjust Y position based on step position preference
        switch (step.position) {
            case 'top':
                y = Math.min(200, uiCamera.height * 0.25); // Top quarter of screen
                break;
            case 'bottom':
                y = Math.max(uiCamera.height - 200, uiCamera.height * 0.75); // Bottom quarter of screen
                break;
            case 'center':
            default:
                y = uiCamera.height / 2; // Center of screen
                break;
        }

        // Create step background
        const stepWidth = Math.min(500, uiCamera.width - 40);
        const stepHeight = 200;

        const stepBg = this.scene.add.rectangle(x, y, stepWidth, stepHeight, 0x2c3e50, 0.95);
        stepBg.setStrokeStyle(3, 0x3498db);

        // Create step title
        const titleText = this.scene.add.text(x, y - 60, step.title, {
            fontSize: '24px',
            color: '#3498db',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        // Create step description
        const descText = this.scene.add.text(x, y - 10, step.description, {
            fontSize: '16px',
            color: '#ecf0f1',
            align: 'center',
            wordWrap: { width: stepWidth - 40 },
            lineSpacing: 5
        }).setOrigin(0.5);

        // Create step counter
        const counterText = this.scene.add.text(x, y + 50, `${this.currentStep + 1} / ${this.steps.length}`, {
            fontSize: '14px',
            color: '#95a5a6',
            align: 'center'
        }).setOrigin(0.5);

        // Create navigation buttons
        const buttonY = y + 75;

        // Previous button (only show if not first step)
        let prevButton: Phaser.GameObjects.Rectangle | null = null;
        let prevText: Phaser.GameObjects.Text | null = null;
        if (this.currentStep > 0) {
            prevButton = this.scene.add.rectangle(x - 120, buttonY, 70, 30, 0x95a5a6);
            prevButton.setStrokeStyle(2, 0x7f8c8d);
            prevButton.setInteractive({ useHandCursor: true });

            prevText = this.scene.add.text(x - 120, buttonY, 'Previous', {
                fontSize: '12px',
                color: '#ffffff'
            }).setOrigin(0.5);

            prevButton.on('pointerdown', () => this.previousStep());
            prevButton.on('pointerover', () => prevButton!.setFillStyle(0x7f8c8d));
            prevButton.on('pointerout', () => prevButton!.setFillStyle(0x95a5a6));
        }

        // Skip button (always visible)
        const skipButton = this.scene.add.rectangle(x, buttonY, 60, 30, 0xe74c3c);
        skipButton.setStrokeStyle(2, 0xc0392b);
        skipButton.setInteractive({ useHandCursor: true });

        const skipText = this.scene.add.text(x, buttonY, 'Skip', {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);

        skipButton.on('pointerdown', () => this.stop());
        skipButton.on('pointerover', () => skipButton.setFillStyle(0xc0392b));
        skipButton.on('pointerout', () => skipButton.setFillStyle(0xe74c3c));

        // Next/Finish button
        const isLastStep = this.currentStep >= this.steps.length - 1;
        const nextButtonText = isLastStep ? 'Finish' : 'Next';
        const nextButton = this.scene.add.rectangle(x + 120, buttonY, 70, 30, 0x27ae60);
        nextButton.setStrokeStyle(2, 0x2ecc71);
        nextButton.setInteractive({ useHandCursor: true });

        const nextText = this.scene.add.text(x + 120, buttonY, nextButtonText, {
            fontSize: '12px',
            color: '#ffffff'
        }).setOrigin(0.5);

        nextButton.on('pointerdown', () => {
            if (isLastStep) {
                this.stop();
            } else {
                this.nextStep();
            }
        });
        nextButton.on('pointerover', () => nextButton.setFillStyle(0x2ecc71));
        nextButton.on('pointerout', () => nextButton.setFillStyle(0x27ae60));

        // Add all elements to step container
        const elements = [stepBg, titleText, descText, counterText, skipButton, skipText, nextButton, nextText];
        if (prevButton && prevText) {
            elements.push(prevButton, prevText);
        }

        this.stepContainer.add(elements);
        this.container.add(this.stepContainer);

        // No auto-advance - user must click Next/Skip button to proceed

        // IMPORTANT: Make step elements visible ONLY to UI camera (ignore main camera)
        // This prevents the zoomed duplicate from appearing - following WINDSURF_RULES.md
        this.scene.cameras.main.ignore(elements);
    }

    /**
     * Create highlight area
     */
    private createHighlight(area: { x: number; y: number; width: number; height: number }): void {
        if (!this.overlay) {
            return;
        }

        const camera = this.scene.cameras.main;
        const uiCamera = this.scene.cameras.getCamera('ui') || camera;

        // Clear the highlight area from the overlay
        this.highlightGraphics = this.scene.add.graphics();
        this.highlightGraphics.setDepth(70000);

        // Create a mask to cut out the highlighted area
        this.highlightGraphics.fillStyle(0x000000, 0.7);
        this.highlightGraphics.fillRect(0, 0, uiCamera.width, uiCamera.height);

        // Cut out the highlight area
        this.highlightGraphics.fillStyle(0x000000, 0);
        this.highlightGraphics.fillRect(area.x, area.y, area.width, area.height);

        // Add a glowing border around the highlight area
        this.highlightGraphics.lineStyle(3, 0x3498db, 1);
        this.highlightGraphics.strokeRect(area.x - 2, area.y - 2, area.width + 4, area.height + 4);

        // IMPORTANT: Make highlight graphics visible ONLY to UI camera (ignore main camera)
        // This prevents the zoomed duplicate from appearing - following WINDSURF_RULES.md
        this.scene.cameras.main.ignore([this.highlightGraphics]);
    }

    /**
     * Clean up tutorial elements
     */
    private cleanup(): void {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }

        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }

        if (this.highlightGraphics) {
            this.highlightGraphics.destroy();
            this.highlightGraphics = null;
        }

        this.stepContainer = null;
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
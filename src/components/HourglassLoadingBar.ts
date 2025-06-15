export class HourglassLoadingBar {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container | null = null;
    private hourglassSprite: Phaser.GameObjects.Sprite | null = null;
    private progressBar: Phaser.GameObjects.Graphics | null = null;
    private progressBarBg: Phaser.GameObjects.Graphics | null = null;
    private loadingText: Phaser.GameObjects.Text | null = null;
    private currentProgress: number = 0;
    private isVisible: boolean = false;
    private animationTimer: Phaser.Time.TimerEvent | null = null;
    private currentFrame: number = 1;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Load hourglass assets (call this in preload scene)
     */
    public static preloadAssets(scene: Phaser.Scene): void {
        // Load all hourglass frames
        for (let i = 1; i <= 9; i++) {
            const frameNum = i.toString().padStart(4, '0');
            scene.load.image(`hourglass_${frameNum}`, `assets/ui/control_ui/hourglass_${frameNum}.png`);
        }
    }

    /**
     * Show the loading bar
     * @param text Optional loading text to display
     */
    public show(text: string = 'Loading...'): void {
        if (this.isVisible) {
            return;
        }

        this.isVisible = true;
        this.currentProgress = 0;

        // Get camera properties for proper positioning
        const camera = this.scene.cameras.main;
        const uiCamera = this.scene.cameras.getCamera('ui') || camera;

        // Create container at center of screen
        this.container = this.scene.add.container(
            uiCamera.width / 2,
            uiCamera.height / 2 // Center position
        );
        this.container.setDepth(60000); // High depth to be above other UI elements

        // Create progress bar background
        this.progressBarBg = this.scene.add.graphics();
        this.progressBarBg.fillStyle(0x333333, 0.8);
        this.progressBarBg.fillRoundedRect(-150, -8, 300, 16, 8);
        this.progressBarBg.lineStyle(2, 0x666666, 1);
        this.progressBarBg.strokeRoundedRect(-150, -8, 300, 16, 8);

        // Create progress bar fill
        this.progressBar = this.scene.add.graphics();
        this.updateProgressBar();

        // Create hourglass sprite (start with first frame)
        this.hourglassSprite = this.scene.add.sprite(-170, 0, 'hourglass_0001');
        this.hourglassSprite.setScale(2); // Scale up the 16x16 sprite

        // Create loading text
        this.loadingText = this.scene.add.text(0, 25, text, {
            fontSize: '16px',
            color: '#ffffff',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Add all elements to container
        this.container.add([
            this.progressBarBg,
            this.progressBar,
            this.hourglassSprite,
            this.loadingText
        ]);

        // Start hourglass animation
        this.startHourglassAnimation();

        // Make visible only to UI camera if it exists
        if (this.scene.cameras.getCamera('ui')) {
            this.scene.cameras.main.ignore([
                this.container,
                this.progressBarBg,
                this.progressBar,
                this.hourglassSprite,
                this.loadingText
            ]);
        }

        // Fade in animation
        this.container.setAlpha(0);
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }

    /**
     * Update loading progress
     * @param progress Progress value between 0 and 1
     * @param text Optional text to update
     */
    public updateProgress(progress: number, text?: string): void {
        if (!this.isVisible || !this.container) {
            return;
        }

        this.currentProgress = Phaser.Math.Clamp(progress, 0, 1);
        this.updateProgressBar();

        if (text && this.loadingText) {
            this.loadingText.setText(text);
        }

        // If progress is complete, automatically hide after a short delay
        if (this.currentProgress >= 1) {
            this.scene.time.delayedCall(500, () => {
                this.hide();
            });
        }
    }

    /**
     * Hide the loading bar
     */
    public hide(): void {
        if (!this.isVisible || !this.container) {
            return;
        }

        this.isVisible = false;

        // Stop hourglass animation
        this.stopHourglassAnimation();

        // Fade out animation
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.destroy();
            }
        });
    }

    /**
     * Set loading text
     * @param text The text to display
     */
    public setText(text: string): void {
        if (this.loadingText) {
            this.loadingText.setText(text);
        }
    }

    /**
     * Check if loading bar is visible
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }

    /**
     * Get current progress (0-1)
     */
    public getProgress(): number {
        return this.currentProgress;
    }

    /**
     * Start the hourglass animation cycle
     */
    private startHourglassAnimation(): void {
        if (this.animationTimer) {
            this.animationTimer.destroy();
        }

        this.currentFrame = 1;
        this.animationTimer = this.scene.time.addEvent({
            delay: 100, // 100ms per frame for smooth animation
            callback: this.updateHourglassFrame,
            callbackScope: this,
            loop: true
        });
    }

    /**
     * Stop the hourglass animation
     */
    private stopHourglassAnimation(): void {
        if (this.animationTimer) {
            this.animationTimer.destroy();
            this.animationTimer = null;
        }
    }

    /**
     * Update hourglass sprite frame
     */
    private updateHourglassFrame(): void {
        if (!this.hourglassSprite) {
            return;
        }

        this.currentFrame++;
        if (this.currentFrame > 9) {
            this.currentFrame = 1;
        }

        const frameNum = this.currentFrame.toString().padStart(4, '0');
        this.hourglassSprite.setTexture(`hourglass_${frameNum}`);
    }

    /**
     * Update the progress bar visual
     */
    private updateProgressBar(): void {
        if (!this.progressBar) {
            return;
        }

        this.progressBar.clear();

        if (this.currentProgress > 0) {
            // Create gradient effect
            const progressWidth = 296 * this.currentProgress; // 296 = 300 - 4 (border)

            // Progress bar fill with gradient colors
            const color = this.getProgressColor(this.currentProgress);
            this.progressBar.fillStyle(color, 0.9);
            this.progressBar.fillRoundedRect(-148, -6, progressWidth, 12, 6);

            // Add shine effect
            this.progressBar.fillStyle(0xffffff, 0.3);
            this.progressBar.fillRoundedRect(-148, -6, progressWidth, 4, 3);
        }
    }

    /**
     * Get progress bar color based on completion
     */
    private getProgressColor(progress: number): number {
        if (progress < 0.33) {
            return 0xff6b6b; // Red for low progress
        } else if (progress < 0.66) {
            return 0xffd93d; // Yellow for medium progress
        } else {
            return 0x6bcf7f; // Green for high progress
        }
    }

    /**
     * Clean up resources
     */
    private destroy(): void {
        this.stopHourglassAnimation();

        if (this.container) {
            this.container.destroy();
            this.container = null;
        }

        this.progressBar = null;
        this.progressBarBg = null;
        this.hourglassSprite = null;
        this.loadingText = null;
        this.currentProgress = 0;
        this.isVisible = false;
    }

    /**
     * Clean up when scene is destroyed
     */
    public cleanup(): void {
        this.destroy();
    }
} 
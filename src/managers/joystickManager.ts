export class JoystickManager {
    private scene: Phaser.Scene;
    private fishingButton: Phaser.GameObjects.Container | null = null;
    private isMobile: boolean = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.isMobile = this.detectMobile();

        if (this.isMobile) {
            this.createFishingButton();
        }
    }

    private detectMobile(): boolean {
        // Check if device is mobile/tablet
        const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const touchDevice = navigator.maxTouchPoints ? navigator.maxTouchPoints > 2 : false;
        return mobileRegex || touchDevice;
    }

    private createFishingButton(): void {
        if (!this.isMobile) return;

        // Create fishing button container in bottom-right corner
        const x = this.scene.cameras.main.width - 80;
        const y = this.scene.cameras.main.height - 80;

        this.fishingButton = this.scene.add.container(x, y);
        this.fishingButton.setDepth(10000);
        this.fishingButton.setScrollFactor(0); // Stay fixed on screen
        this.fishingButton.setAlpha(0.8);

        // Create button background
        const buttonBg = this.scene.add.graphics();
        buttonBg.fillStyle(0x3498db, 0.8); // Blue background
        buttonBg.lineStyle(3, 0xffffff, 1); // White border
        buttonBg.fillCircle(0, 0, 35);
        buttonBg.strokeCircle(0, 0, 35);

        // Create fishing rod icon (simple representation)
        const rodGraphics = this.scene.add.graphics();
        rodGraphics.lineStyle(4, 0xffffff, 1);
        // Draw a simple fishing rod line
        rodGraphics.lineBetween(-15, -15, 15, 15);
        // Draw hook
        rodGraphics.lineStyle(2, 0xffffff, 1);
        rodGraphics.lineBetween(12, 12, 18, 8);

        // Add "FISH" text
        const fishText = this.scene.add.text(0, 20, 'FISH', {
            fontSize: '10px',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Add to container
        this.fishingButton.add([buttonBg, rodGraphics, fishText]);

        // Make sure button is visible to UI camera only
        const uiCamera = this.scene.cameras.getCamera('UICamera');
        if (uiCamera) {
            // Hide from main camera
            this.scene.cameras.main.ignore(this.fishingButton);
        }

        this.setupButtonInteraction();
    }

    private setupButtonInteraction(): void {
        if (!this.isMobile || !this.fishingButton) return;

        // Make button interactive - match the visual size with position adjustment
        const buttonRadius = 50; // Slightly larger than visual (35) for easier touch
        this.fishingButton.setSize(buttonRadius * 2, buttonRadius * 2);
        this.fishingButton.setInteractive(
            new Phaser.Geom.Circle(15, 32, buttonRadius), // Offset touch area to match visual
            Phaser.Geom.Circle.Contains
        );

        // Touch to fish - works for both casting and reeling
        this.fishingButton.on('pointerdown', () => {
            this.triggerFishing();

            // Visual feedback
            if (this.fishingButton) {
                this.fishingButton.setAlpha(1);
                this.fishingButton.setScale(0.9);
            }
        });

        this.fishingButton.on('pointerup', () => {
            if (this.fishingButton) {
                this.fishingButton.setAlpha(0.8);
                this.fishingButton.setScale(1);
            }
        });

        // Hover effects
        this.fishingButton.on('pointerover', () => {
            if (this.fishingButton) {
                this.fishingButton.setAlpha(1);
            }
        });

        this.fishingButton.on('pointerout', () => {
            if (this.fishingButton) {
                this.fishingButton.setAlpha(0.8);
            }
        });
    }

    private triggerFishing(): void {
        // Enhanced fishing trigger that works for both casting and reeling
        if (this.scene.scene.key === 'GameScene') {
            // Get the GameScene instance and trigger fishing
            const gameScene = this.scene as any;

            // Check current fishing state and handle accordingly
            const currentState = gameScene.getCurrentFishingState ? gameScene.getCurrentFishingState() : 'idle';

            if (currentState === 'idle') {
                // Cast the line - set right-click flag for fishing actions
                if (gameScene.rightClickJustPressed !== undefined) {
                    gameScene.rightClickJustPressed = true;
                }
            } else if (currentState === 'catching') {
                // Fish is biting - directly call handleCatchAttempt
                if (gameScene.handleCatchAttempt && typeof gameScene.handleCatchAttempt === 'function') {
                    gameScene.handleCatchAttempt();
                }
            }
        }
    }

    public getDirection(): { x: number, y: number } {
        // No longer used for movement - return zero vector
        return { x: 0, y: 0 };
    }

    public isJoystickActive(): boolean {
        // No longer used for movement - return false
        return false;
    }

    public isMobileDevice(): boolean {
        return this.isMobile;
    }

    public destroy(): void {
        if (this.fishingButton) {
            this.fishingButton.destroy();
            this.fishingButton = null;
        }
    }

    public setVisible(visible: boolean): void {
        if (this.fishingButton) {
            this.fishingButton.setVisible(visible);
        }
    }

    public update(): void {
        // Update button position if needed (for responsive design)
        if (this.fishingButton && this.isMobile) {
            const x = this.scene.cameras.main.width - 80;
            const y = this.scene.cameras.main.height - 80;
            this.fishingButton.setPosition(x, y);
        }
    }
} 
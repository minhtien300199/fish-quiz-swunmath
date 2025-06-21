export class ConversationBox {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container | null = null;
    private isVisible: boolean = false;
    private characterX: number = 0;
    private characterY: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Show the conversation box with the specified message
     * @param x X position (usually character position)
     * @param y Y position (usually character position)
     * @param message The message to display
     * @param duration How long to show the message (0 = indefinite)
     */
    public show(x: number, y: number, message: string, duration: number = 0): void {
        // Don't show if already visible
        if (this.isVisible) {
            return;
        }

        this.characterX = x;
        this.characterY = y;
        this.isVisible = true;

        // Create container for the conversation box
        this.container = this.scene.add.container();
        this.container.setDepth(10000); // Very high depth to be above everything

        // Calculate position above character
        const boxX = x;
        const boxY = y - 80; // Position above character

        // Create speech bubble background
        const bubbleWidth = 200;
        const bubbleHeight = 60;
        const cornerRadius = 10;

        // Create bubble background using graphics
        const bubble = this.scene.add.graphics();
        bubble.fillStyle(0xffffff, 0.95); // White background
        bubble.lineStyle(2, 0x000000, 1); // Black border

        // Draw rounded rectangle for bubble
        bubble.fillRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, cornerRadius);
        bubble.strokeRoundedRect(-bubbleWidth / 2, -bubbleHeight / 2, bubbleWidth, bubbleHeight, cornerRadius);

        // Draw speech bubble tail pointing down to character
        const tailSize = 10;
        bubble.fillTriangle(
            -tailSize / 2, bubbleHeight / 2,  // Left point
            tailSize / 2, bubbleHeight / 2,   // Right point
            0, bubbleHeight / 2 + tailSize  // Bottom point (pointing down)
        );
        bubble.strokeTriangle(
            -tailSize / 2, bubbleHeight / 2,
            tailSize / 2, bubbleHeight / 2,
            0, bubbleHeight / 2 + tailSize
        );

        // Create message text
        const messageText = this.scene.add.text(0, -5, message, {
            fontSize: '11px',
            color: '#000000',
            fontStyle: 'bold',
            align: 'center',
            wordWrap: { width: bubbleWidth - 20 },
            lineSpacing: 2,
            stroke: '#ffffff',
            strokeThickness: 0.2
        }).setOrigin(0.5);

        // Fix blurry text by rounding position and disabling smoothing
        messageText.setPosition(Math.round(messageText.x), Math.round(messageText.y));

        // Disable texture smoothing to prevent blur
        messageText.texture.setFilter(Phaser.Textures.FilterMode.NEAREST);

        // Add elements to container
        this.container.add([bubble, messageText]);

        // Position the container at rounded coordinates to prevent blur
        this.container.setPosition(Math.round(boxX), Math.round(boxY));

        // Make sure conversation box is only visible to main camera
        const cameras = this.scene.cameras.cameras;
        for (let i = 1; i < cameras.length; i++) {
            const camera = cameras[i];
            if (camera && camera !== this.scene.cameras.main) {
                camera.ignore(this.container);
            }
        }

        // Animate appearance
        this.container.setScale(0);
        this.scene.tweens.add({
            targets: this.container,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Add gentle floating animation
        this.scene.tweens.add({
            targets: this.container,
            y: boxY - 5,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Auto-hide after duration if specified
        if (duration > 0) {
            this.scene.time.delayedCall(duration, () => {
                this.hide();
            });
        }
    }

    /**
     * Hide the conversation box
     */
    public hide(): void {
        if (!this.isVisible || !this.container) {
            return;
        }

        this.isVisible = false;

        // Animate disappearance
        this.scene.tweens.add({
            targets: this.container,
            scale: 0,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                if (this.container) {
                    this.container.destroy();
                    this.container = null;
                }
            }
        });
    }

    /**
     * Update the position of the conversation box to follow character
     * @param x New X position
     * @param y New Y position
     */
    public updatePosition(x: number, y: number): void {
        if (this.isVisible && this.container) {
            this.characterX = x;
            this.characterY = y;
            // Round positions to prevent blur
            this.container.setPosition(Math.round(x), Math.round(y - 80));
        }
    }

    /**
     * Check if the conversation box is currently visible
     */
    public getIsVisible(): boolean {
        return this.isVisible;
    }

    /**
     * Destroy the conversation box and clean up
     */
    public destroy(): void {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.isVisible = false;
    }
} 
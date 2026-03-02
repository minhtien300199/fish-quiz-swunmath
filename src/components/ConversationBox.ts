export class ConversationBox {
    private scene: Phaser.Scene;
    private htmlElement: HTMLDivElement | null = null;
    private isVisible: boolean = false;
    private characterX: number = 0;
    private characterY: number = 0;
    private hideTimer: Phaser.Time.TimerEvent | null = null;
    private floatAnimationId: number | null = null;
    private floatOffset: number = 0;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Convert world coordinates to screen coordinates
     */
    private worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
        const camera = this.scene.cameras.main;
        const canvas = this.scene.game.canvas;
        const canvasRect = canvas.getBoundingClientRect();

        const screenX = (worldX - camera.worldView.x) * (canvasRect.width / camera.worldView.width) + canvasRect.left;
        const screenY = (worldY - camera.worldView.y) * (canvasRect.height / camera.worldView.height) + canvasRect.top;

        return { x: screenX, y: screenY };
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

        // Create HTML speech bubble
        this.htmlElement = document.createElement('div');
        this.htmlElement.style.position = 'fixed';
        this.htmlElement.style.zIndex = '8000';
        this.htmlElement.style.pointerEvents = 'none';
        this.htmlElement.style.transform = 'translate(-50%, -100%)';
        this.htmlElement.style.transition = 'opacity 0.3s ease';
        this.htmlElement.style.opacity = '0';

        // Speech bubble container
        this.htmlElement.innerHTML = `
            <div style="
                background: rgba(255, 255, 255, 0.95);
                border: 2px solid #000;
                border-radius: 10px;
                padding: 14px 20px;
                max-width: 320px;
                text-align: center;
                font-family: Arial, sans-serif;
                font-size: 18px;
                font-weight: bold;
                color: #000;
                line-height: 1.4;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                position: relative;
            ">
                ${message}
                <div style="
                    position: absolute;
                    bottom: -10px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 8px solid transparent;
                    border-right: 8px solid transparent;
                    border-top: 10px solid #000;
                "></div>
                <div style="
                    position: absolute;
                    bottom: -7px;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 0;
                    height: 0;
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-top: 9px solid rgba(255,255,255,0.95);
                "></div>
            </div>
        `;

        document.body.appendChild(this.htmlElement);

        // Position it
        this.updateScreenPosition();

        // Animate in
        requestAnimationFrame(() => {
            if (this.htmlElement) {
                this.htmlElement.style.opacity = '1';
            }
        });

        // Start floating animation
        this.startFloatAnimation();

        // Auto-hide after duration if specified
        if (duration > 0) {
            this.hideTimer = this.scene.time.delayedCall(duration, () => {
                this.hide();
            });
        }
    }

    /**
     * Start gentle floating animation using requestAnimationFrame
     */
    private startFloatAnimation(): void {
        let startTime = performance.now();
        const animate = (currentTime: number) => {
            if (!this.isVisible || !this.htmlElement) return;
            const elapsed = currentTime - startTime;
            this.floatOffset = Math.sin(elapsed / 1000) * 3; // 3px float range
            this.updateScreenPosition();
            this.floatAnimationId = requestAnimationFrame(animate);
        };
        this.floatAnimationId = requestAnimationFrame(animate);
    }

    /**
     * Update the screen position based on world coordinates
     */
    private updateScreenPosition(): void {
        if (!this.htmlElement) return;
        const screenPos = this.worldToScreen(this.characterX, this.characterY - 60 + this.floatOffset);
        this.htmlElement.style.left = screenPos.x + 'px';
        this.htmlElement.style.top = screenPos.y + 'px';
    }

    /**
     * Hide the conversation box
     */
    public hide(): void {
        if (!this.isVisible) {
            return;
        }

        this.isVisible = false;

        // Cancel hide timer
        if (this.hideTimer) {
            this.hideTimer.remove();
            this.hideTimer = null;
        }

        // Animate out then remove
        if (this.htmlElement) {
            this.htmlElement.style.opacity = '0';
            this.htmlElement.style.transform = 'translate(-50%, -100%) scale(0.8)';
            setTimeout(() => {
                this.removeHtmlElement();
            }, 300);
        }

        // Stop float animation
        if (this.floatAnimationId !== null) {
            cancelAnimationFrame(this.floatAnimationId);
            this.floatAnimationId = null;
        }
    }

    /**
     * Remove HTML element from DOM
     */
    private removeHtmlElement(): void {
        if (this.htmlElement && this.htmlElement.parentNode) {
            this.htmlElement.parentNode.removeChild(this.htmlElement);
            this.htmlElement = null;
        }
    }

    /**
     * Update the position of the conversation box to follow character
     * @param x New X position
     * @param y New Y position
     */
    public updatePosition(x: number, y: number): void {
        if (this.isVisible && this.htmlElement) {
            this.characterX = x;
            this.characterY = y;
            this.updateScreenPosition();
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
        // Cancel hide timer
        if (this.hideTimer) {
            this.hideTimer.remove();
            this.hideTimer = null;
        }

        // Stop float animation
        if (this.floatAnimationId !== null) {
            cancelAnimationFrame(this.floatAnimationId);
            this.floatAnimationId = null;
        }

        this.removeHtmlElement();
        this.isVisible = false;
    }
}
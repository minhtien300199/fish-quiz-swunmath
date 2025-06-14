export class DOMCursorManager {
    private static cursorElement: HTMLElement | null = null;
    private static isInitialized: boolean = false;
    private static gameContainer: HTMLElement | null = null;

    /**
     * Initialize the DOM cursor manager
     * @param gameContainer The game container element
     */
    public static init(gameContainer?: HTMLElement): void {
        this.gameContainer = gameContainer || document.getElementById('game-container') || document.body;
        this.createDOMCursor();
    }

    /**
     * Create a DOM-based cursor
     */
    private static createDOMCursor(): void {
        if (this.isInitialized) return;

        // Hide default cursor
        document.body.style.cursor = 'none';
        if (this.gameContainer) {
            this.gameContainer.style.cursor = 'none';
        }

        // Create cursor element
        this.cursorElement = document.createElement('div');
        this.cursorElement.id = 'custom-cursor';
        this.cursorElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 32px;
            height: 32px;
            background-image: url('assets/ui/control_ui/pointer_0001.png');
            background-size: contain;
            background-repeat: no-repeat;
            pointer-events: none;
            z-index: 99999;
            transform: translate(-2px, -2px);
            image-rendering: pixelated;
        `;

        document.body.appendChild(this.cursorElement);

        // Track mouse movement
        document.addEventListener('mousemove', this.updateCursorPosition);
        document.addEventListener('mousedown', this.setClickState);
        document.addEventListener('mouseup', this.setNormalState);

        this.isInitialized = true;
        console.log('DOM cursor created and initialized');
    }

    /**
     * Update cursor position based on mouse movement
     */
    private static updateCursorPosition = (event: MouseEvent): void => {
        if (this.cursorElement) {
            this.cursorElement.style.left = event.clientX + 'px';
            this.cursorElement.style.top = event.clientY + 'px';
        }
    };

    /**
     * Set cursor to click state
     */
    private static setClickState = (): void => {
        if (this.cursorElement) {
            this.cursorElement.style.backgroundImage = "url('assets/ui/control_ui/pointer_0002.png')";
        }
    };

    /**
     * Set cursor to normal state
     */
    private static setNormalState = (): void => {
        if (this.cursorElement) {
            this.cursorElement.style.backgroundImage = "url('assets/ui/control_ui/pointer_0001.png')";
        }
    };

    /**
     * Destroy the DOM cursor
     */
    public static destroy(): void {
        if (this.cursorElement) {
            document.body.removeChild(this.cursorElement);
            this.cursorElement = null;
        }

        document.removeEventListener('mousemove', this.updateCursorPosition);
        document.removeEventListener('mousedown', this.setClickState);
        document.removeEventListener('mouseup', this.setNormalState);

        // Restore default cursor
        document.body.style.cursor = 'auto';
        if (this.gameContainer) {
            this.gameContainer.style.cursor = 'auto';
        }

        this.isInitialized = false;
        console.log('DOM cursor destroyed');
    }

    /**
     * Check if cursor is active
     */
    public static isActive(): boolean {
        return this.isInitialized && this.cursorElement !== null;
    }

    /**
     * Set cursor scale
     */
    public static setScale(scale: number): void {
        if (this.cursorElement) {
            const size = Math.floor(32 * scale);
            this.cursorElement.style.width = size + 'px';
            this.cursorElement.style.height = size + 'px';
        }
    }
} 
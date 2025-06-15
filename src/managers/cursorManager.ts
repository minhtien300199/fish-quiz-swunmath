export class CursorManager {
    private static scene: Phaser.Scene | null = null;
    private static cursorSprite: Phaser.GameObjects.Image | null = null;
    private static isInitialized: boolean = false;
    private static isClicking: boolean = false;

    /**
     * Initialize the cursor manager
     * @param scene The scene to add the cursor to
     */
    public static init(scene: Phaser.Scene): void {
        this.scene = scene;
        this.loadAssets(scene);
    }

    /**
     * Load cursor assets
     * @param scene The scene to load assets into
     */
    private static loadAssets(scene: Phaser.Scene): void {
        // Load cursor sprites
        // console.log('Loading cursor assets...');
        scene.load.image('pointer-normal', 'assets/ui/control_ui/pointer_0001.png');
        scene.load.image('pointer-click', 'assets/ui/control_ui/pointer_0002.png');

        // Add load complete event to verify assets loaded
        scene.load.once('complete', () => {
            // console.log('Cursor assets loaded successfully');
            // console.log('pointer-normal exists:', scene.textures.exists('pointer-normal'));
            // console.log('pointer-click exists:', scene.textures.exists('pointer-click'));
        });
    }

    /**
     * Create the custom cursor sprite
     * @param scene The scene to create the cursor in
     */
    public static createCursor(scene: Phaser.Scene): void {
        if (this.isInitialized) return;

        this.scene = scene;

        // Check if assets are loaded
        if (!scene.textures.exists('pointer-normal') || !scene.textures.exists('pointer-click')) {
            console.error('Cursor assets not loaded! Creating fallback cursor...');

            // Create a simple colored rectangle as fallback cursor
            this.cursorSprite = scene.add.rectangle(0, 0, 20, 20, 0xff0000, 1) as any;
            this.cursorSprite?.setOrigin(0, 0);
        } else {
            // Create cursor sprite with loaded assets
            this.cursorSprite = scene.add.image(0, 0, 'pointer-normal');
            // console.log('Cursor sprite created with assets:', this.cursorSprite);
        }

        // Hide the default browser cursor
        scene.input.setDefaultCursor('none');
        if (this.cursorSprite) {
            this.cursorSprite.setDepth(Number.MAX_SAFE_INTEGER); // Absolute maximum depth
            this.cursorSprite.setOrigin(0, 0); // Set origin to top-left for precise positioning
            this.cursorSprite.setScrollFactor(0); // Don't scroll with camera
            this.cursorSprite.setScale(3); // Make cursor even larger

            // Debug: Log cursor properties
            // console.log('Cursor created at position:', this.cursorSprite.x, this.cursorSprite.y);
            // console.log('Cursor depth:', this.cursorSprite.depth);
            // console.log('Cursor visible:', this.cursorSprite.visible);
            // console.log('Cursor scale:', this.cursorSprite.scale);

            // Force cursor to a specific visible position for testing
            this.cursorSprite.setPosition(100, 100);

            // Ensure it's always on top by adding to display list last
            this.cursorSprite.scene.children.bringToTop(this.cursorSprite);
        }

        // Set up mouse tracking
        scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            this.updateCursorPosition(pointer.x, pointer.y);
        });

        // Initial position at center of screen
        if (this.cursorSprite) {
            this.updateCursorPosition(scene.cameras.main.width / 2, scene.cameras.main.height / 2);
        }

        // Set up click events
        scene.input.on('pointerdown', () => {
            this.setClickState(true);
        });

        scene.input.on('pointerup', () => {
            this.setClickState(false);
        });

        // Handle mouse leaving the game area
        scene.input.on('pointerout', () => {
            this.hideCursor();
        });

        // Handle mouse entering the game area
        scene.input.on('pointerover', () => {
            this.showCursor();
        });

        // Try to add cursor specifically to UI camera if it exists
        const uiCamera = scene.cameras.getCamera('UICamera');
        if (uiCamera && this.cursorSprite) {
            // console.log('Found UI camera, making cursor visible only to UI camera');
            // Make cursor invisible to main camera but visible to UI camera
            scene.cameras.main.ignore(this.cursorSprite);
            // console.log('Cursor ignored by main camera');
        } else {
            // console.log('No UI camera found, cursor will render on all cameras');
        }

        // Force cursor to be visible initially
        if (this.cursorSprite) {
            this.cursorSprite.setVisible(true);
            this.cursorSprite.setActive(true);
        }

        this.isInitialized = true;
    }

    /**
     * Update cursor position
     * @param x X coordinate
     * @param y Y coordinate
     */
    private static updateCursorPosition(x: number, y: number): void {
        if (this.cursorSprite) {
            this.cursorSprite.setPosition(x, y);
            // Make sure cursor stays visible and on top
            this.cursorSprite.setVisible(true);
            this.cursorSprite.setDepth(Number.MAX_SAFE_INTEGER);
            // Always bring to top when moving
            this.cursorSprite.scene.children.bringToTop(this.cursorSprite);
        }
    }

    /**
     * Set click state of cursor
     * @param isClicking Whether the cursor is in clicking state
     */
    private static setClickState(isClicking: boolean): void {
        if (!this.cursorSprite) return;

        this.isClicking = isClicking;

        if (isClicking) {
            this.cursorSprite.setTexture('pointer-click');
        } else {
            this.cursorSprite.setTexture('pointer-normal');
        }
    }

    /**
     * Hide the cursor
     */
    private static hideCursor(): void {
        if (this.cursorSprite) {
            this.cursorSprite.setVisible(false);
        }
    }

    /**
     * Show the cursor
     */
    private static showCursor(): void {
        if (this.cursorSprite) {
            this.cursorSprite.setVisible(true);
        }
    }

    /**
     * Destroy the cursor and restore default
     */
    public static destroy(): void {
        if (this.scene) {
            this.scene.input.setDefaultCursor('auto');
        }

        if (this.cursorSprite) {
            this.cursorSprite.destroy();
            this.cursorSprite = null;
        }

        this.isInitialized = false;
        this.scene = null;
    }

    /**
     * Check if cursor is initialized
     */
    public static isActive(): boolean {
        return this.isInitialized && this.cursorSprite !== null;
    }

    /**
     * Set cursor scale
     * @param scale Scale factor
     */
    public static setScale(scale: number): void {
        if (this.cursorSprite) {
            this.cursorSprite.setScale(scale);
        }
    }

    /**
     * Force cursor to top of display list
     */
    public static bringToTop(): void {
        if (this.cursorSprite && this.cursorSprite.scene) {
            this.cursorSprite.setDepth(Number.MAX_SAFE_INTEGER);
            this.cursorSprite.scene.children.bringToTop(this.cursorSprite);
        }
    }
} 
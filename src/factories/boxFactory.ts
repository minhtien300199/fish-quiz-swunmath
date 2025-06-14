import 'phaser';
import { MusicManager } from '../managers/musicManager';

// Box states
export enum BoxState {
    OPEN = 'open',
    CLOSED = 'closed'
}

// Box properties interface
interface BoxProperties {
    width: number;
    height: number;
    tileSize: number;
    gridSize: number;
    depth: number;
}

export class BoxFactory {
    private static readonly boxProperties: BoxProperties = {
        width: 64, // Actual image width at scale 1 (assuming 16x16 image)
        height: 64, // Actual image height at scale 1 (assuming 16x16 image)
        tileSize: 16, // Each tile is now 4x4 at scale 1
        gridSize: 4, // 4x4 grid = 16 tiles total
        depth: 9999 // Extremely high depth to intercept clicks before game world
    };

    private static box: Phaser.GameObjects.Image | null = null;
    private static cap: Phaser.GameObjects.Image | null = null;
    private static container: Phaser.GameObjects.Container | null = null;
    private static currentState: BoxState = BoxState.CLOSED;
    private static fishSlots: (Phaser.GameObjects.Image | null)[][] = [];

    /**
     * Load box assets
     * @param scene The scene to load assets into
     */
    public static loadAssets(scene: Phaser.Scene): void {
        console.log('Loading box assets...');
        scene.load.image('box', 'assets/fishing_box/box.png');
        scene.load.image('box-cap', 'assets/fishing_box/box_cap.png');
        scene.load.image('box-cap-open', 'assets/fishing_box/box_cap_open.png');
        scene.load.audio('open-box', 'assets/sounds/open-box.mp3');
        console.log('Box assets loaded');
    }

    /**
     * Create the box with cap in the bottom right corner of the camera
     * @param scene The scene to add the box to
     * @returns The created box container
     */
    public static createBox(scene: Phaser.Scene): Phaser.GameObjects.Container {
        console.log('Creating box...');
        // Calculate position for bottom right of camera
        const camera = scene.cameras.main;
        const boxX = camera.width - this.boxProperties.width / 2 - 150; // 20px margin from right edge
        const boxY = camera.height - this.boxProperties.height / 2 - 150; // 20px margin from bottom edge
        console.log('Box position calculated:', boxX, boxY, 'Camera size:', camera.width, camera.height);

        // Create container for the box system
        this.container = scene.add.container(boxX, boxY);
        this.container.setDepth(this.boxProperties.depth);
        this.container.setScrollFactor(0); // Stay fixed to camera
        console.log('Container created with depth:', this.boxProperties.depth);

        // Create the box base
        this.box = scene.add.image(0, 0, 'box');
        this.box.setOrigin(0.5, 0.5);
        this.box.setScale(4); // Scale up from 16x16 to 64x64
        this.box.setDepth(1); // Base layer within container
        console.log('Box base created');

        // Create the cap (starts closed)
        this.cap = scene.add.image(0, -8, 'box-cap'); // Slightly above the box
        this.cap.setOrigin(0.5, 0.5);
        this.cap.setScale(4); // Match the box scale
        this.cap.setDepth(10); // Top layer within container (above fish)
        console.log('Box cap created');

        // Add components to container
        this.container.add([this.box, this.cap]);

        // Initialize fish slots grid
        this.initializeFishSlots();

        // Make the box interactive
        this.makeInteractive(scene);

        // Make sure box is visible on UI camera and ignored by main camera to avoid zoom issues
        const uiCamera = scene.cameras.getCamera('UICamera');
        if (uiCamera) {
            // Box should be visible on UI camera (no zoom), not main camera (3x zoom)
            scene.cameras.main.ignore(this.container);
            console.log('Box set to UI camera only to avoid zoom issues');
        } else {
            console.warn('UI Camera not found, box may be affected by zoom');
        }

        console.log('Box created at position:', boxX, boxY);
        return this.container;
    }

    /**
     * Initialize the fish storage slots grid
     */
    private static initializeFishSlots(): void {
        this.fishSlots = [];
        for (let row = 0; row < this.boxProperties.gridSize; row++) {
            this.fishSlots[row] = [];
            for (let col = 0; col < this.boxProperties.gridSize; col++) {
                this.fishSlots[row][col] = null; // Empty slot
            }
        }
    }

    /**
     * Make the box interactive for clicking
     * @param scene The scene containing the box
     */
    private static makeInteractive(scene: Phaser.Scene): void {
        if (!this.container || !this.cap) return;

        // Calculate the actual size based on the scale
        const actualWidth = this.boxProperties.width * (this.box?.scaleX || 1);
        const actualHeight = this.boxProperties.height * (this.box?.scaleY || 1);

        // Make the container interactive with the correct scaled size
        this.container.setSize(actualWidth, actualHeight);
        this.container.setInteractive();

        console.log('Interactive area set to:', actualWidth, 'x', actualHeight);

        // Add click handler - simpler approach without event parameter issues
        this.container.on('pointerdown', () => {
            this.toggleBox(scene);
        });

        // Add hover effects
        this.container.on('pointerover', () => {
            if (this.cap) {
                this.cap.setTint(0xcccccc); // Slightly darker on hover
            }
        });

        this.container.on('pointerout', () => {
            if (this.cap) {
                this.cap.clearTint(); // Remove tint
            }
        });
    }

    /**
     * Toggle the box between open and closed states
     * @param scene The scene containing the box
     */
    public static toggleBox(scene: Phaser.Scene): void {
        if (!this.cap) return;

        if (this.currentState === BoxState.CLOSED) {
            this.openBox(scene);
        } else {
            this.closeBox(scene);
        }
    }

    /**
 * Open the box
 * @param scene The scene containing the box
 */
    public static openBox(scene: Phaser.Scene): void {
        if (!this.cap) return;

        this.currentState = BoxState.OPEN;
        this.cap.setTexture('box-cap-open');

        // Play box opening sound
        MusicManager.playSound(scene, 'open-box', { volume: 0.5 });

        // Calculate position above the first row
        // Box is 64x64 pixels (4x4 grid with 16px per tile when scaled)
        // First row starts at -32px from center (half of box height)
        // Position cap above the first row
        const actualTileSize = this.boxProperties.tileSize * 4; // 4px * 4 scale = 16px per tile
        const firstRowY = -(this.boxProperties.height + 44); // Top edge of box
        const capOpenY = firstRowY - (actualTileSize); // Position cap above first row

        // Animate the cap opening
        scene.tweens.add({
            targets: this.cap,
            y: capOpenY, // Position cap above the first row
            duration: 200,
            ease: 'Power2'
        });

        console.log('Box opened - cap positioned above first row at y:', capOpenY);
    }

    /**
     * Close the box
     * @param scene The scene containing the box
     */
    public static closeBox(scene: Phaser.Scene): void {
        if (!this.cap) return;

        this.currentState = BoxState.CLOSED;
        this.cap.setTexture('box-cap');

        // Play box closing sound
        MusicManager.playSound(scene, 'open-box', { volume: 0.5 });

        // Animate the cap closing
        scene.tweens.add({
            targets: this.cap,
            y: -8, // Move cap back to closed position
            rotation: 0, // Remove rotation
            duration: 200,
            ease: 'Power2'
        });

        console.log('Box closed');
    }

    /**
     * Add a fish to the box storage
     * @param scene The scene containing the box
     * @param fishTexture The texture key of the fish to add
     * @returns True if fish was added successfully, false if box is full
     */
    public static addFish(scene: Phaser.Scene, fishTexture: string): boolean {
        // Find first empty slot
        for (let row = 0; row < this.boxProperties.gridSize; row++) {
            for (let col = 0; col < this.boxProperties.gridSize; col++) {
                if (this.fishSlots[row][col] === null) {
                    // Calculate position within the box starting from top-left
                    // Box is 64x64 (at scale 4), so we need to position from top-left corner
                    const halfBoxSize = (this.boxProperties.width * 4) / 2; // Half of scaled box size (128px)
                    const tileSpacing = this.boxProperties.tileSize * 4; // Actual tile spacing (64px)

                    // Start from top-left corner and offset by tile positions
                    const slotX = -halfBoxSize + (col * tileSpacing) + (tileSpacing / 2);
                    const slotY = -halfBoxSize + (row * tileSpacing) + (tileSpacing / 2);

                    // Create fish sprite with appropriate scale for box tiles
                    const fishSprite = scene.add.image(slotX, slotY, fishTexture);
                    fishSprite.setScale(4); // Scale to fit nicely in 16x16 tile slots
                    fishSprite.setOrigin(0.5, 0.5);
                    fishSprite.setDepth(2); // Middle layer: above box base (1) but below cap (3)

                    // Add to container
                    if (this.container) {
                        this.container.add(fishSprite);

                        // Ensure cap stays on top by bringing it to front
                        if (this.cap) {
                            this.container.bringToTop(this.cap);
                        }
                    }

                    // Store in grid
                    this.fishSlots[row][col] = fishSprite;

                    console.log(`Fish added to slot [${row}][${col}]`);
                    return true;
                }
            }
        }

        console.log('Box is full, cannot add more fish');
        return false;
    }

    /**
     * Remove a fish from a specific slot
     * @param row The row index
     * @param col The column index
     * @returns True if fish was removed successfully
     */
    public static removeFish(row: number, col: number): boolean {
        if (row < 0 || row >= this.boxProperties.gridSize ||
            col < 0 || col >= this.boxProperties.gridSize) {
            return false;
        }

        const fishSprite = this.fishSlots[row][col];
        if (fishSprite && this.container) {
            this.container.remove(fishSprite);
            fishSprite.destroy();
            this.fishSlots[row][col] = null;
            console.log(`Fish removed from slot [${row}][${col}]`);
            return true;
        }

        return false;
    }

    /**
     * Get the current state of the box
     * @returns The current box state
     */
    public static getState(): BoxState {
        return this.currentState;
    }

    /**
     * Get the number of fish currently in the box
     * @returns Number of fish stored
     */
    public static getFishCount(): number {
        let count = 0;
        for (let row = 0; row < this.boxProperties.gridSize; row++) {
            for (let col = 0; col < this.boxProperties.gridSize; col++) {
                if (this.fishSlots[row][col] !== null) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * Check if the box is full
     * @returns True if box cannot hold more fish
     */
    public static isFull(): boolean {
        return this.getFishCount() >= (this.boxProperties.gridSize * this.boxProperties.gridSize);
    }

    /**
     * Clear all fish from the box
     */
    public static clearAllFish(): void {
        for (let row = 0; row < this.boxProperties.gridSize; row++) {
            for (let col = 0; col < this.boxProperties.gridSize; col++) {
                if (this.fishSlots[row][col]) {
                    this.removeFish(row, col);
                }
            }
        }
        console.log('All fish cleared from box');
    }

    /**
     * Update box position to stay in bottom right of camera
     * @param scene The scene containing the box
     */
    public static updatePosition(scene: Phaser.Scene): void {
        if (!this.container) return;

        const camera = scene.cameras.main;
        const boxX = camera.width - this.boxProperties.width / 2 - 20;
        const boxY = camera.height - this.boxProperties.height / 2 - 20;

        this.container.setPosition(boxX, boxY);
    }

    /**
     * Destroy the box and clean up
     */
    public static destroy(): void {
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        this.box = null;
        this.cap = null;
        this.fishSlots = [];
        this.currentState = BoxState.CLOSED;
    }
} 
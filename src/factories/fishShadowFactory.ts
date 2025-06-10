import 'phaser';

// Fish shadow size categories
export enum FishShadowSize {
    BIG = 'big',
    MEDIUM = 'medium',
    SMALL = 'small'
}

// Fish shadow actions
export enum FishShadowAction {
    APPEARING = 'appearing',
    DISAPPEARING = 'disappearing',
    SWIM = 'swim'
}

// Fish shadow directions for swimming
export enum FishShadowDirection {
    TOP = 'top',
    LEFT = 'left',
    BOTTOM = 'bottom',
    RIGHT = 'right',
    TOP_LEFT = 'top_left',
    TOP_RIGHT = 'top_right',
    BOTTOM_LEFT = 'bottom_left',
    BOTTOM_RIGHT = 'bottom_right'
}

// Fish shadow properties interface
interface FishShadowProperties {
    scale: number;
    depth: number;
    frameRate: number;
    animationDuration: number;
    alpha: number;
}

// Swimming animation configuration
interface SwimAnimationConfig {
    frameCount: number;
    frameRate: number;
    repeat: number;
}

export class FishShadowFactory {
    // Default fish shadow properties by size category
    private static readonly shadowProperties: Record<FishShadowSize, FishShadowProperties> = {
        [FishShadowSize.SMALL]: {
            scale: 1.5,
            depth: 3,
            frameRate: 8,
            animationDuration: 1000,
            alpha: 0.6
        },
        [FishShadowSize.MEDIUM]: {
            scale: 2.0,
            depth: 4,
            frameRate: 7,
            animationDuration: 1200,
            alpha: 0.7
        },
        [FishShadowSize.BIG]: {
            scale: 2.5,
            depth: 5,
            frameRate: 6,
            animationDuration: 1500,
            alpha: 0.8
        }
    };

    // Swimming animation configuration
    private static readonly swimConfig: SwimAnimationConfig = {
        frameCount: 4,
        frameRate: 8,
        repeat: -1 // Infinite loop
    };

    /**
 * Load fish shadow assets for all sizes and actions
 * @param scene The scene to load assets into
 */
    public static loadAllShadowAssets(scene: Phaser.Scene): void {
        // Load appearing animations as spritesheets (4 frames, 32x32 each)
        Object.values(FishShadowSize).forEach(size => {
            const appearingKey = `fish-shadow-${size}-appearing`;
            const appearingPath = `assets/animations/fish_appearing_animation/${size}_fish_appearing_animation.png`;

            scene.load.spritesheet(appearingKey, appearingPath, {
                frameWidth: 32,
                frameHeight: 32
            });
            console.log(`Loading appearing animation spritesheet: ${appearingKey} from ${appearingPath}`);
        });

        // Load disappearing animations as spritesheets (4 frames, 32x32 each)
        Object.values(FishShadowSize).forEach(size => {
            const disappearingKey = `fish-shadow-${size}-disappearing`;
            const disappearingPath = `assets/animations/fish_dissapearing_animation/${size}_fish_disappearing_animation.png`;

            scene.load.spritesheet(disappearingKey, disappearingPath, {
                frameWidth: 32,
                frameHeight: 32
            });
            console.log(`Loading disappearing animation spritesheet: ${disappearingKey} from ${disappearingPath}`);
        });

        // Load swimming animations for all sizes and directions
        this.loadAllSwimAssets(scene);
    }

    /**
 * Load fish shadow assets for a specific size
 * @param scene The scene to load assets into
 * @param size The size of fish shadow to load
 */
    public static loadShadowAssets(scene: Phaser.Scene, size: FishShadowSize): void {
        // Load appearing animation as spritesheet
        const appearingKey = `fish-shadow-${size}-appearing`;
        const appearingPath = `assets/animations/fish_appearing_animation/${size}_fish_appearing_animation.png`;
        scene.load.spritesheet(appearingKey, appearingPath, {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load disappearing animation as spritesheet
        const disappearingKey = `fish-shadow-${size}-disappearing`;
        const disappearingPath = `assets/animations/fish_dissapearing_animation/${size}_fish_disappearing_animation.png`;
        scene.load.spritesheet(disappearingKey, disappearingPath, {
            frameWidth: 32,
            frameHeight: 32
        });

        // Load swimming animations for this size
        this.loadSwimAssets(scene, size);

        console.log(`Loading shadow assets for size: ${size}`);
    }

    /**
     * Load swimming animation assets for all sizes and directions
     * @param scene The scene to load assets into
     */
    public static loadAllSwimAssets(scene: Phaser.Scene): void {
        Object.values(FishShadowSize).forEach(size => {
            this.loadSwimAssets(scene, size);
        });
    }

    /**
     * Load swimming animation assets for a specific size
     * @param scene The scene to load assets into
     * @param size The size of fish shadow to load swimming assets for
     */
    public static loadSwimAssets(scene: Phaser.Scene, size: FishShadowSize): void {
        Object.values(FishShadowDirection).forEach(direction => {
            // Create spritesheet key for this size and direction
            const spritesheetKey = `fish-shadow-${size}-swim-${direction}`;

            // Load individual frames for this direction and create spritesheet
            const frameUrls: string[] = [];
            for (let frame = 1; frame <= this.swimConfig.frameCount; frame++) {
                const frameNumber = frame.toString().padStart(4, '0');
                const framePath = `assets/animations/fish_shadow_swim_animations/${size}_fish/${size}_fish_${direction}_${frameNumber}.png`;
                frameUrls.push(framePath);
            }

            // Load the first frame as the base texture for the spritesheet
            const firstFramePath = `assets/animations/fish_shadow_swim_animations/${size}_fish/${size}_fish_${direction}_0001.png`;
            scene.load.image(`${spritesheetKey}-base`, firstFramePath);

            // Load all frames as individual images that we'll use for animation
            for (let frame = 1; frame <= this.swimConfig.frameCount; frame++) {
                const frameNumber = frame.toString().padStart(4, '0');
                const framePath = `assets/animations/fish_shadow_swim_animations/${size}_fish/${size}_fish_${direction}_${frameNumber}.png`;
                const frameKey = `${spritesheetKey}-frame-${frameNumber}`;
                scene.load.image(frameKey, framePath);
            }

            console.log(`Loading swimming assets for ${size} fish, direction: ${direction}`);
        });
    }

    /**
 * Create a fish shadow with animation
 * @param scene The scene to add the shadow to
 * @param x X position
 * @param y Y position
 * @param size Size of the fish shadow
 * @param action Initial action (appearing, disappearing, or swim)
 * @param direction Direction for swimming (required if action is swim)
 * @returns The created fish shadow sprite
 */
    public static createFishShadow(
        scene: Phaser.Scene,
        x: number,
        y: number,
        size: FishShadowSize,
        action: FishShadowAction = FishShadowAction.APPEARING,
        direction: FishShadowDirection = FishShadowDirection.RIGHT
    ): Phaser.GameObjects.Sprite {
        // Get properties for this size
        const properties = this.shadowProperties[size];

        let fishShadow: Phaser.GameObjects.Sprite;

        if (action === FishShadowAction.SWIM) {
            // For swimming, create a sprite with swimming texture
            const firstFrameKey = `fish-shadow-${size}-swim-${direction}-frame-0001`;
            fishShadow = scene.add.sprite(x, y, firstFrameKey)
                .setScale(properties.scale)
                .setDepth(properties.depth)
                .setAlpha(properties.alpha)
                .setOrigin(0.5, 0.5);
        } else {
            // For appearing/disappearing, create sprite with spritesheet
            const assetKey = `fish-shadow-${size}-${action}`;
            fishShadow = scene.add.sprite(x, y, assetKey, 0) // Start with frame 0
                .setScale(properties.scale)
                .setDepth(properties.depth)
                .setAlpha(properties.alpha)
                .setOrigin(0.5, 0.5);
        }

        // Make sure the shadow is only visible to the main camera
        const cameras = scene.cameras.cameras;
        for (let i = 1; i < cameras.length; i++) {
            const camera = cameras[i];
            if (camera && camera !== scene.cameras.main) {
                camera.ignore(fishShadow);
            }
        }

        console.log(`Created fish shadow: size=${size}, action=${action}, direction=${direction}, position=(${x}, ${y})`);

        return fishShadow;
    }

    /**
 * Play appearing animation on a fish shadow
 * @param scene The scene containing the shadow
 * @param fishShadow The fish shadow to animate
 * @param size Size of the fish shadow
 * @param onComplete Optional callback when animation completes
 */
    public static playAppearingAnimation(
        scene: Phaser.Scene,
        fishShadow: Phaser.GameObjects.Sprite,
        size: FishShadowSize,
        onComplete?: () => void
    ): void {
        const properties = this.shadowProperties[size];
        const animKey = `fish-shadow-${size}-appearing-anim`;

        // Create animation if it doesn't exist
        if (!scene.anims.exists(animKey)) {
            scene.anims.create({
                key: animKey,
                frames: scene.anims.generateFrameNumbers(`fish-shadow-${size}-appearing`, {
                    start: 0,
                    end: 3
                }),
                frameRate: 8,
                repeat: 0 // Play once
            });
            console.log(`Created appearing animation: ${animKey}`);
        }

        // Start with alpha 0 for fade-in effect
        fishShadow.setAlpha(0);

        // Play the spritesheet animation
        fishShadow.play(animKey);

        // Add fade-in tween effect
        scene.tweens.add({
            targets: fishShadow,
            alpha: properties.alpha,
            scale: properties.scale,
            duration: properties.animationDuration,
            ease: 'Power2',
            onComplete: () => {
                console.log(`Fish shadow appearing animation completed for size: ${size}`);
                if (onComplete) {
                    onComplete();
                }
            }
        });
    }

    /**
 * Play disappearing animation on a fish shadow
 * @param scene The scene containing the shadow
 * @param fishShadow The fish shadow to animate
 * @param size Size of the fish shadow
 * @param onComplete Optional callback when animation completes
 */
    public static playDisappearingAnimation(
        scene: Phaser.Scene,
        fishShadow: Phaser.GameObjects.Sprite,
        size: FishShadowSize,
        onComplete?: () => void
    ): void {
        const properties = this.shadowProperties[size];
        const animKey = `fish-shadow-${size}-disappearing-anim`;

        // Create animation if it doesn't exist
        if (!scene.anims.exists(animKey)) {
            scene.anims.create({
                key: animKey,
                frames: scene.anims.generateFrameNumbers(`fish-shadow-${size}-disappearing`, {
                    start: 0,
                    end: 3
                }),
                frameRate: 8,
                repeat: 0 // Play once
            });
            console.log(`Created disappearing animation: ${animKey}`);
        }

        // Play the spritesheet animation
        fishShadow.play(animKey);

        // Add fade-out tween effect
        scene.tweens.add({
            targets: fishShadow,
            alpha: 0,
            scale: properties.scale * 0.8,
            duration: properties.animationDuration,
            ease: 'Power2',
            onComplete: () => {
                console.log(`Fish shadow disappearing animation completed for size: ${size}`);
                if (onComplete) {
                    onComplete();
                }
            }
        });
    }

    /**
 * Play swimming animation on a fish shadow
 * @param scene The scene containing the shadow
 * @param fishShadow The fish shadow to animate (must be a sprite)
 * @param size Size of the fish shadow
 * @param direction Direction to swim
 * @param onComplete Optional callback when animation completes
 */
    public static playSwimmingAnimation(
        scene: Phaser.Scene,
        fishShadow: Phaser.GameObjects.Sprite,
        size: FishShadowSize,
        direction: FishShadowDirection,
        onComplete?: () => void
    ): void {
        // Create animation key
        const animKey = `fish-shadow-${size}-swim-${direction}`;

        // Check if animation already exists
        if (!scene.anims.exists(animKey)) {
            // Verify all frame textures exist before creating animation
            const frames: Phaser.Types.Animations.AnimationFrame[] = [];
            let allFramesExist = true;

            for (let frame = 1; frame <= this.swimConfig.frameCount; frame++) {
                const frameNumber = frame.toString().padStart(4, '0');
                const frameKey = `fish-shadow-${size}-swim-${direction}-frame-${frameNumber}`;

                // Check if texture exists
                if (!scene.textures.exists(frameKey)) {
                    console.warn(`Texture not found: ${frameKey}`);
                    allFramesExist = false;
                    break;
                }

                frames.push({ key: frameKey });
            }

            if (!allFramesExist) {
                console.error(`Cannot create animation ${animKey}: missing textures`);
                return;
            }

            // Create the animation only if all frames exist
            try {
                scene.anims.create({
                    key: animKey,
                    frames: frames,
                    frameRate: this.swimConfig.frameRate,
                    repeat: this.swimConfig.repeat
                });

                console.log(`Created swimming animation: ${animKey}`);
            } catch (error) {
                console.error(`Failed to create animation ${animKey}:`, error);
                return;
            }
        }

        // Play the animation
        try {
            fishShadow.play(animKey);

            if (onComplete) {
                fishShadow.once('animationcomplete', onComplete);
            }

            console.log(`Playing swimming animation: ${animKey} for size: ${size}, direction: ${direction}`);
        } catch (error) {
            console.error(`Failed to play animation ${animKey}:`, error);
        }
    }

    /**
     * Stop swimming animation and optionally switch to a static frame
     * @param fishShadow The fish shadow sprite
     * @param size Size of the fish shadow
     * @param direction Direction the fish was swimming
     * @param staticFrame Frame number to display when stopped (1-4)
     */
    public static stopSwimmingAnimation(
        fishShadow: Phaser.GameObjects.Sprite,
        size: FishShadowSize,
        direction: FishShadowDirection,
        staticFrame: number = 1
    ): void {
        fishShadow.stop();

        const frameNumber = staticFrame.toString().padStart(4, '0');
        const frameKey = `fish-shadow-${size}-swim-${direction}-frame-${frameNumber}`;
        fishShadow.setTexture(frameKey);

        console.log(`Stopped swimming animation for size: ${size}, direction: ${direction}, static frame: ${staticFrame}`);
    }

    /**
 * Switch animation action on a fish shadow
 * @param scene The scene containing the shadow
 * @param fishShadow The fish shadow to update
 * @param size Size of the fish shadow
 * @param newAction The new action to apply
 * @param direction Direction for swimming (required if newAction is swim)
 * @param onComplete Optional callback when animation completes
 */
    public static switchAction(
        scene: Phaser.Scene,
        fishShadow: Phaser.GameObjects.Sprite,
        size: FishShadowSize,
        newAction: FishShadowAction,
        direction?: FishShadowDirection,
        onComplete?: () => void
    ): void {
        switch (newAction) {
            case FishShadowAction.APPEARING:
                this.playAppearingAnimation(scene, fishShadow, size, onComplete);
                break;
            case FishShadowAction.DISAPPEARING:
                this.playDisappearingAnimation(scene, fishShadow, size, onComplete);
                break;
            case FishShadowAction.SWIM:
                if (direction) {
                    this.playSwimmingAnimation(scene, fishShadow, size, direction, onComplete);
                } else {
                    console.warn('Swimming action requires a direction');
                }
                break;
        }
    }

    /**
 * Get a random fish shadow size
 * @returns Random fish shadow size
 */
    public static getRandomSize(): FishShadowSize {
        const sizes = Object.values(FishShadowSize);
        return sizes[Math.floor(Math.random() * sizes.length)];
    }

    /**
     * Get a random swimming direction
     * @returns Random fish shadow direction
     */
    public static getRandomDirection(): FishShadowDirection {
        const directions = Object.values(FishShadowDirection);
        return directions[Math.floor(Math.random() * directions.length)];
    }

    /**
     * Change swimming direction of a fish shadow
     * @param scene The scene containing the shadow
     * @param fishShadow The fish shadow sprite
     * @param size Size of the fish shadow
     * @param newDirection New direction to swim
     */
    public static changeSwimDirection(
        scene: Phaser.Scene,
        fishShadow: Phaser.GameObjects.Sprite,
        size: FishShadowSize,
        newDirection: FishShadowDirection
    ): void {
        // Stop current animation
        fishShadow.stop();

        // Start new swimming animation in the new direction
        this.playSwimmingAnimation(scene, fishShadow, size, newDirection);

        console.log(`Changed swim direction to: ${newDirection} for size: ${size}`);
    }

    /**
     * Get properties for a specific size
     * @param size The fish shadow size
     * @returns Properties object for the size
     */
    public static getProperties(size: FishShadowSize): FishShadowProperties {
        return { ...this.shadowProperties[size] };
    }

    /**
 * Destroy a fish shadow with optional fade out
 * @param scene The scene containing the shadow
 * @param fishShadow The fish shadow to destroy
 * @param fadeOut Whether to fade out before destroying
 */
    public static destroyFishShadow(
        scene: Phaser.Scene,
        fishShadow: Phaser.GameObjects.Sprite,
        fadeOut: boolean = true
    ): void {
        if (fadeOut) {
            scene.tweens.add({
                targets: fishShadow,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    fishShadow.destroy();
                    console.log('Fish shadow destroyed with fade out');
                }
            });
        } else {
            fishShadow.destroy();
            console.log('Fish shadow destroyed immediately');
        }
    }
} 
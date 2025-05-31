import 'phaser';

// Define floater types
export enum FloaterType {
  DEFAULT = 'default',
  FISH_BITING = 'fish-biting',
  FLOATING = 'floating'
}

// Floater properties interface
interface FloaterProperties {
  scale: number;
  depth: number;
  frameRate: number;
}

export class FloaterFactory {
  // Floater properties by type
  private static readonly floaterProperties: Record<FloaterType, FloaterProperties> = {
    [FloaterType.DEFAULT]: {
      scale: 0.6, // Increased scale from 0.3 to 0.6
      depth: 5,
      frameRate: 0 // Static image, no animation
    },
    [FloaterType.FISH_BITING]: {
      scale: 0.6, // Increased scale from 0.3 to 0.6
      depth: 5,
      frameRate: 8 // Animation frame rate
    },
    [FloaterType.FLOATING]: {
      scale: 0.6, // Increased scale from 0.3 to 0.6
      depth: 5,
      frameRate: 6 // Animation frame rate (slightly slower than biting)
    }
  };

  /**
   * Create a floater sprite
   * @param scene The scene to add the floater to
   * @param x X position
   * @param y Y position
   * @param floaterType Type of floater to create
   * @returns The created floater sprite (either Image or Sprite)
   */
  public static createFloater(
    scene: Phaser.Scene,
    x: number,
    y: number,
    floaterType: FloaterType = FloaterType.DEFAULT
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    const properties = this.floaterProperties[floaterType];
    
    // Create the appropriate type of floater
    let floater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    
    // Initialize with a default value to avoid 'used before assigned' errors
    floater = scene.add.image(x, y, 'floater')
      .setVisible(false); // This will be overwritten immediately
    
    if (floaterType === FloaterType.DEFAULT) {
      // Create static floater image
      floater = scene.add.image(x, y, 'floater')
        .setScale(properties.scale)
        .setDepth(properties.depth)
        .setOrigin(0.5, 0.5)
        .setPipeline('TextureTintPipeline'); // Use standard rendering pipeline
    } else if (floaterType === FloaterType.FISH_BITING) {
      // Create animated fish biting floater sprite
      floater = scene.add.sprite(x, y, 'floater-fish-biting')
        .setScale(properties.scale)
        .setDepth(properties.depth)
        .setOrigin(0.5, 0.5);
      
      // Create animation if it doesn't exist yet
      if (!scene.anims.exists('floater-bite')) {
        scene.anims.create({
          key: 'floater-bite',
          frames: scene.anims.generateFrameNumbers('floater-fish-biting', { start: 0, end: 3 }),
          frameRate: properties.frameRate,
          repeat: -1
        });
      }
      
      // Play the animation (with type guard)
      if (floater instanceof Phaser.GameObjects.Sprite) {
        floater.play('floater-bite');
      }
    } else if (floaterType === FloaterType.FLOATING) {
      // Create animated floating floater sprite using the first frame initially
      floater = scene.add.sprite(x, y, 'floater-floating-1')
        .setScale(properties.scale)
        .setDepth(properties.depth)
        .setOrigin(0.5, 0.5);
      
      // Create animation if it doesn't exist yet
      if (!scene.anims.exists('floater-float')) {
        // Create animation from individual frames
        const frames = [];
        for (let i = 1; i <= 5; i++) {
          frames.push({
            key: `floater-floating-${i}`
          });
        }
        
        scene.anims.create({
          key: 'floater-float',
          frames: frames,
          frameRate: properties.frameRate,
          repeat: -1
        });
      }
      
      // Play the animation (with type guard)
      if (floater instanceof Phaser.GameObjects.Sprite) {
        floater.play('floater-float');
      }
    }
    
    return floater;
  }
  
  /**
   * Replace an existing floater with a different type
   * @param scene The scene containing the floater
   * @param currentFloater The current floater to replace
   * @param newType The new floater type
   * @returns The new floater object
   */
  public static replaceFloater(
    scene: Phaser.Scene,
    currentFloater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    newType: FloaterType
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    // Store current position and properties
    const position = { x: currentFloater.x, y: currentFloater.y };
    const scale = currentFloater.scale;
    const depth = currentFloater.depth;
    
    // Remove the old floater
    currentFloater.destroy();
    
    // Create and return the new floater
    return this.createFloater(scene, position.x, position.y, newType);
  }
  
  /**
   * Make the floater bob up and down
   * @param scene The scene containing the floater
   * @param floater The floater to animate
   * @param intensity How much to move (in pixels)
   * @param duration Duration of each bob (in ms)
   * @param repeats Number of times to repeat the bob
   */
  public static bobFloater(
    scene: Phaser.Scene,
    floater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    intensity: number = 10,
    duration: number = 300,
    repeats: number = 3
  ): void {
    scene.tweens.add({
      targets: floater,
      y: floater.y - intensity,
      duration: duration,
      yoyo: true,
      repeat: repeats
    });
  }
  
  /**
   * Add the floater to a scene and configure it for UI camera
   * @param scene The scene to add the floater to
   * @param floater The floater to configure
   * @param uiCameraName Name of the UI camera to exclude the floater from
   */
  public static configureFloaterForUI(
    scene: Phaser.Scene,
    floater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    uiCameraName: string = 'UICamera'
  ): void {
    // Ignore the floater in UI camera if it exists
    const uiCamera = scene.cameras.getCamera(uiCameraName);
    if (uiCamera) {
      uiCamera.ignore(floater);
    }
  }
}

import 'phaser';
import { CharacterFactory } from './characterFactory';

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
  frameRate: number; // 0 for static image
}

// Floater offset interface for different directions
interface FloaterOffset {
  x: number;
  y: number;
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
      scale: 1, // Increased scale from 0.3 to 0.6
      depth: 5,
      frameRate: 6 // Animation frame rate (slightly slower than biting)
    }
  };

  // Floater offsets by direction
  private static readonly floaterOffsets: Record<string, FloaterOffset> = {
    down: { x: 0, y: 50 },   // Down: floater appears below the character
    left: { x: -50, y: 0 },  // Left: floater appears to the left of the character
    up: { x: 0, y: -50 },    // Up: floater appears above the character
    right: { x: 50, y: 0 }   // Right: floater appears to the right of the character
  };

  /**
   * Create a floater sprite
   * @param scene The scene to add the floater to
   * @param x X position
   * @param y Y position
   * @param floaterType Type of floater to create
   * @param character Optional character to determine direction
   * @returns The created floater sprite (either Image or Sprite)
   */
  public static createFloater(
    scene: Phaser.Scene,
    x: number,
    y: number,
    floaterType: FloaterType = FloaterType.DEFAULT,
    character?: Phaser.GameObjects.Sprite
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    const properties = this.floaterProperties[floaterType];

    // Determine position based on character direction if character is provided
    let floaterX = x;
    let floaterY = y;

    if (character) {
      // Get the character's current direction by examining the frame or animation
      let direction = 'down'; // Default direction
      
      // Check if there's a current animation playing
      const currentAnim = character.anims.currentAnim;
      if (currentAnim) {
        const animKey = currentAnim.key;
        if (animKey.includes('down')) direction = 'down';
        else if (animKey.includes('left')) direction = 'left';
        else if (animKey.includes('up')) direction = 'up';
        else if (animKey.includes('right')) direction = 'right';
      } else {
        // If no animation, try to determine from the frame
        const frame = character.frame.name;
        if (typeof frame === 'number' || !isNaN(Number(frame))) {
          const frameNum = Number(frame);
          // These frame numbers correspond to CharacterDirection enum in characterFactory.ts
          if (frameNum === 4 || frameNum === 5) direction = 'down';
          else if (frameNum === 2 || frameNum === 3) direction = 'left';
          else if (frameNum === 6 || frameNum === 7) direction = 'up';
          else if (frameNum === 0 || frameNum === 1) direction = 'right';
        }
      }
      
      const offset = this.floaterOffsets[direction] || this.floaterOffsets['down'];
      
      // Apply the offset based on direction
      floaterX = x + offset.x;
      floaterY = y + offset.y;
    }

    // Initialize with a default value to avoid 'used before assigned' errors
    let floater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;
    floater = scene.add.image(floaterX, floaterY, 'floater')
      .setVisible(false); // This will be overwritten immediately

    if (floaterType === FloaterType.DEFAULT) {
      // Create static floater image
      floater = scene.add.image(floaterX, floaterY, 'floater')
        .setScale(properties.scale)
        .setDepth(properties.depth)
        .setOrigin(0.5, 0.5)
        .setPipeline('TextureTintPipeline'); // Use standard rendering pipeline
    } else if (floaterType === FloaterType.FISH_BITING) {
      // Create animated fish biting floater sprite
      floater = scene.add.sprite(floaterX, floaterY, 'floater-fish-biting')
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
      floater = scene.add.sprite(floaterX, floaterY, 'floater-floating-1')
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
   * Replace an existing floater with a new one of the specified type
   * @param scene The scene
   * @param existingFloater The existing floater to replace
   * @param newFloaterType The type of the new floater
   * @param character Optional character to determine direction (if null, will use existing floater position)
   * @returns The new floater
   */
  public static replaceFloater(
    scene: Phaser.Scene,
    existingFloater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    newFloaterType: FloaterType,
    character?: Phaser.GameObjects.Sprite
  ): Phaser.GameObjects.Sprite | Phaser.GameObjects.Image {
    // Store current position and properties
    const x = existingFloater.x;
    const y = existingFloater.y;
    
    // Destroy the existing floater
    existingFloater.destroy();
    
    // Create a new floater of the specified type at the same position
    // If character is provided, it will position based on character direction
    // Otherwise it will use the exact position of the previous floater
    if (character) {
      return this.createFloater(scene, character.x, character.y, newFloaterType, character);
    } else {
      // Use the exact same position as the previous floater
      const newFloater = this.createFloater(scene, x, y, newFloaterType);
      // Ensure the new floater is at the exact same position
      newFloater.setPosition(x, y);
      return newFloater;
    }
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

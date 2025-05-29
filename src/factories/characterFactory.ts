import 'phaser';
import { IdleBodyType, ToolFishingRodThrowType, ToolFishingRodPullType, ToolFishingRodReelType } from '../const/bodyType';

// Define character types
export enum CharacterType {
  LIGHT = 'light',
  DARK = 'dark',
  BROWN = 'brown',
  BLACK = 'black' // Added for completeness since it's in the assets
}

// Define character action types
export enum CharacterActionType {
  IDLE = 'idle',
  FISHING_THROW = 'fishing-throw',
  FISHING_PULL = 'fishing-pull',
  FISHING_REEL = 'fishing-reel'
}

// Define character directions based on frame order
// Each direction has 2 frames for animation
export enum CharacterDirection {
  DOWN_1 = 4,      // First frame for DOWN
  DOWN_2 = 5,      // Second frame for DOWN
  LEFT_1 = 2,      // First frame for LEFT
  LEFT_2 = 3,      // Second frame for LEFT
  UP_1 = 6,        // First frame for UP
  UP_2 = 7,        // Second frame for UP
  RIGHT_1 = 0,     // First frame for RIGHT
  RIGHT_2 = 1      // Second frame for RIGHT
}

// Character properties interface
interface CharacterProperties {
  scale: number;
  offsetX: number; // Offset from boat position
  offsetY: number; // Offset from boat position
}

export class CharacterFactory {
  // Character properties by type
  private static readonly characterProperties: Record<CharacterType, CharacterProperties> = {
    [CharacterType.LIGHT]: {
      scale: 0.5,  // Reduced scale to make character smaller
      offsetX: 0,
      offsetY: 0  // Lowered by 48px from previous -20 value
    },
    [CharacterType.DARK]: {
      scale: 0.5,  // Reduced scale to make character smaller
      offsetX: 0,
      offsetY: 0  // Lowered by 48px from previous -20 value
    },
    [CharacterType.BROWN]: {
      scale: 0.5,  // Reduced scale to make character smaller
      offsetX: 0,
      offsetY: 0  // Lowered by 48px from previous -20 value
    },
    [CharacterType.BLACK]: {
      scale: 0.5,  // Reduced scale to make character smaller
      offsetX: 0,
      offsetY: 0  // Lowered by 48px from previous -20 value
    }
  };

  /**
   * Create a character sprite
   * @param scene The scene to add the character to
   * @param x X position
   * @param y Y position
   * @param characterType Type of character to create
   * @returns The created character sprite
   */
  public static createCharacter(
    scene: Phaser.Scene,
    x: number,
    y: number,
    characterType: CharacterType = CharacterType.LIGHT
  ): Phaser.GameObjects.Sprite {
    // Create the character sprite with improved rendering settings
    const character = scene.add.sprite(x, y, `character-idle-${characterType}`);
    
    // Set initial frame (DOWN direction)
    character.setFrame(CharacterDirection.DOWN_1);
    
    // Apply properties based on character type
    const properties = this.characterProperties[characterType];
    character.setScale(properties.scale);
    
    // Set the character's depth to be higher than the boat but lower than UI
    character.setDepth(10);
    
    // Prevent shadow artifacts with proper rendering settings
    character.setOrigin(0.5, 0.5); // Center origin point
    
    // Add these settings to prevent shadow artifacts
    // This ensures the sprite is completely redrawn each frame
    character.setActive(true);
    character.setVisible(true);
    
    // Make sure character stays within map bounds and prevent rendering artifacts
    // We don't need physics for the character since it follows the boat
    // Just ensure proper rendering settings
    character.setAlpha(1); // Full opacity
    character.setPipeline('TextureTintPipeline'); // Use standard rendering pipeline
    
    // Create idle animation for each direction with precise frame matching
    // Ensure we're using the correct frames for each direction based on the sprite sheet layout
    if (!scene.anims.exists(`${characterType}-idle-down`)) {
      scene.anims.create({
        key: `${characterType}-idle-down`,
        frames: scene.anims.generateFrameNumbers(`character-idle-${characterType}`, { 
          frames: [CharacterDirection.DOWN_1, CharacterDirection.DOWN_2] 
        }),
        frameRate: 3, // Slightly slower animation for better visibility
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${characterType}-idle-left`)) {
      scene.anims.create({
        key: `${characterType}-idle-left`,
        frames: scene.anims.generateFrameNumbers(`character-idle-${characterType}`, { 
          frames: [CharacterDirection.LEFT_1, CharacterDirection.LEFT_2] 
        }),
        frameRate: 3,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${characterType}-idle-right`)) {
      scene.anims.create({
        key: `${characterType}-idle-right`,
        frames: scene.anims.generateFrameNumbers(`character-idle-${characterType}`, { 
          frames: [CharacterDirection.RIGHT_1, CharacterDirection.RIGHT_2] 
        }),
        frameRate: 3,
        repeat: -1
      });
    }
    
    if (!scene.anims.exists(`${characterType}-idle-up`)) {
      scene.anims.create({
        key: `${characterType}-idle-up`,
        frames: scene.anims.generateFrameNumbers(`character-idle-${characterType}`, { 
          frames: [CharacterDirection.UP_1, CharacterDirection.UP_2] 
        }),
        frameRate: 3,
        repeat: -1
      });
    }
    
    // Start with the down idle animation
    character.play(`${characterType}-idle-down`);
    
    return character;
  }
  
  /**
   * Update character direction based on velocity
   * @param character The character sprite to update
   * @param velocityX X velocity component
   * @param velocityY Y velocity component
   * @param characterType The type of character
   */
  public static updateCharacterDirection(
    character: Phaser.GameObjects.Sprite,
    velocityX: number,
    velocityY: number,
    characterType: CharacterType
  ): void {
    // Only update direction if there's movement
    if (velocityX === 0 && velocityY === 0) return;
    
    // Determine the primary direction based on velocity
    if (Math.abs(velocityX) > Math.abs(velocityY)) {
      // Horizontal movement is dominant
      if (velocityX > 0) {
        // Moving right
        character.setVisible(true); // Ensure character is visible
        character.play(`${characterType}-idle-right`, true);
      } else {
        // Moving left
        character.setVisible(true); // Ensure character is visible
        character.play(`${characterType}-idle-left`, true);
      }
    } else {
      // Vertical movement is dominant
      if (velocityY > 0) {
        // Moving down (S direction) - hide the character as it would be behind the boat
        character.setVisible(false);
      } else {
        // Moving up
        character.setVisible(true); // Ensure character is visible
        character.play(`${characterType}-idle-up`, true);
      }
    }
  }

  /**
   * Get the offset for a specific character type
   * @param characterType The character type
   * @returns The character's offset from the boat position
   */
  public static getCharacterOffset(characterType: CharacterType): { x: number, y: number } {
    const properties = this.characterProperties[characterType];
    return { 
      x: properties.offsetX,
      y: properties.offsetY
    };
  }
  
  /**
   * Set character to fishing throw action
   * @param character The character sprite
   * @param scene The scene
   */
  public static setFishingThrowAction(character: Phaser.GameObjects.Sprite, scene: Phaser.Scene): void {
    const characterType = this.getCharacterTypeFromSprite(character);
    // 4 rows 7 columns
    // Create animations for each direction if they don't exist
    if (!scene.anims.exists('fishing-throw-down')) {
      // Create animations for each direction (DOWN = row 2, frames 14-20)
      scene.anims.create({
        key: 'fishing-throw-down',
        frames: scene.anims.generateFrameNumbers('character-fishing-throw', { 
          start: 14, end: 20 // Third row (DOWN): frames 14-20
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // LEFT direction (row 1, frames 5-9)
      scene.anims.create({
        key: 'fishing-throw-left',
        frames: scene.anims.generateFrameNumbers('character-fishing-throw', { 
          start: 7, end: 13 // Second row (LEFT): frames 7-13
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // UP direction (row 2, frames 10-14)
      scene.anims.create({
        key: 'fishing-throw-up',
        frames: scene.anims.generateFrameNumbers('character-fishing-throw', { 
          start: 21, end: 27 // Third row (UP): frames 21-27
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // RIGHT direction (row 3, frames 15-19)
      scene.anims.create({
        key: 'fishing-throw-right',
        frames: scene.anims.generateFrameNumbers('character-fishing-throw', { 
          start: 0, end: 6 // Fourth row (RIGHT): frames 0-6
        }),
        frameRate: 10,
        repeat: 0
      });
    }
    
    // Determine which direction animation to play based on the current direction
    const direction = this.getCurrentDirection(character);
    character.setTexture('character-fishing-throw');
    character.setVisible(true);
    character.play(`fishing-throw-${direction}`);
  }
  
  /**
   * Set character to fishing pull action
   * @param character The character sprite
   * @param scene The scene
   */
  public static setFishingPullAction(character: Phaser.GameObjects.Sprite, scene: Phaser.Scene): void {
    // Create animations for each direction if they don't exist
    if (!scene.anims.exists('fishing-pull-down')) {
      // Create animations for each direction (DOWN = row 0, frames 0-4)
      scene.anims.create({
        key: 'fishing-pull-down',
        frames: scene.anims.generateFrameNumbers('character-fishing-pull', { 
          start: 0, end: 4 // First row (DOWN): frames 0-4
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // LEFT direction (row 1, frames 5-9)
      scene.anims.create({
        key: 'fishing-pull-left',
        frames: scene.anims.generateFrameNumbers('character-fishing-pull', { 
          start: 5, end: 9 // Second row (LEFT): frames 5-9
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // UP direction (row 2, frames 10-14)
      scene.anims.create({
        key: 'fishing-pull-up',
        frames: scene.anims.generateFrameNumbers('character-fishing-pull', { 
          start: 10, end: 14 // Third row (UP): frames 10-14
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // RIGHT direction (row 3, frames 15-19)
      scene.anims.create({
        key: 'fishing-pull-right',
        frames: scene.anims.generateFrameNumbers('character-fishing-pull', { 
          start: 15, end: 19 // Fourth row (RIGHT): frames 15-19
        }),
        frameRate: 10,
        repeat: 0
      });
    }
    
    // Determine which direction animation to play based on the current direction
    const direction = this.getCurrentDirection(character);
    character.setTexture('character-fishing-pull');
    character.setVisible(true);
    character.play(`fishing-pull-${direction}`);
  }
  
  /**
   * Set character to fishing reel action
   * @param character The character sprite
   * @param scene The scene
   */
  public static setFishingReelAction(character: Phaser.GameObjects.Sprite, scene: Phaser.Scene): void {
    // Create animations for each direction if they don't exist
    if (!scene.anims.exists('fishing-reel-down')) {
      // Create animations for each direction (DOWN = row 0, frames 0-4)
      scene.anims.create({
        key: 'fishing-reel-down',
        frames: scene.anims.generateFrameNumbers('character-fishing-reel', { 
          start: 0, end: 4 // First row (DOWN): frames 0-4
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // LEFT direction (row 1, frames 5-9)
      scene.anims.create({
        key: 'fishing-reel-left',
        frames: scene.anims.generateFrameNumbers('character-fishing-reel', { 
          start: 5, end: 9 // Second row (LEFT): frames 5-9
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // UP direction (row 2, frames 10-14)
      scene.anims.create({
        key: 'fishing-reel-up',
        frames: scene.anims.generateFrameNumbers('character-fishing-reel', { 
          start: 10, end: 14 // Third row (UP): frames 10-14
        }),
        frameRate: 10,
        repeat: 0
      });
      
      // RIGHT direction (row 3, frames 15-19)
      scene.anims.create({
        key: 'fishing-reel-right',
        frames: scene.anims.generateFrameNumbers('character-fishing-reel', { 
          start: 15, end: 19 // Fourth row (RIGHT): frames 15-19
        }),
        frameRate: 10,
        repeat: 0
      });
    }
    
    // Determine which direction animation to play based on the current direction
    const direction = this.getCurrentDirection(character);
    character.setTexture('character-fishing-reel');
    character.setVisible(true);
    character.play(`fishing-reel-${direction}`);
  }
  
  /**
   * Set character action based on action type
   * @param character The character sprite
   * @param scene The scene
   * @param actionType The action type to set
   * @param characterType The character type
   */
  public static setCharacterAction(
    character: Phaser.GameObjects.Sprite,
    scene: Phaser.Scene,
    actionType: CharacterActionType,
    characterType: CharacterType = CharacterType.LIGHT
  ): void {
    switch (actionType) {
      case CharacterActionType.FISHING_THROW:
        this.setFishingThrowAction(character, scene);
        break;
      case CharacterActionType.FISHING_PULL:
        this.setFishingPullAction(character, scene);
        break;
      case CharacterActionType.FISHING_REEL:
        this.setFishingReelAction(character, scene);
        break;
      case CharacterActionType.IDLE:
      default:
        // Reset to idle animation based on the last direction
        character.setTexture(`character-idle-${characterType}`);
        character.play(`${characterType}-idle-down`);
        break;
    }
  }
  
  /**
   * Get the character type from a sprite based on its texture key
   * @param character The character sprite
   * @returns The character type (light, dark, brown, black)
   */
  private static getCharacterTypeFromSprite(character: Phaser.GameObjects.Sprite): CharacterType {
    const textureKey = character.texture.key;
    
    if (textureKey.includes('light')) {
      return CharacterType.LIGHT;
    } else if (textureKey.includes('dark')) {
      return CharacterType.DARK;
    } else if (textureKey.includes('brown')) {
      return CharacterType.BROWN;
    } else if (textureKey.includes('black')) {
      return CharacterType.BLACK;
    }
    
    // Default to light if we can't determine the type
    return CharacterType.LIGHT;
  }
  
  /**
   * Get the current direction of the character based on its animation
   * @param character The character sprite
   * @returns The direction as a string (down, left, up, right)
   */
  private static getCurrentDirection(character: Phaser.GameObjects.Sprite): string {
    const currentAnim = character.anims.currentAnim;
    
    if (currentAnim) {
      const animKey = currentAnim.key;
      
      if (animKey.includes('down')) {
        return 'down';
      } else if (animKey.includes('left')) {
        return 'left';
      } else if (animKey.includes('up')) {
        return 'up';
      } else if (animKey.includes('right')) {
        return 'right';
      }
    }
    
    // Check frame if no animation is playing
    const frame = character.frame.name as unknown as number;
    
    if (frame === CharacterDirection.DOWN_1 || frame === CharacterDirection.DOWN_2) {
      return 'down';
    } else if (frame === CharacterDirection.LEFT_1 || frame === CharacterDirection.LEFT_2) {
      return 'left';
    } else if (frame === CharacterDirection.UP_1 || frame === CharacterDirection.UP_2) {
      return 'up';
    } else if (frame === CharacterDirection.RIGHT_1 || frame === CharacterDirection.RIGHT_2) {
      return 'right';
    }
    
    // Default to down if we can't determine the direction
    return 'down';
  }
}

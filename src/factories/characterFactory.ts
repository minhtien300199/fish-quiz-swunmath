import 'phaser';

// Define character types
export enum CharacterType {
  LIGHT = 'light',
  DARK = 'dark',
  BROWN = 'brown',
  BLACK = 'black' // Added for completeness since it's in the assets
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
}

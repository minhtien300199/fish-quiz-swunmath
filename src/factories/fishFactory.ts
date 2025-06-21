import 'phaser';
import { FishType, fishSizes, FishVariantType, fishVariants, hasFishVariants, FishFileType } from '../const/fishType';
import { getFishPath, getFishInventoryPath, isSharkPattern } from '../const/fishType';

// Define fish animation types (for future implementation with spritesheets)
export enum FishAnimationType {
  IDLE = 'idle',
  SWIM = 'swim',
  CAUGHT = 'caught',
  ESCAPE = 'escape'
}

// Define fish states for static images
export enum FishState {
  NORMAL = 'normal',
  CAUGHT = 'caught',
  ESCAPED = 'escaped'
}

// Fish size categories for scaling and visual representation

// Fish properties interface
interface FishProperties {
  scale: number;
  depth: number;
  frameRate: number;
  animationLoops: boolean;
}

// Fish size categories
export enum FishSizeCategory {
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large'
}

export class FishFactory {
  // Default fish properties by size category - reduced scale values for smaller fish appearance
  private static readonly fishProperties: Record<FishSizeCategory, FishProperties> = {
    [FishSizeCategory.SMALL]: {
      scale: 0.5, // Updated to 0.5
      depth: 5,
      frameRate: 8,
      animationLoops: true
    },
    [FishSizeCategory.MEDIUM]: {
      scale: 0.5, // Updated to 0.5
      depth: 6,
      frameRate: 7,
      animationLoops: true
    },
    [FishSizeCategory.LARGE]: {
      scale: 0.5, // Updated to 0.5
      depth: 7,
      frameRate: 6,
      animationLoops: true
    }
  };

  /**
   * Get the size category of a fish based on its type
   * @param fishType The type of fish
   * @returns The size category (small, medium, large)
   */
  public static getFishSizeCategory(fishType: FishType): FishSizeCategory {
    // Special cases for large fish
    if (
      fishType === FishType.shark_whale ||
      fishType === FishType.shark_greatwhite ||
      fishType === FishType.shark_hammerhead ||
      fishType === FishType.shark_saw ||
      fishType === FishType.manta_ray ||
      fishType === FishType.ocean_sunfish
    ) {
      return FishSizeCategory.LARGE;
    }

    // Medium-sized fish
    if (
      fishType === FishType.swordfish ||
      fishType === FishType.oarfish ||
      fishType === FishType.giant_tevally ||
      fishType === FishType.mahi_mahi ||
      fishType === FishType.halibut
    ) {
      return FishSizeCategory.MEDIUM;
    }

    // All other fish are small
    return FishSizeCategory.SMALL;
  }

  /**
   * Create a fish image
   * @param scene The scene to add the fish to
   * @param x X position
   * @param y Y position
   * @param fishType Type of fish to create
   * @param state Fish state (normal, caught, escaped)
   * @returns The created fish image
   */
  public static createFish(
    scene: Phaser.Scene,
    x: number,
    y: number,
    fishType: FishType,
    state: FishState = FishState.NORMAL
  ): Phaser.GameObjects.Image {
    // Validate fishType parameter
    if (!fishType) {
      console.error('FishFactory.createFish: fishType is null or undefined, using default bass');
      fishType = FishType.bass;
    }

    // Determine if this fish has variants
    const variants = fishVariants[fishType];
    let fishKey = `fish-${fishType}`;
    let variant: string | undefined;

    // If this fish has variants, randomly select one
    if (variants && variants.length > 0) {
      variant = variants[Math.floor(Math.random() * variants.length)];
      // Use the variant-specific image key
      fishKey = `fish-${fishType}-${variant}`;

    }

    // Get fish size category and properties
    const sizeCategory = this.getFishSizeCategory(fishType);
    const properties = this.fishProperties[sizeCategory];

    // Get the actual fish dimensions from fishSizes with fallback
    const fishDimensions = fishSizes[fishType] || { width: 16, height: 16 };

    // Log warning if fish dimensions are missing
    if (!fishSizes[fishType]) {
      console.warn(`Fish dimensions not found for ${fishType}, using default 16x16`);
    }

    // Create the fish image with the correct origin based on dimensions
    // This ensures the fish is properly centered regardless of its dimensions
    const fish = scene.add.image(x, y, fishKey)
      .setScale(properties.scale)
      .setDepth(properties.depth);

    // For special cases like shark_whale (48x16), adjust the origin
    // to ensure the fish is properly centered
    if (fishDimensions.width !== 16 || fishDimensions.height !== 16) {

    }

    // Apply visual effects based on state
    switch (state) {
      case FishState.CAUGHT:
        // Add a slight green tint for caught fish
        fish.setTint(0xccffcc);
        break;
      case FishState.ESCAPED:
        // Add a slight red tint for escaped fish
        fish.setTint(0xffcccc);
        break;
      case FishState.NORMAL:
      default:
        // No tint for normal state
        fish.clearTint();
        break;
    }

    // Make sure the fish is only visible to the main camera
    const cameras = scene.cameras.cameras;
    for (let i = 1; i < cameras.length; i++) {
      const camera = cameras[i];
      if (camera && camera !== scene.cameras.main) {
        camera.ignore(fish);
      }
    }

    return fish;
  }

  /**
   * Update fish appearance based on state
   * @param fish The fish image to update
   * @param state The new state to apply
   */
  public static updateFishState(
    fish: Phaser.GameObjects.Image,
    state: FishState
  ): void {
    // Apply visual effects based on state
    switch (state) {
      case FishState.CAUGHT:
        // Add a slight green tint for caught fish
        fish.setTint(0xccffcc);
        // Add a small scale effect
        fish.setScale(fish.scaleX * 1.1, fish.scaleY * 1.1);
        break;
      case FishState.ESCAPED:
        // Add a slight red tint for escaped fish
        fish.setTint(0xffcccc);
        // Add a small rotation effect
        fish.setAngle(15);
        break;
      case FishState.NORMAL:
      default:
        // Reset to normal appearance
        fish.clearTint();
        fish.setAngle(0);
        break;
    }
  }

  /**
   * Update the fish image to reflect a different state
   * @param fish The fish image to update
   * @param state The new state to apply
   */
  public static updateFishAnimation(
    fish: Phaser.GameObjects.Image,
    state: FishState
  ): void {
    this.updateFishState(fish, state);
  }

  /**
   * Load fish assets for a specific fish type
   * @param scene The scene to load assets in
   * @param fishType The type of fish to load
   */
  public static loadFishAssets(scene: Phaser.Scene, fishType: FishType): void {
    // Determine if this fish has variants
    const variants = fishVariants[fishType];

    // If this fish has variants, load each variant
    if (variants && variants.length > 0) {
      variants.forEach(variant => {
        const fishKey = `fish-${fishType}-${variant}`;
        const fishPath = getFishPath(fishType, variant);


        scene.load.image(fishKey, fishPath);

        // For shark pattern fish, also load inventory version
        if (isSharkPattern(fishType)) {
          const inventoryKey = `fish-${fishType}-${variant}-inventory`;
          const inventoryPath = getFishInventoryPath(fishType, variant);


          scene.load.image(inventoryKey, inventoryPath);
        }
      });
    } else {
      // Load the base fish
      const fishKey = `fish-${fishType}`;
      const fishPath = getFishPath(fishType);

      scene.load.image(fishKey, fishPath);

      // For shark pattern fish, also load inventory version
      if (isSharkPattern(fishType)) {
        const inventoryKey = `fish-${fishType}-inventory`;
        const inventoryPath = getFishInventoryPath(fishType);
        scene.load.image(inventoryKey, inventoryPath);
      }
    }
  }

  /**
   * Load all fish assets
   * @param scene The scene to load assets in
   */
  public static loadAllFishAssets(scene: Phaser.Scene): void {
    // Load all fish types
    Object.values(FishType).forEach(fishType => {
      this.loadFishAssets(scene, fishType as FishType);
    });
  }

  /**
   * Get a random fish type based on rarity
   * @param rarityRate Chance of getting a rare fish (0-1)
   * @returns A random fish type
   */
  public static getRandomFishType(rarityRate: number = 0.3): FishType {
    // Define fish rarity tiers
    const commonFish: FishType[] = [
      FishType.bass, FishType.cod, FishType.herring, FishType.mackerel,
      FishType.guppy, FishType.pompano, FishType.rainbow_fish
    ];

    const uncommonFish: FishType[] = [
      FishType.clown_fish, FishType.butterfly_fish, FishType.parrot_fish,
      FishType.pirana, FishType.loach, FishType.sea_horse
    ];

    const rareFish: FishType[] = [
      FishType.shark_greatwhite, FishType.shark_hammerhead, FishType.shark_whale,
      FishType.manta_ray, FishType.swordfish, FishType.oarfish,
      FishType.ocean_sunfish, FishType.lion_fish, FishType.blobfish
    ];

    // Determine which tier to select from based on rarity rate
    const rand = Math.random();
    if (rand < rarityRate * 0.5) {
      // Very rare fish (half of the rare chance)
      return rareFish[Math.floor(Math.random() * rareFish.length)];
    } else if (rand < rarityRate) {
      // Uncommon fish
      return uncommonFish[Math.floor(Math.random() * uncommonFish.length)];
    } else {
      // Common fish
      return commonFish[Math.floor(Math.random() * commonFish.length)];
    }
  }
}

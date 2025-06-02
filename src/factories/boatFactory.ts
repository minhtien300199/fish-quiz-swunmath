import 'phaser';

// Define boat types
export enum BoatType {
  SMALL = 'small_boat',
  YELLOW = 'fishing_boat_yellow',
  BLUE = 'fishing_boat_blue'
}

// Define boat directions based on frame order
export enum BoatDirection {
  EAST = 0,       // 3:00 PM - First frame
  NORTHEAST = 1,  // 1:30 PM - Second frame
  NORTH = 2,      // 12:00 PM - Third frame
  NORTHWEST = 3,  // 10:30 AM - Fourth frame
  WEST = 4,       // 9:00 AM - Fifth frame
  SOUTHWEST = 5,  // 7:30 AM - Sixth frame
  SOUTH = 6,      // 6:00 AM - Seventh frame
  SOUTHEAST = 7   // 4:30 AM - Eighth frame
}

// Boat properties interface
interface BoatProperties {
  speed: number;
  scale: number;
}

export class BoatFactory {
  // Boat properties by type
  private static readonly boatProperties: Record<BoatType, BoatProperties> = {
    [BoatType.SMALL]: {
      speed: 300,
      scale: 0.8
    },
    [BoatType.YELLOW]: {
      speed: 250,
      scale: 1.0
    },
    [BoatType.BLUE]: {
      speed: 200,
      scale: 1.0
    }
  };

  /**
   * Create a boat sprite
   * @param scene The scene to add the boat to
   * @param x X position
   * @param y Y position
   * @param boatType Type of boat to create
   * @returns The created boat sprite
   */
  public static createBoat(
    scene: Phaser.Scene,
    x: number,
    y: number,
    boatType: BoatType = BoatType.BLUE
  ): Phaser.Physics.Arcade.Sprite {
    // Create the boat sprite
    const boat = scene.physics.add.sprite(x, y, `boat-${boatType}`);

    // Set initial frame (EAST direction - 3 o'clock)
    boat.setFrame(BoatDirection.EAST);

    // Apply properties based on boat type
    const properties = this.boatProperties[boatType];
    boat.setScale(properties.scale);

    // Enable physics
    scene.physics.world.enable(boat);
    boat.setCollideWorldBounds(true);

    return boat;
  }

  /**
   * Update boat direction based on velocity
   * @param boat The boat sprite to update
   * @param velocityX X velocity component
   * @param velocityY Y velocity component
   */
  public static updateBoatDirection(
    boat: Phaser.Physics.Arcade.Sprite,
    velocityX: number,
    velocityY: number
  ): void {
    // Only update direction if the boat is moving
    if (velocityX === 0 && velocityY === 0) return;

    // Calculate angle in radians from velocity
    const angle = Math.atan2(velocityY, velocityX);

    // Convert to degrees (0-360)
    let degrees = (angle * 180 / Math.PI) % 360;
    if (degrees < 0) degrees += 360;

    // Map degrees to one of 8 directions (each covering 45 degrees)
    // Starting from EAST (0 degrees) and going clockwise
    let direction: BoatDirection;

    // Map movement angle to the correct frame based on the specified order
    if (degrees >= 337.5 || degrees < 22.5) {
      direction = BoatDirection.EAST;       // 3:00 PM - Right
    } else if (degrees >= 22.5 && degrees < 67.5) {
      direction = BoatDirection.SOUTHEAST;  // 4:30 PM - Down-Right
    } else if (degrees >= 67.5 && degrees < 112.5) {
      direction = BoatDirection.SOUTH;      // 6:00 PM - Down
    } else if (degrees >= 112.5 && degrees < 157.5) {
      direction = BoatDirection.SOUTHWEST;  // 7:30 PM - Down-Left
    } else if (degrees >= 157.5 && degrees < 202.5) {
      direction = BoatDirection.WEST;       // 9:00 PM - Left
    } else if (degrees >= 202.5 && degrees < 247.5) {
      direction = BoatDirection.NORTHWEST;  // 10:30 PM - Up-Left
    } else if (degrees >= 247.5 && degrees < 292.5) {
      direction = BoatDirection.NORTH;      // 12:00 PM - Up
    } else { // degrees >= 292.5 && degrees < 337.5
      direction = BoatDirection.NORTHEAST;  // 1:30 PM - Up-Right
    }

    // Set the frame based on direction
    boat.setFrame(direction);
  }

  /**
   * Get the speed of a specific boat type
   * @param boatType The boat type
   * @returns The boat's speed
   */
  public static getBoatSpeed(boatType: BoatType): number {
    return this.boatProperties[boatType].speed;
  }
}

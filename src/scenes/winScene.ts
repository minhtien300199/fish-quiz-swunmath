import { GameState } from '../types/gameState';
import { FishType, getFishPath } from '../const/fishType';

export class WinScene extends Phaser.Scene {
  private gameState!: GameState;
  private completionTitle!: string;

  constructor() {
    super({ key: 'WinScene' });
  }

  init(data: { gameState: GameState, completionTitle: string }): void {
    this.gameState = data.gameState;
    this.completionTitle = data.completionTitle || 'Easy';
  }

  preload(): void {
    // Load boat spritesheet to get the idle frame (frame 0)
    this.load.spritesheet('boat-fishing_boat_blue', 'assets/boats/fishing_boat_blue/all_sprites.png', {
      frameWidth: 32,
      frameHeight: 32
    });

    // Load fish assets for the caught fish in the current run only
    this.gameState.currentRunFish.forEach((fishType: string) => {
      const fishPath = getFishPath(fishType as FishType);
      this.load.image(`fish-${fishType}`, fishPath);
    });
  }

  create(): void {
    // Add a background
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.7
    );

    // Add a congratulations message
    const titleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 4,
      `Congratulations!`,
      {
        fontSize: '48px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    ).setOrigin(0.5);

    // Add boat idle frame (frame 0 from spritesheet)
    const boatAsset = this.add.image(
      this.cameras.main.width / 2,
      titleText.y + titleText.height + 60,
      'boat-fishing_boat_blue',
      0 // Use frame 0 (idle/east direction)
    );
    boatAsset.setScale(2.5); // Smaller boat for better proportion
    boatAsset.setOrigin(0.5);

    // Add wave animation to the boat
    this.tweens.add({
      targets: boatAsset,
      y: boatAsset.y - 10, // Move up 10 pixels
      duration: 1500, // 1.5 seconds
      ease: 'Sine.easeInOut',
      yoyo: true, // Return to original position
      repeat: -1 // Repeat forever
    });

    // Add "Fish caught this run:" text (moved up)
    const fishLabelText = this.add.text(
      this.cameras.main.width / 2,
      boatAsset.y + boatAsset.displayHeight / 2 + 30, // Reduced spacing from 50 to 30
      'Fish caught this run:',
      {
        fontSize: '28px',
        color: '#00ffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Display fish assets that were caught
    this.displayCaughtFishAssets(fishLabelText.y + fishLabelText.height + 20); // Reduced spacing from 30 to 20

    // Add score below fish assets (moved up)
    const scoreText = this.add.text(
      this.cameras.main.width / 2,
      fishLabelText.y + fishLabelText.height + 120, // Reduced spacing from 150 to 120
      `Total Score: ${this.gameState.score}`,
      {
        fontSize: '28px',
        color: '#ffffff',
        align: 'center',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Add a restart button (moved up)
    const restartButton = this.add.rectangle(
      this.cameras.main.width / 2 - 120,
      scoreText.y + scoreText.height + 40, // Reduced spacing from 60 to 40
      200,
      60,
      0x0066ff,
      1
    ).setInteractive();

    // Add restart button text
    const restartButtonText = this.add.text(
      restartButton.x,
      restartButton.y,
      'Play Again',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Add restart button hover effect
    restartButton.on('pointerover', () => {
      restartButton.setFillStyle(0x0088ff);
      restartButtonText.setColor('#ffff00');
    });

    restartButton.on('pointerout', () => {
      restartButton.setFillStyle(0x0066ff);
      restartButtonText.setColor('#ffffff');
    });

    // Add restart button click event
    restartButton.on('pointerdown', () => {
      // Restart the game with a fresh state
      this.scene.start('GameScene', { reset: true });
    });

    // Add a main menu button (moved up)
    const menuButton = this.add.rectangle(
      this.cameras.main.width / 2 + 120,
      scoreText.y + scoreText.height + 40, // Reduced spacing from 60 to 40
      200,
      60,
      0x00aa66,
      1
    ).setInteractive();

    // Add menu button text
    const menuButtonText = this.add.text(
      menuButton.x,
      menuButton.y,
      'Main Menu',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Add menu button hover effect
    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0x00cc88);
      menuButtonText.setColor('#ffff00');
    });

    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0x00aa66);
      menuButtonText.setColor('#ffffff');
    });

    // Add menu button click event
    menuButton.on('pointerdown', () => {
      // Return to the main menu
      this.scene.start('MenuScene');
    });
  }

  private displayCaughtFishAssets(startY: number): void {
    const fishPerRow = 6; // Number of fish to show per row
    const fishSize = 60; // Size for each fish
    const fishSpacing = fishSize + 10; // Space between fish
    const rowSpacing = fishSize + 20; // Space between rows

    // Get unique fish types caught in this run
    const uniqueFishTypes = [...new Set(this.gameState.currentRunFish)];

    if (uniqueFishTypes.length === 0) {
      // Show "No fish caught" if somehow no fish were caught
      this.add.text(
        this.cameras.main.width / 2,
        startY + 30,
        'No fish caught',
        {
          fontSize: '20px',
          color: '#999999',
          fontStyle: 'italic'
        }
      ).setOrigin(0.5);
      return;
    }

    // Calculate starting position to center the fish grid
    const totalRows = Math.ceil(uniqueFishTypes.length / fishPerRow);

    uniqueFishTypes.forEach((fishType: string, index: number) => {
      const row = Math.floor(index / fishPerRow);
      const col = index % fishPerRow;
      const fishInThisRow = Math.min(fishPerRow, uniqueFishTypes.length - row * fishPerRow);

      // Center each row
      const rowStartX = this.cameras.main.width / 2 - (fishInThisRow * fishSpacing - 10) / 2;

      const fishX = rowStartX + col * fishSpacing;
      const fishY = startY + row * rowSpacing;

      // Create fish image
      const fishImage = this.add.image(fishX, fishY, `fish-${fishType}`);
      fishImage.setScale(0.5); // Updated to 0.5
      fishImage.setOrigin(0.5);

      // Add a subtle glow effect for the caught fish
      fishImage.setTint(0xffffff);

      // Optional: Add fish name on hover
      fishImage.setInteractive();
      fishImage.on('pointerover', () => {
        fishImage.setTint(0xffff88); // Highlight on hover
      });

      fishImage.on('pointerout', () => {
        fishImage.setTint(0xffffff); // Return to normal
      });
    });
  }
}

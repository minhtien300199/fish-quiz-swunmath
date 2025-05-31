import { GameState } from '../types/gameState';

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
      this.cameras.main.height / 3,
      `Congratulations!`,
      {
        fontSize: '48px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    ).setOrigin(0.5);

    // Add completion message
    const completionText = this.add.text(
      this.cameras.main.width / 2,
      titleText.y + titleText.height + 30,
      `You've caught all the fish for the ${this.completionTitle} level!`,
      {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    // Add stats
    const statsText = this.add.text(
      this.cameras.main.width / 2,
      completionText.y + completionText.height + 50,
      `Fish Caught: ${this.gameState.fishCaught}\nTotal Score: ${this.gameState.score}`,
      {
        fontSize: '28px',
        color: '#00ffff',
        align: 'center',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Add a restart button
    const restartButton = this.add.rectangle(
      this.cameras.main.width / 2 - 120, // Moved to the left to make room for menu button
      statsText.y + statsText.height + 80,
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
    
    // Add a main menu button
    const menuButton = this.add.rectangle(
      this.cameras.main.width / 2 + 120, // Positioned to the right of restart button
      statsText.y + statsText.height + 80,
      200,
      60,
      0x00aa66, // Different color to distinguish from restart button
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
}

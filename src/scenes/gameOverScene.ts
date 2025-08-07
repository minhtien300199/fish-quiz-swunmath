import { GameState } from '../types/gameState';
import { CursorManager } from '../managers/cursorManager';
// @ts-ignore
import gameSdk from '../service/apiService.js';

export class GameOverScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { gameState: GameState }): void {
    this.gameState = data.gameState;
  }

  create(): void {
    // Add background image - scale to fit the full screen
    const bg = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'game-over-bg'
    );

    // Scale the background to cover the full screen while maintaining aspect ratio
    const scaleX = this.cameras.main.width / bg.width;
    const scaleY = this.cameras.main.height / bg.height;
    const scale = Math.max(scaleX, scaleY); // Use the larger scale to ensure full coverage
    bg.setScale(scale);

    // Add game over text
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 3,
      'Game Over',
      {
        fontSize: '64px',
        color: '#ff0000',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    ).setOrigin(0.5);

    // Add score text
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `Score: ${this.gameState.score}`,
      {
        fontSize: '48px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    // Add fish caught text
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 80,
      `Fish Caught: ${this.gameState.fishCaught}`,
      {
        fontSize: '32px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setOrigin(0.5);

    // Add play again button
    const playAgainButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 180,
      250,
      60,
      0x333333
    ).setInteractive();

    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 180,
      'Play Again',
      {
        fontSize: '28px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Add hover effect
    playAgainButton.on('pointerover', () => {
      playAgainButton.setFillStyle(0x666666);
    });

    playAgainButton.on('pointerout', () => {
      playAgainButton.setFillStyle(0x333333);
    });

    // Add click event
    playAgainButton.on('pointerdown', () => {
      // Call startGame API before starting the game scene
      gameSdk.startGame(
        (result: any) => {
          console.log('Game started successfully:', result);
          this.scene.start('GameScene');
        },
        () => {
          console.error('Failed to start game');
          // Start game scene anyway to prevent blocking the user
          this.scene.start('GameScene');
        }
      );
    });

    // Add main menu button
    const mainMenuButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 260,
      250,
      60,
      0x333333
    ).setInteractive();

    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 260,
      'Main Menu',
      {
        fontSize: '28px',
        color: '#ffffff'
      }
    ).setOrigin(0.5);

    // Add hover effect
    mainMenuButton.on('pointerover', () => {
      mainMenuButton.setFillStyle(0x666666);
    });

    mainMenuButton.on('pointerout', () => {
      mainMenuButton.setFillStyle(0x333333);
    });

    // Add click event
    mainMenuButton.on('pointerdown', () => {
      this.scene.start('MenuScene');
    });

    // Initialize cursor management for this scene
    CursorManager.createCursor(this);
  }
}

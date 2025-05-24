import { GameState } from '../types/gameState';

export class GameOverScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { gameState: GameState }): void {
    this.gameState = data.gameState;
  }

  create(): void {
    // Add background
    this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x000000,
      0.8
    );
    
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
      this.scene.start('GameScene');
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
  }
}

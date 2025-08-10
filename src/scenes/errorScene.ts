import Phaser from 'phaser';

export class ErrorScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ErrorScene' });
  }

  preload(): void {
    // Error background should already be loaded in preloadScene
  }

  create(): void {
    // Add error background
    const background = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'errorBackground'
    );
    
    // Scale background to fit screen
    const scaleX = this.cameras.main.width / background.width;
    const scaleY = this.cameras.main.height / background.height;
    const scale = Math.max(scaleX, scaleY);
    background.setScale(scale).setScrollFactor(0);
    
    // Add error message
    const errorText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 50,
      'Failed to load questions from API',
      {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Add retry button
    const retryButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 20,
      200,
      60,
      0x3498db
    ).setInteractive();
    
    const retryText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 20,
      'Retry',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Add continue button below retry button
    const continueButton = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 100,
      200,
      60,
      0x27ae60
    ).setInteractive();
    
    const continueText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 100,
      'Continue',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);
    
    // Add subtitle text explaining the continue option
    const subtitleText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 140,
      'Play with offline questions',
      {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'italic',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center'
      }
    ).setOrigin(0.5);
    
    // Button hover effects
    retryButton.on('pointerover', () => {
      retryButton.fillColor = 0x2980b9;
    });
    
    retryButton.on('pointerout', () => {
      retryButton.fillColor = 0x3498db;
    });
    
    continueButton.on('pointerover', () => {
      continueButton.fillColor = 0x229954;
    });
    
    continueButton.on('pointerout', () => {
      continueButton.fillColor = 0x27ae60;
    });
    
    // Button click handlers
    retryButton.on('pointerdown', () => {
      // Restart preload scene to try loading questions again
      this.scene.start('PreloadScene');
    });
    
    continueButton.on('pointerdown', () => {
      // Continue to menu scene with fallback questions
      // This will use the fallback questions defined in QuizScene
      this.scene.start('MenuScene');
    });
    
  }
}

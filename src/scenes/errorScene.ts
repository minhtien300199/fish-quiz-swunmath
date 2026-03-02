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
      'Standard does not support this game. Please return to the Dashboard.',
      {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6,
        align: 'center'
      }
    ).setOrigin(0.5);
  }
}

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load loading screen assets
    this.load.image('loading-background', 'assets/ui_fishing_minigame/loading-background.png');
    this.load.image('loading-bar', 'assets/ui_fishing_minigame/loading-bar.png');
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}

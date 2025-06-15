export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Load hourglass loading bar assets first - these are needed for PreloadScene
    for (let i = 1; i <= 9; i++) {
      const frameNum = i.toString().padStart(4, '0');
      this.load.image(`hourglass_${frameNum}`, `assets/ui/control_ui/hourglass_${frameNum}.png`);
    }
  }

  create(): void {
    // Immediately start PreloadScene which will handle all loading with hourglass
    this.scene.start('PreloadScene');
  }
}

export class PreloadScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Create loading bar
    this.createLoadingBar();

    // Register loading progress event
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffffff, 1);
      this.progressBar.fillRect(
        this.cameras.main.width / 4,
        this.cameras.main.height / 2 - 16,
        (this.cameras.main.width / 2) * value,
        32
      );
    });

    // Register complete event
    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.loadingBar.destroy();
    });

    // Load all game assets
    this.loadAssets();
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private createLoadingBar(): void {
    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x222222, 0.8);
    this.loadingBar.fillRect(
      this.cameras.main.width / 4 - 2,
      this.cameras.main.height / 2 - 18,
      this.cameras.main.width / 2 + 4,
      36
    );
    this.progressBar = this.add.graphics();
  }

  private loadAssets(): void {
    // Load map
    this.load.image('map', 'assets/maps/first_map.png');

    // Load boats as spritesheets (8 frames for 8 directions)
    this.load.spritesheet('boat-fishing_boat_blue', 'assets/boats/fishing_boat_blue/full_boat.png', {
      frameWidth: 128, // Adjust these values based on your actual sprite dimensions
      frameHeight: 128
    });
    this.load.spritesheet('boat-fishing_boat_yellow', 'assets/boats/fishing_boat_yellow/full_boat.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('boat-small_boat', 'assets/boats/small_boat/full_boat.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.image('all-boats', 'assets/boats/all_full_boats.png');

    // Load fish (we'll load a few for now, can add more as needed)
    this.load.image('all-fish', 'assets/fish/all_fish.png');
    
    // Load common fish types
    const fishTypes = [
      'bass', 'clown_fish', 'cod', 'guppy', 'herring', 
      'mackerel', 'pike', 'puffer_fish', 'rainbow_fish'
    ];
    
    fishTypes.forEach(fishType => {
      this.load.image(`fish-${fishType}`, `assets/fish/${fishType}/${fishType}.png`);
    });

    // Load fishing equipment
    this.load.image('fishing-rod', 'assets/fishing_rods/fishing_rod.png');
    this.load.image('floater', 'assets/floaters/floater.png');
    this.load.image('lure', 'assets/lure/lure.png');
    
    // Load UI elements
    this.load.image('button', 'assets/ui_fishing_minigame/button.png');
    this.load.image('panel', 'assets/ui_fishing_minigame/panel.png');
    this.load.image('life-icon', 'assets/ui_fishing_minigame/life.png');
    
    // Load character animations
    this.load.image('character-fishing', 'assets/character/tool_fishing_rod_throw/tool_fishing_rod_throw.png');
    this.load.image('character-pull', 'assets/character/tool_fishing_rod_pull/tool_fishing_rod_pull.png');
    this.load.image('character-reel', 'assets/character/tool_fishing_rod_reel/tool_fishing_rod_reel.png');
    this.load.image('character-catch', 'assets/character/tool_fishing_rod_catch/tool_fishing_rod_catch.png');
  }
}

import { GameState } from '../types/gameState';

export class UIScene extends Phaser.Scene {
  private livesText!: Phaser.GameObjects.Text;
  private livesIcons: Phaser.GameObjects.Image[] = [];
  private fishCaughtText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private coordsText!: Phaser.GameObjects.Text;
  private gameScene!: Phaser.Scene;
  private playerRef!: Phaser.Physics.Arcade.Sprite;
  private fullscreenButton!: Phaser.GameObjects.Rectangle;
  private fullscreenText!: Phaser.GameObjects.Text;
  private gameState: GameState = {
    lives: 3,
    fishCaught: 0,
    score: 0,
    caughtFishTypes: []
  };
  private completionData: any = null;

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: any): void {
    this.gameScene = this.scene.get('GameScene');
    this.playerRef = data.player;
    this.gameState = data.gameState;
    this.completionData = data.completionData;
  }

  create(): void {
    // Add a semi-transparent black background for the UI
    const bgWidth = 350;
    const bgHeight = 220; // Increased height to accommodate fullscreen button
    const bg = this.add.rectangle(10, 10, bgWidth, bgHeight, 0x000000, 0.8)
      .setOrigin(0, 0) // Position from top-left
      .setStrokeStyle(3, 0xffffff, 0.5); // Add white border for better visibility

    // Create lives display with larger text
    this.livesText = this.add.text(30, 25, 'Lives:', {
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 8
    });

    // Add life icons with larger scale
    const iconStartX = this.livesText.x + this.livesText.width + 25;
    for (let i = 0; i < this.gameState.lives; i++) {
      const lifeIcon = this.add.image(
        iconStartX + (i * 50),
        this.livesText.y + this.livesText.height / 2,
        'life-icon'
      ).setScale(1.0); // Larger scale for better visibility

      this.livesIcons.push(lifeIcon);
    }

    // Create fish caught display
    this.fishCaughtText = this.add.text(
      30,
      this.livesText.y + this.livesText.height + 15,
      `Fish Caught: ${this.gameState.fishCaught}`,
      {
        fontSize: '36px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 8
      }
    );

    // Create progress text
    this.progressText = this.add.text(
      30,
      this.fishCaughtText.y + this.fishCaughtText.height + 15,
      'Progress: 0%',
      {
        fontSize: '32px',
        color: '#ffff00', // Yellow color for better visibility
        stroke: '#000000',
        strokeThickness: 8
      }
    );

    // Create coordinates display
    this.coordsText = this.add.text(
      30,
      this.progressText.y + this.progressText.height + 15,
      `X: 0, Y: 0`,
      {
        fontSize: '32px',
        color: '#ffff00', // Yellow color for better visibility
        stroke: '#000000',
        strokeThickness: 8
      }
    );

    // Create fullscreen button
    this.fullscreenButton = this.add.rectangle(
      bgWidth / 2 + 10, // Center of the UI panel
      this.coordsText.y + this.coordsText.height + 25,
      200,
      40,
      0x00aa00, // Green color
      1
    ).setOrigin(0.5, 0).setInteractive();

    // Add button text
    this.fullscreenText = this.add.text(
      this.fullscreenButton.x,
      this.fullscreenButton.y + this.fullscreenButton.height / 2,
      'FULLSCREEN',
      {
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Add hover effects
    this.fullscreenButton.on('pointerover', () => {
      this.fullscreenButton.setFillStyle(0x00cc00); // Lighter green on hover
      this.fullscreenText.setColor('#ffff00'); // Yellow text on hover
    });

    this.fullscreenButton.on('pointerout', () => {
      this.fullscreenButton.setFillStyle(0x00aa00); // Back to original green
      this.fullscreenText.setColor('#ffffff'); // Back to white text
    });

    // Add click event to toggle fullscreen
    this.fullscreenButton.on('pointerdown', () => {
      if (this.scale.isFullscreen) {
        this.fullscreenText.setText('FULLSCREEN');
        this.scale.stopFullscreen();
      } else {
        this.fullscreenText.setText('EXIT FULLSCREEN');
        this.scale.startFullscreen();
      }
    });
  }

  update(): void {
    // Update game state from main scene
    if (this.gameScene && this.gameScene.data) {
      const gameState = this.gameScene.data.get('gameState');
      if (gameState) {
        this.gameState = gameState;
      }

      // Get completion data from game scene
      const completionData = this.gameScene.data.get('completionData');
      if (completionData) {
        this.completionData = completionData;
      }
    }

    // Update fish caught text
    this.fishCaughtText.setText(`Fish Caught: ${this.gameState.fishCaught}`);

    // Update lives icons
    for (let i = 0; i < this.livesIcons.length; i++) {
      this.livesIcons[i].setVisible(i < this.gameState.lives);
    }

    // Update progress text
    const totalFish = this.completionData?.TotalFish || 5;
    this.progressText.setText(`Progress: ${this.gameState.fishCaught}/${totalFish} fish`);

    // Update coordinates text with player position
    if (this.playerRef) {
      const x = Math.round(this.playerRef.x);
      const y = Math.round(this.playerRef.y);
      this.coordsText.setText(`X: ${x}, Y: ${y}`);
    }
  }
}

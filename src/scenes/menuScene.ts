export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Add background
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'map')
      .setScale(0.5)
      .setAlpha(0.5);

    // Add title
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 4,
      'Fish Quiz',
      {
        fontSize: '64px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    ).setOrigin(0.5);

    // Create buttons
    this.createButton(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'New Game',
      () => this.scene.start('GameScene')
    );

    this.createButton(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 80,
      'Leaderboard',
      () => this.showLeaderboard()
    );

    this.createButton(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 160,
      'Exit',
      () => this.exitGame()
    );

    // Add decorative fish images
    this.add.image(150, 150, 'fish-clown_fish').setScale(2);
    this.add.image(this.cameras.main.width - 150, 150, 'fish-rainbow_fish').setScale(2);
    this.add.image(150, this.cameras.main.height - 150, 'fish-bass').setScale(2);
    this.add.image(this.cameras.main.width - 150, this.cameras.main.height - 150, 'fish-puffer_fish').setScale(2);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    // Create button background
    const button = this.add.image(x, y, 'button')
      .setInteractive()
      .setScale(2);

    // Add text to button
    const buttonText = this.add.text(x, y, text, {
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);

    // Add hover effect
    button.on('pointerover', () => {
      button.setTint(0xcccccc);
    });

    button.on('pointerout', () => {
      button.clearTint();
    });

    // Add click event
    button.on('pointerdown', () => {
      button.setTint(0x999999);
    });

    button.on('pointerup', () => {
      button.clearTint();
      callback();
    });
  }

  private showLeaderboard(): void {
    // Placeholder for leaderboard functionality
    const leaderboardPanel = this.add.image(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'panel'
    ).setScale(4);

    const closeButton = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 200,
      'Close',
      {
        fontSize: '28px',
        color: '#ffffff',
        backgroundColor: '#222222',
        padding: { x: 20, y: 10 }
      }
    ).setOrigin(0.5)
      .setInteractive();

    closeButton.on('pointerup', () => {
      leaderboardPanel.destroy();
      closeButton.destroy();
    });
  }

  private exitGame(): void {
    // In a web context, we can't truly exit the game, but we can reload the page
    window.location.reload();
  }
}

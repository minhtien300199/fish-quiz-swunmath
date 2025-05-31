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
      () => this.scene.start('GameScene', { reset: true })
    );

    this.createButton(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 80,
      'How to Play',
      () => this.scene.start('HowToPlayScene')
    );

    this.createButton(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 160,
      'Leaderboard',
      () => this.showLeaderboard()
    );

    this.createButton(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 240,
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
    // Create container for the button
    const container = this.add.container(x, y);
    
    // Create button background using a rounded rectangle
    const buttonWidth = 250;
    const buttonHeight = 60;
    const buttonRadius = 15;
    const buttonColor = 0x4a6fa5; // Blue color
    const buttonColorHover = 0x5d8bc3; // Lighter blue for hover
    const buttonColorDown = 0x395780; // Darker blue for click
    
    // Create the button background
    const buttonBackground = this.add.graphics();
    buttonBackground.fillStyle(buttonColor, 1);
    buttonBackground.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    
    // Add a stroke around the button
    buttonBackground.lineStyle(2, 0xffffff, 0.8);
    buttonBackground.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    
    // Add text to button
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);
    
    // Add elements to container
    container.add([buttonBackground, buttonText]);
    
    // Make the container interactive
    container.setSize(buttonWidth, buttonHeight);
    container.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);
    
    // Store original button color for reference
    const originalButtonColor = buttonColor;
    
    // Add hover effect
    container.on('pointerover', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(buttonColorHover, 1);
      buttonBackground.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    });
    
    container.on('pointerout', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(originalButtonColor, 1);
      buttonBackground.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    });
    
    // Add click effect
    container.on('pointerdown', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(buttonColorDown, 1);
      buttonBackground.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    });
    
    container.on('pointerup', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(originalButtonColor, 1);
      buttonBackground.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
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

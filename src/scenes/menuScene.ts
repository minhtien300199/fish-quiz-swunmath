export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Add background
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'menu-background')
      .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

    // Add title
    this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 4,
      'Fish Quiz',
      {
        fontSize: '72px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 8,
        shadow: { color: '#000000', fill: true, offsetX: 2, offsetY: 2, blur: 8 }
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

    // Decorative fish removed as requested
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    // Create container for the button
    const container = this.add.container(x, y);
    
    // Create button background using a rounded rectangle
    const buttonWidth = 280;
    const buttonHeight = 70;
    const buttonRadius = 20;
    const buttonColor = 0x0066cc; // Deeper blue color
    const buttonColorHover = 0x0099ff; // Lighter blue for hover
    const buttonColorDown = 0x004080; // Darker blue for click
    
    // Create the button background
    const buttonBackground = this.add.graphics();
    buttonBackground.fillStyle(buttonColor, 1);
    buttonBackground.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    
    // Add a stroke around the button
    buttonBackground.lineStyle(2, 0xffffff, 0.8);
    buttonBackground.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, buttonRadius);
    
    // Add text to button
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#004080',
      strokeThickness: 2,
      shadow: { color: '#000000', fill: true, offsetX: 1, offsetY: 1, blur: 3 }
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

export class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create(): void {
    // Disable browser context menu on right-click
    this.game.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });

    // Add semi-transparent background
    this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'map')
      .setScale(0.5)
      .setAlpha(0.3);

    // Add panel background for better text readability
    const panel = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width * 0.8,
      this.cameras.main.height * 0.8,
      0x000000,
      0.7
    );

    // Add title
    this.add.text(
      this.cameras.main.width / 2,
      panel.y - panel.height / 2 + 50,
      'How To Play',
      {
        fontSize: '48px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 6
      }
    ).setOrigin(0.5);

    // Add instructions text
    const instructions = [
      "Welcome to Fish Quiz!",
      "",
      "OBJECTIVE:",
      "• Catch as many fish as you can and answer math questions correctly",
      "• Each correct answer earns you points",
      "• You have 3 lives - don't let them run out!",
      "",
      "CONTROLS:",
      "• Arrow Keys or WASD - Move your boat",
      "• Mouse Click & Hold - Move your boat towards mouse pointer",
      "• SPACE or Right-Click - Cast your fishing line",
      "• SPACE or Right-Click (when fish bites) - Reel in the fish",
      "• Mobile Fishing Button (Mobile/Tablet) - Cast and catch fish",
      "",
      "FISHING TIPS:",
      "• Watch for the bobber to move when a fish bites",
      "• React quickly to catch the fish before it gets away",
      "• Different fish are worth different point values",
      "",
      "GOOD LUCK AND HAVE FUN!"
    ];

    let y = panel.y - panel.height / 2 + 120;
    instructions.forEach(line => {
      const fontSize = line.startsWith("•") ? "24px" :
        line === "" ? "16px" :
          line.includes("OBJECTIVE:") || line.includes("CONTROLS:") || line.includes("FISHING TIPS:") || line.includes("GOOD LUCK") ? "32px" : "24px";

      const fontColor = line.startsWith("•") ? "#ccccff" :
        line.includes("OBJECTIVE:") || line.includes("CONTROLS:") || line.includes("FISHING TIPS:") ? "#ffcc00" :
          line.includes("GOOD LUCK") ? "#00ff00" : "#ffffff";

      this.add.text(
        this.cameras.main.width / 2,
        y,
        line,
        {
          fontSize: fontSize,
          color: fontColor,
          align: 'center',
          stroke: '#000000',
          strokeThickness: line === "" ? 0 : 2
        }
      ).setOrigin(0.5);

      y += line === "" ? 15 : (fontSize === "32px" ? 45 : 30);
    });

    // Add decorative fish images
    this.add.image(panel.x - panel.width / 2 + 80, panel.y - panel.height / 2 + 80, 'fish-clown_fish').setScale(1.5);
    this.add.image(panel.x + panel.width / 2 - 80, panel.y - panel.height / 2 + 80, 'fish-rainbow_fish').setScale(1.5);
    this.add.image(panel.x - panel.width / 2 + 80, panel.y + panel.height / 2 - 80, 'fish-bass').setScale(1.5);
    this.add.image(panel.x + panel.width / 2 - 80, panel.y + panel.height / 2 - 80, 'fish-puffer_fish').setScale(1.5);

    // Add back button
    this.createButton(
      this.cameras.main.width / 2,
      panel.y + panel.height / 2 + 50,
      'Back to Menu',
      () => this.scene.start('MenuScene')
    );
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
    buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);

    // Add a stroke around the button
    buttonBackground.lineStyle(2, 0xffffff, 0.8);
    buttonBackground.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);

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
    container.setInteractive(new Phaser.Geom.Rectangle(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight), Phaser.Geom.Rectangle.Contains);

    // Store original button color for reference
    const originalButtonColor = buttonColor;

    // Add hover effect
    container.on('pointerover', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(buttonColorHover, 1);
      buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
    });

    container.on('pointerout', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(originalButtonColor, 1);
      buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
    });

    // Add click effect
    container.on('pointerdown', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(buttonColorDown, 1);
      buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
    });

    container.on('pointerup', () => {
      buttonBackground.clear();
      buttonBackground.fillStyle(originalButtonColor, 1);
      buttonBackground.fillRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
      buttonBackground.lineStyle(2, 0xffffff, 0.8);
      buttonBackground.strokeRoundedRect(-buttonWidth / 2, -buttonHeight / 2, buttonWidth, buttonHeight, buttonRadius);
      callback();
    });
  }
}

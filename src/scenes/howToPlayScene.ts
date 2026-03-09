import { CursorManager } from '../managers/cursorManager';

export class HowToPlayScene extends Phaser.Scene {
  private htmlContainer: HTMLDivElement | null = null;

  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create(): void {
    // Clean up any existing HTML container
    this.disposeHtmlContainer();

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

    // Create HTML overlay for crisp text rendering
    this.createHtmlInstructions();

    // Add decorative fish images
    this.add.image(panel.x - panel.width / 2 + 80, panel.y - panel.height / 2 + 80, 'fish-golden_trout').setScale(0.5);
    this.add.image(panel.x + panel.width / 2 - 80, panel.y - panel.height / 2 + 80, 'fish-rainbow_fish').setScale(0.5);
    this.add.image(panel.x - panel.width / 2 + 80, panel.y + panel.height / 2 - 80, 'fish-bass').setScale(0.5);
    this.add.image(panel.x + panel.width / 2 - 80, panel.y + panel.height / 2 - 80, 'fish-puffer_fish').setScale(0.5);

    // Back button is created as DOM element inside createHtmlInstructions

    // Initialize cursor management for this scene
    CursorManager.createCursor(this);
  }

  private createHtmlInstructions(): void {
    // Get canvas position and size
    const canvas = this.game.canvas;
    const canvasRect = canvas.getBoundingClientRect();

    // Create HTML container
    this.htmlContainer = document.createElement('div');
    this.htmlContainer.style.position = 'fixed';
    this.htmlContainer.style.left = canvasRect.left + 'px';
    this.htmlContainer.style.top = canvasRect.top + 'px';
    this.htmlContainer.style.width = canvasRect.width + 'px';
    this.htmlContainer.style.height = canvasRect.height + 'px';
    this.htmlContainer.style.pointerEvents = 'none';
    this.htmlContainer.style.zIndex = '1000';
    this.htmlContainer.style.fontFamily = 'Arial, sans-serif';
    this.htmlContainer.style.color = '#ffffff';

    // Create content wrapper that fits within panel bounds but leaves space for button
    const contentWrapper = document.createElement('div');
    contentWrapper.style.position = 'absolute';
    contentWrapper.style.left = '10%';
    contentWrapper.style.top = '8%';
    contentWrapper.style.width = '80%';
    contentWrapper.style.height = '70%'; // Reduced to leave space for button below
    contentWrapper.style.overflowY = 'auto';
    contentWrapper.style.overflowX = 'hidden';
    contentWrapper.style.textAlign = 'center';
    contentWrapper.style.padding = '10px';
    contentWrapper.style.boxSizing = 'border-box';
    contentWrapper.style.pointerEvents = 'auto'; // Enable scroll interaction
    contentWrapper.style.cursor = 'none'; // Hide browser cursor to show game cursor
    // Custom scrollbar styling
    contentWrapper.style.cssText += `
      scrollbar-width: thin;
      scrollbar-color: rgba(255, 255, 255, 0.5) transparent;
    `;

    // Track mouse movement globally to update custom cursor position even over DOM elements
    const mouseMoveHandler = (event: MouseEvent) => {
      if (CursorManager.isActive() && this.scene.isActive()) {
        // Convert screen coordinates to game coordinates
        const canvasRect = canvas.getBoundingClientRect();
        const scaleX = this.cameras.main.width / canvasRect.width;
        const scaleY = this.cameras.main.height / canvasRect.height;
        
        const gameX = (event.clientX - canvasRect.left) * scaleX;
        const gameY = (event.clientY - canvasRect.top) * scaleY;
        
        // Update cursor position using CursorManager
        CursorManager.updatePosition(gameX, gameY);
      }
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    
    // Clean up listener when scene shuts down
    this.events.once('shutdown', () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
    });

    // Title
    const title = document.createElement('h1');
    title.textContent = 'How To Play';
    title.style.fontSize = 'clamp(24px, 5vh, 56px)';
    title.style.fontWeight = 'bold';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.textShadow = '3px 3px 6px #000000';
    contentWrapper.appendChild(title);

    // Instructions HTML with larger, more readable font sizes
    const instructionsHtml = `
      <div style="font-size: clamp(14px, 2.4vh, 28px); line-height: 1.5; text-align: left; display: inline-block; max-width: 95%;">
        <p style="font-size: clamp(16px, 2.6vh, 30px); text-align: center; margin: 8px 0 15px 0; font-weight: 500;">Welcome to Fish Quiz!</p>
        
        <p style="font-size: clamp(18px, 3.2vh, 36px); color: #ffcc00; font-weight: bold; margin: 18px 0 8px 0; text-shadow: 2px 2px 4px #000000;">OBJECTIVE:</p>
        <ul style="list-style: none; padding-left: 0; margin: 0; color: #ccccff;">
          <li style="margin-bottom: 8px;">• Catch as many fish as you can and answer math questions correctly</li>
          <li style="margin-bottom: 8px;">• Each correct answer earns you points</li>
          <li style="margin-bottom: 8px;">• You have 3 lives - don't let them run out!</li>
        </ul>
        
        <p style="font-size: clamp(18px, 3.2vh, 36px); color: #ffcc00; font-weight: bold; margin: 18px 0 8px 0; text-shadow: 2px 2px 4px #000000;">CONTROLS:</p>
        <ul style="list-style: none; padding-left: 0; margin: 0; color: #ccccff;">
          <li style="margin-bottom: 8px;">• Arrow Keys or WASD - Move your boat</li>
          <li style="margin-bottom: 8px;">• Mouse Click & Hold - Move your boat towards mouse pointer</li>
          <li style="margin-bottom: 8px;">• SPACE or Right-Click - Cast your fishing line</li>
          <li style="margin-bottom: 8px;">• SPACE or Right-Click (when fish bites) - Reel in the fish</li>
          <li style="margin-bottom: 8px;">• Mobile Fishing Button (Mobile/Tablet) - Cast and catch fish</li>
        </ul>
        
        <p style="font-size: clamp(18px, 3.2vh, 36px); color: #ffcc00; font-weight: bold; margin: 18px 0 8px 0; text-shadow: 2px 2px 4px #000000;">FISHING TIPS:</p>
        <ul style="list-style: none; padding-left: 0; margin: 0; color: #ccccff;">
          <li style="margin-bottom: 8px;">• Watch for the bobber to move when a fish bites</li>
          <li style="margin-bottom: 8px;">• React quickly to catch the fish before it gets away</li>
          <li style="margin-bottom: 8px;">• Different fish are worth different point values</li>
        </ul>
        
        <p style="font-size: clamp(18px, 3.4vh, 38px); color: #00ff00; font-weight: bold; margin: 20px 0 15px 0; text-align: center; text-shadow: 2px 2px 4px #000000;">GOOD LUCK AND HAVE FUN!</p>
      </div>
    `;
    
    contentWrapper.innerHTML += instructionsHtml;
    this.htmlContainer.appendChild(contentWrapper);

    // Create DOM back button below the content
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Menu';
    backButton.style.position = 'absolute';
    backButton.style.left = '50%';
    backButton.style.bottom = '4%';
    backButton.style.transform = 'translateX(-50%)';
    backButton.style.padding = '12px 40px';
    backButton.style.fontSize = 'clamp(16px, 2.5vh, 28px)';
    backButton.style.fontWeight = 'bold';
    backButton.style.color = '#ffffff';
    backButton.style.backgroundColor = '#4a6fa5';
    backButton.style.border = '2px solid rgba(255, 255, 255, 0.8)';
    backButton.style.borderRadius = '15px';
    backButton.style.cursor = 'none';
    backButton.style.pointerEvents = 'auto';
    backButton.style.transition = 'background-color 0.2s ease, transform 0.1s ease';
    backButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
    backButton.style.textShadow = '1px 1px 3px #000000';
    backButton.style.zIndex = '1001';

    backButton.addEventListener('mouseenter', () => {
      backButton.style.backgroundColor = '#5d8bc3';
      backButton.style.transform = 'translateX(-50%) scale(1.05)';
    });
    backButton.addEventListener('mouseleave', () => {
      backButton.style.backgroundColor = '#4a6fa5';
      backButton.style.transform = 'translateX(-50%) scale(1)';
    });
    backButton.addEventListener('mousedown', () => {
      backButton.style.backgroundColor = '#395780';
      backButton.style.transform = 'translateX(-50%) scale(0.97)';
    });
    backButton.addEventListener('mouseup', () => {
      backButton.style.backgroundColor = '#4a6fa5';
      backButton.style.transform = 'translateX(-50%) scale(1)';
    });
    backButton.addEventListener('click', () => {
      this.disposeHtmlContainer();
      this.scene.start('MenuScene');
    });

    this.htmlContainer.appendChild(backButton);
    document.body.appendChild(this.htmlContainer);

    // Handle window resize
    const resizeHandler = () => {
      if (this.htmlContainer) {
        const rect = canvas.getBoundingClientRect();
        this.htmlContainer.style.left = rect.left + 'px';
        this.htmlContainer.style.top = rect.top + 'px';
        this.htmlContainer.style.width = rect.width + 'px';
        this.htmlContainer.style.height = rect.height + 'px';
      }
    };
    window.addEventListener('resize', resizeHandler);
    this.events.once('shutdown', () => {
      window.removeEventListener('resize', resizeHandler);
    });
  }

  private disposeHtmlContainer(): void {
    if (this.htmlContainer && this.htmlContainer.parentNode) {
      this.htmlContainer.parentNode.removeChild(this.htmlContainer);
      this.htmlContainer = null;
    }
  }

  shutdown(): void {
    this.disposeHtmlContainer();
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

    // Add text to button with higher resolution for clarity
    const buttonText = this.add.text(0, 0, text, {
      fontSize: '28px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setResolution(4);

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

import { MusicManager } from '../managers/musicManager';
import { LeaderboardManager, LeaderboardEntry } from '../managers/leaderboardManager';
import { CursorManager } from '../managers/cursorManager';
import { JoystickManager } from '../managers/joystickManager';
// @ts-ignore
import gameSdk from '../service/apiService.js';
import { GameAttempRecord } from 'types/quiz.model';

export class MenuScene extends Phaser.Scene {
  private joystickManager: JoystickManager | null = null;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Initialize music manager and start background music
    MusicManager.init(this);
    MusicManager.startBackgroundMusic(this);

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

    // Create buttons with better vertical spacing and centering
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const buttonSpacing = 70; // Consistent with game menu spacing
    const startOffset = -140; // Start higher to center the button group

    this.createButton(
      centerX,
      centerY + startOffset,
      0x27ae60, // Green for New Game
      'New Game',
      () => {
        // Call startGame API before starting the game scene
        gameSdk.startGame(
          (result: any) => {
            console.log('Game started successfully:', result);
            let startInstanceData: GameAttempRecord = result;
            // Store the GameAttemptId for question submissions
            if (result && result.id) {
              window.GAME_ATTEMPT_ID = result.id;
              console.log('GameAttemptId stored:', result.id);
            }
            this.scene.start('GameScene', { reset: true });
          },
          () => {
            console.error('Failed to start game');
            // Start game scene anyway to prevent blocking the user
            this.scene.start('GameScene', { reset: true });
          }
        );
      }
    );

    this.createButton(
      centerX,
      centerY + startOffset + buttonSpacing,
      0x3498db, // Blue for Fish Collection
      'Fish Collection',
      () => this.scene.start('FishCollectionScene', { returnTo: 'MenuScene' })
    );

    this.createButton(
      centerX,
      centerY + startOffset + buttonSpacing * 2,
      0x9b59b6, // Purple for How to Play
      'How to Play',
      () => this.scene.start('HowToPlayScene')
    );

    this.createButton(
      centerX,
      centerY + startOffset + buttonSpacing * 3,
      0xe67e22, // Orange for Leaderboard
      'Leaderboard',
      () => this.showLeaderboard()
    );

    this.createButton(
      centerX,
      centerY + startOffset + buttonSpacing * 4,
      0xe74c3c, // Red for Exit
      'Exit',
      () => this.exitGame()
    );

    // Create sound toggle buttons in the top-right corner
    this.createSoundButtons();

    // Initialize custom cursor at the very end
    CursorManager.createCursor(this);

    // Initialize joystick manager for mobile devices
    this.joystickManager = new JoystickManager(this);

    // Decorative fish removed as requested
  }

  private createButton(x: number, y: number, color: number, text: string, callback: () => void): void {
    // Use Rectangle instead of complex graphics for consistent styling with game menu
    const button = this.add.rectangle(x, y, 250, 50, color);
    button.setStrokeStyle(2, 0xffffff, 0.3);
    button.setInteractive({ useHandCursor: true });

    const buttonText = this.add.text(x, y, text, {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Add hover effect with predefined colors
    button.on('pointerover', () => {
      let hoverColor = color;
      if (color === 0x27ae60) hoverColor = 0x2ecc71; // Green hover
      else if (color === 0x3498db) hoverColor = 0x5dade2; // Blue hover
      else if (color === 0xe67e22) hoverColor = 0xf39c12; // Orange hover
      else if (color === 0x9b59b6) hoverColor = 0x8e44ad; // Purple hover
      else if (color === 0xe74c3c) hoverColor = 0xc0392b; // Red hover

      button.setFillStyle(hoverColor);
    });

    button.on('pointerout', () => {
      button.setFillStyle(color);
    });

    button.on('pointerdown', () => {
      callback();
    });
  }

  private showLeaderboard(): void {
    // Create overlay that blocks all interaction with background elements
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    overlay.setDepth(1000);
    // Make overlay interactive to block all clicks behind modal
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains);

    // Create leaderboard container
    const leaderboardContainer = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2
    );
    leaderboardContainer.setDepth(1001);

    // Create background panel
    const panelWidth = 600;
    const panelHeight = 500;
    const leaderboardBg = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2c3e50, 0.95);
    leaderboardBg.setStrokeStyle(4, 0x3498db);
    
    // Add loading text that will be replaced when data loads
    const loadingText = this.add.text(0, 0, 'Loading leaderboard data...', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'italic'
    }).setOrigin(0.5);

    // Create title
    const title = this.add.text(0, -220, 'LEADERBOARD', {
      fontSize: '36px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);
    
    // Force refresh leaderboard data from API
    LeaderboardManager.refreshLeaderboard();
    
    // Get leaderboard data
    const leaderboard = LeaderboardManager.getLeaderboard();
    const stats = LeaderboardManager.getStats();

    // Create stats display
    const statsText = this.add.text(0, -180,
      `Total Players: ${stats.totalEntries} | Highest Score: ${stats.highestScore} | Average: ${stats.averageScore}`, {
      fontSize: '16px',
      color: '#bdc3c7',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create column headers
    const headerY = -140;
    const rankHeader = this.add.text(-250, headerY, 'RANK', {
      fontSize: '18px',
      color: '#f39c12',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const nameHeader = this.add.text(-120, headerY, 'PLAYER', {
      fontSize: '18px',
      color: '#f39c12',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const scoreHeader = this.add.text(50, headerY, 'SCORE', {
      fontSize: '18px',
      color: '#f39c12',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const fishHeader = this.add.text(150, headerY, 'FISH', {
      fontSize: '18px',
      color: '#f39c12',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const dateHeader = this.add.text(220, headerY, 'DATE', {
      fontSize: '18px',
      color: '#f39c12',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create separator line
    const separator = this.add.graphics();
    separator.lineStyle(2, 0xf39c12);
    separator.lineBetween(-280, -120, 280, -120);

    // Create entries
    const entryElements: Phaser.GameObjects.GameObject[] = [];

    // Function to display leaderboard entries
    const displayLeaderboard = () => {
      // Clear any existing entry elements
      entryElements.forEach(element => element.destroy());
      entryElements.length = 0;
      
      // Remove loading text if it exists
      if (loadingText) loadingText.destroy();
      
      const currentLeaderboard = LeaderboardManager.getLeaderboard();
      
      if (currentLeaderboard.length === 0) {
        // Show empty state
        const emptyText = this.add.text(0, -50,
          'No scores yet!\nPlay the game to set your first high score!', {
          fontSize: '20px',
          color: '#95a5a6',
          fontStyle: 'italic',
          align: 'center'
        }).setOrigin(0.5);
        entryElements.push(emptyText);
      } else {
        // Display leaderboard entries
        currentLeaderboard.forEach((entry: LeaderboardEntry, index: number) => {
          const entryY = -90 + (index * 35);

          // Rank with medal icons for top 3
          let rankText = entry.rank ? `${entry.rank}` : `${index + 1}`;
          let rankColor = '#ffffff';
          if (entry.rank === 1 || index === 0) {
            rankText = '🥇';
            rankColor = '#f1c40f';
          } else if (entry.rank === 2 || index === 1) {
            rankText = '🥈';
            rankColor = '#95a5a6';
          } else if (entry.rank === 3 || index === 2) {
            rankText = '🥉';
            rankColor = '#cd7f32';
          }

          const rank = this.add.text(-250, entryY, rankText, {
            fontSize: '16px',
            color: rankColor,
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Player name (truncate if too long)
          const displayName = entry.name.length > 12 ?
            entry.name.substring(0, 12) + '...' : entry.name;
          const name = this.add.text(-120, entryY, displayName, {
            fontSize: '14px',
            color: '#ecf0f1',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Score
          const score = this.add.text(50, entryY, entry.score.toString(), {
            fontSize: '14px',
            color: '#2ecc71',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Fish caught (may not be available from API)
          const fishText = entry.fishCaught ? entry.fishCaught.toString() : '-';
          const fish = this.add.text(150, entryY, fishText, {
            fontSize: '14px',
            color: '#3498db',
            fontStyle: 'bold'
          }).setOrigin(0.5);

          // Date (may not be available from API)
          let dateStr = 'N/A';
          if (entry.timestamp) {
            dateStr = new Date(entry.timestamp).toLocaleDateString([], {
              month: 'short',
              day: 'numeric'
            });
          }
          const date = this.add.text(220, entryY, dateStr, {
            fontSize: '12px',
            color: '#95a5a6'
          }).setOrigin(0.5);

          entryElements.push(rank, name, score, fish, date);

          // Add alternating row background
          if (index % 2 === 0) {
            const rowBg = this.add.rectangle(0, entryY, panelWidth - 20, 30, 0x34495e, 0.3);
            entryElements.push(rowBg); // Add to container later
          }
        });
      }
      
      // Add all elements to container
      leaderboardContainer.add(entryElements);
    };
    
    // Check for data after a short delay to allow API fetch to complete
    this.time.delayedCall(500, displayLeaderboard);

    // Create action buttons
    const buttonY = 180;

    // Close button
    const closeButton = this.add.graphics();
    closeButton.fillStyle(0x95a5a6);
    closeButton.fillRoundedRect(80, buttonY - 20, 120, 40, 8);
    closeButton.setInteractive(new Phaser.Geom.Rectangle(80, buttonY - 20, 120, 40), Phaser.Geom.Rectangle.Contains);

    const closeButtonText = this.add.text(140, buttonY, 'Close', {
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    closeButton.on('pointerover', () => {
      closeButton.clear();
      closeButton.fillStyle(0x7f8c8d);
      closeButton.fillRoundedRect(80, buttonY - 20, 120, 40, 8);
    });

    closeButton.on('pointerout', () => {
      closeButton.clear();
      closeButton.fillStyle(0x95a5a6);
      closeButton.fillRoundedRect(80, buttonY - 20, 120, 40, 8);
    });

    // Cleanup function
    const cleanup = () => {
      overlay.destroy();
      leaderboardContainer.destroy();
    };

    closeButton.on('pointerdown', cleanup);

    // Add all elements to container
    const containerElements = [
      leaderboardBg, title, statsText,
      rankHeader, nameHeader, scoreHeader, fishHeader, dateHeader,
      separator, closeButton, closeButtonText
    ];

    leaderboardContainer.add(containerElements);

    // Add ESC key to close
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (escKey) {
      const escHandler = () => {
        cleanup();
        escKey.off('down', escHandler);
      };
      escKey.on('down', escHandler);
    }
  }

  private exitGame(): void {
    // In a web context, we can't truly exit the game, but we can reload the page
    window.location.reload();
  }

  private createSoundButtons(): void {
    // Sound button configuration
    const buttonSize = 50;
    const buttonSpacing = 10;
    const rightMargin = 20;

    // Music toggle button
    const musicButtonX = this.cameras.main.width - buttonSize - rightMargin;
    const musicButtonY = 20;

    const musicButton = this.add.rectangle(
      musicButtonX, musicButtonY, buttonSize, buttonSize,
      MusicManager.isMusicOn() ? 0x27ae60 : 0xe74c3c, 0.8
    )
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });

    const musicIcon = this.add.text(
      musicButtonX + buttonSize / 2,
      musicButtonY + buttonSize / 2,
      '♪',
      {
        fontSize: '28px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    // Sound toggle button
    const soundButtonX = musicButtonX;
    const soundButtonY = musicButtonY + buttonSize + buttonSpacing;

    const soundButton = this.add.rectangle(
      soundButtonX, soundButtonY, buttonSize, buttonSize,
      MusicManager.isSoundOn() ? 0x27ae60 : 0xe74c3c, 0.8
    )
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setInteractive({ useHandCursor: true });

    const soundIcon = this.add.text(
      soundButtonX + buttonSize / 2,
      soundButtonY + buttonSize / 2,
      '🔊',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5);

    // Music button handlers
    musicButton.on('pointerover', () => {
      musicButton.setFillStyle(MusicManager.isMusicOn() ? 0x2ecc71 : 0xc0392b, 1.0);
      musicButton.setScale(1.05);
    });

    musicButton.on('pointerout', () => {
      musicButton.setFillStyle(MusicManager.isMusicOn() ? 0x27ae60 : 0xe74c3c, 0.8);
      musicButton.setScale(1.0);
    });

    musicButton.on('pointerdown', () => {
      const isMusicOn = MusicManager.toggleMusic();
      musicButton.setFillStyle(isMusicOn ? 0x27ae60 : 0xe74c3c, 0.8);


      // Play a feedback sound if sound is enabled
      if (MusicManager.isSoundOn()) {
        // We can add a button click sound here if available
        // MusicManager.playSound(this, 'button-click', { volume: 0.5 });
      }
    });

    // Sound button handlers
    soundButton.on('pointerover', () => {
      soundButton.setFillStyle(MusicManager.isSoundOn() ? 0x2ecc71 : 0xc0392b, 1.0);
      soundButton.setScale(1.05);
    });

    soundButton.on('pointerout', () => {
      soundButton.setFillStyle(MusicManager.isSoundOn() ? 0x27ae60 : 0xe74c3c, 0.8);
      soundButton.setScale(1.0);
    });

    soundButton.on('pointerdown', () => {
      const isSoundOn = MusicManager.toggleSound();
      soundButton.setFillStyle(isSoundOn ? 0x27ae60 : 0xe74c3c, 0.8);

    });

    // Add tooltips with delayed text display
    let musicTooltip: Phaser.GameObjects.Text | null = null;
    let soundTooltip: Phaser.GameObjects.Text | null = null;

    musicButton.on('pointerover', () => {
      musicTooltip = this.add.text(
        musicButtonX - 100,
        musicButtonY + buttonSize / 2,
        MusicManager.isMusicOn() ? 'Music: ON' : 'Music: OFF',
        {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 8, y: 4 }
        }
      ).setOrigin(1, 0.5);
    });

    musicButton.on('pointerout', () => {
      if (musicTooltip) {
        musicTooltip.destroy();
        musicTooltip = null;
      }
    });

    soundButton.on('pointerover', () => {
      soundTooltip = this.add.text(
        soundButtonX - 100,
        soundButtonY + buttonSize / 2,
        MusicManager.isSoundOn() ? 'Sound: ON' : 'Sound: OFF',
        {
          fontSize: '16px',
          color: '#ffffff',
          backgroundColor: '#000000',
          padding: { x: 8, y: 4 }
        }
      ).setOrigin(1, 0.5);
    });

    soundButton.on('pointerout', () => {
      if (soundTooltip) {
        soundTooltip.destroy();
        soundTooltip = null;
      }
    });
  }
}

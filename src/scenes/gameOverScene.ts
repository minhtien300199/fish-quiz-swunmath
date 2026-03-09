import { GameState } from '../types/gameState';
import { CursorManager } from '../managers/cursorManager';
import { StandardSettingManager } from '../managers/standardSettingManager';
import { LeaderboardManager, LeaderboardEntry } from '../managers/leaderboardManager';
// @ts-ignore
import gameSdk from '../service/apiService.js';

export class GameOverScene extends Phaser.Scene {
  private gameState!: GameState;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { gameState: GameState }): void {
    this.gameState = data.gameState;
  }

  create(): void {
    // Decrement remaining play times
    StandardSettingManager.decrementPlayTimes();
    const canReturn = StandardSettingManager.canReturnToDashboard();
    const remaining = StandardSettingManager.getRemainingPlayTimes();

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Add background image - scale to fit the full screen
    const bg = this.add.image(W / 2, H / 2, 'game-over-bg');
    const scaleX = W / bg.width;
    const scaleY = H / bg.height;
    bg.setScale(Math.max(scaleX, scaleY));

    // ---------- LEFT SIDE: Game result ----------
    const leftX = W * 0.3;

    // Add game over text
    this.add.text(leftX, H * 0.2, 'Game Over', {
      fontSize: '56px',
      color: '#ff0000',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 6
    }).setOrigin(0.5);

    // Add score text
    this.add.text(leftX, H * 0.38, `Score: ${this.gameState.score}`, {
      fontSize: '40px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Add fish caught text
    this.add.text(leftX, H * 0.48, `Fish Caught: ${this.gameState.fishCaught}`, {
      fontSize: '28px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setOrigin(0.5);

    // Remaining plays info
    if (remaining > 0) {
      // this.add.text(leftX, H - 80, `Remaining plays: ${remaining}`, {
      //   fontSize: '18px',
      //   color: '#f39c12',
      //   fontStyle: 'bold',
      //   stroke: '#000000',
      //   strokeThickness: 2
      // }).setOrigin(0.5);
    }

    // ---------- RIGHT SIDE: Leaderboard ----------
    this.createLeaderboardPanel(W * 0.72, 30, 380, H - 110);

    // ---------- BUTTONS at bottom ----------
    const buttonY = H - 40;
    const buttonW = 230;
    const buttonH = 60;

    if (canReturn) {
      // Show: Play Again | Return Dashboard
      // this.createButton(W / 2 - 130, buttonY, buttonW, buttonH, 0x0066ff, 'Play Again', () => this.handlePlayAgain());
      this.createButton(W / 2 + 130, buttonY, buttonW, buttonH, 0xe74c3c, 'Return Dashboard', () => this.handleReturnDashboard());
    } else {
      // Show: Play Again | Main Menu
      this.createButton(W / 2 - 130, buttonY, buttonW, buttonH, 0x0066ff, 'Play Again', () => this.handlePlayAgain());
      this.createButton(W / 2 + 130, buttonY, buttonW, buttonH, 0x00aa66, 'Main Menu', () => this.scene.start('MenuScene'));
    }

    // Initialize cursor management for this scene
    CursorManager.createCursor(this);
  }

  private createButton(x: number, y: number, w: number, h: number, color: number, label: string, onClick: () => void): void {
    const btn = this.add.rectangle(x, y, w, h, color, 1).setInteractive({ useHandCursor: true });
    const txt = this.add.text(x, y, label, { fontSize: '20px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);

    const hoverColor = Phaser.Display.Color.IntegerToColor(color).brighten(20).color;
    btn.on('pointerover', () => { btn.setFillStyle(hoverColor); txt.setColor('#ffff00'); });
    btn.on('pointerout', () => { btn.setFillStyle(color); txt.setColor('#ffffff'); });
    btn.on('pointerdown', onClick);
  }

  private handlePlayAgain(): void {
    gameSdk.startGame(
      (result: any) => {
        console.log('Game started successfully:', result);
        if (result && result.id) {
          window.GAME_ATTEMPT_ID = result.id;
        }
        this.scene.start('GameScene');
      },
      () => {
        console.error('Failed to start game');
        this.scene.start('GameScene');
      }
    );
  }

  private handleReturnDashboard(): void {
    // Send message to parent window
    window.parent.postMessage("returnDashboard", "*");
    
    // Try to communicate with parent window (iframe scenario)
    try {
      window.parent.postMessage({ type: 'GAME_COMPLETE', action: 'returnToDashboard' }, '*');
    } catch (e) {
      console.warn('Could not post message to parent:', e);
    }
    // Fallback: try to close the window or go back
    try {
      window.close();
    } catch (e) {
      window.history.back();
    }
  }

  private createLeaderboardPanel(x: number, y: number, w: number, h: number): void {
    // Panel background
    const panelBg = this.add.rectangle(x, y + h / 2, w, h, 0x2c3e50, 0.9);
    panelBg.setStrokeStyle(2, 0x3498db);

    // Title
    this.add.text(x, y + 25, 'LEADERBOARD', {
      fontSize: '24px',
      color: '#f1c40f',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Header row
    const headerY = y + 55;
    this.add.text(x - w / 2 + 20, headerY, '#', { fontSize: '14px', color: '#95a5a6', fontStyle: 'bold' });
    this.add.text(x - w / 2 + 50, headerY, 'Name', { fontSize: '14px', color: '#95a5a6', fontStyle: 'bold' });
    this.add.text(x + w / 2 - 20, headerY, 'Score', { fontSize: '14px', color: '#95a5a6', fontStyle: 'bold' }).setOrigin(1, 0);

    // Separator
    const sep = this.add.graphics();
    sep.lineStyle(1, 0x3498db, 0.5);
    sep.lineBetween(x - w / 2 + 15, headerY + 20, x + w / 2 - 15, headerY + 20);

    // Loading text
    const loadingText = this.add.text(x, y + h / 2, 'Loading...', {
      fontSize: '16px', color: '#ffffff', fontStyle: 'italic'
    }).setOrigin(0.5);

    // Fetch leaderboard
    LeaderboardManager.refreshLeaderboard();

    // Display after delay to allow API fetch
    this.time.delayedCall(600, () => {
      loadingText.destroy();
      const entries = LeaderboardManager.getLeaderboard();

      if (entries.length === 0) {
        this.add.text(x, y + h / 2, 'No scores yet!', {
          fontSize: '16px', color: '#999999', fontStyle: 'italic'
        }).setOrigin(0.5);
        return;
      }

      entries.slice(0, 10).forEach((entry: LeaderboardEntry, index: number) => {
        const entryY = headerY + 30 + index * 30;
        const rankColors = ['#f1c40f', '#95a5a6', '#cd7f32'];
        const rankColor = index < 3 ? rankColors[index] : '#ecf0f1';
        const medals = ['🥇', '🥈', '🥉'];
        const rankLabel = index < 3 ? medals[index] : `${index + 1}`;

        this.add.text(x - w / 2 + 20, entryY, rankLabel, { fontSize: '14px', color: rankColor });
        this.add.text(x - w / 2 + 50, entryY, entry.name || 'Anonymous', {
          fontSize: '14px', color: '#ecf0f1'
        });
        this.add.text(x + w / 2 - 20, entryY, `${entry.score}`, {
          fontSize: '14px', color: rankColor, fontStyle: 'bold'
        }).setOrigin(1, 0);
      });
    });
  }
}

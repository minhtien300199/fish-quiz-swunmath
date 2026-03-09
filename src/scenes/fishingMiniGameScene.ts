import { CursorManager } from '../managers/cursorManager';
import { FishType } from '../const/fishType';
import { GameState } from '../types/gameState';

export class FishingMiniGameScene extends Phaser.Scene {
  private gameState!: GameState;
  private currentFish!: FishType;

  // UI elements
  private bgFrames: Phaser.GameObjects.Image[] = [];
  private currentBgFrame: number = 0;
  private bgAnimTimer!: Phaser.Time.TimerEvent;

  private fishBar!: Phaser.GameObjects.Image;
  private fishIcon!: Phaser.GameObjects.Image;
  private progressBar!: Phaser.GameObjects.Image;

  // Game mechanics
  private fishX: number = 0;           // Fish position normalized 0..1
  private fishDirection: number = 1;    // 1 = right, -1 = left
  private fishSpeed: number = 0.3;     // Normalized units per second

  private catchZoneX: number = 0.5;    // Catch zone center normalized 0..1
  private catchZoneHalfW: number = 0.12; // Half-width of catch zone (normalized)

  private progress: number = 0;        // 0..1
  private progressFrame: number = 1;
  private readonly TOTAL_PROGRESS_FRAMES = 74;
  private readonly FILL_DURATION = 3;   // seconds of overlap to fill bar
  private readonly DRAIN_RATE = 0.12;   // drain per second when not overlapping

  private timeRemaining: number = 10;
  private timerText!: Phaser.GameObjects.Text;
  private countdownTimer!: Phaser.Time.TimerEvent;

  private spaceKey!: Phaser.Input.Keyboard.Key;
  private isComplete: boolean = false;

  // Layout helpers (screen coords)
  private barLeft: number = 0;
  private barRight: number = 0;
  private barY: number = 0;
  private barWidth: number = 0;

  constructor() {
    super({ key: 'FishingMiniGameScene' });
  }

  init(data: any): void {
    this.gameState = data.gameState;
    this.currentFish = data.currentFish;
    this.isComplete = false;
    this.progress = 0;
    this.progressFrame = 1;
    this.timeRemaining = 10;
    this.fishX = 0;
    this.fishDirection = 1;
    this.catchZoneX = 0.5;
    this.bgFrames = [];
    this.currentBgFrame = 0;
  }

  create(): void {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Semi-transparent dark overlay
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setDepth(0);

    // ----- Pixel-art scale -----
    const SCALE = 5;

    // ----- Background animation frames (centered) -----
    const bgY = H / 2;
    for (let i = 1; i <= 4; i++) {
      const frame = this.add.image(W / 2, bgY, `minigame-bg-${i}`)
        .setScale(SCALE)
        .setVisible(i === 1)
        .setDepth(1);
      this.bgFrames.push(frame);
    }

    // Animate background (loop 1→4)
    this.bgAnimTimer = this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        this.bgFrames[this.currentBgFrame].setVisible(false);
        this.currentBgFrame = (this.currentBgFrame + 1) % 4;
        this.bgFrames[this.currentBgFrame].setVisible(true);
      }
    });

    // ----- Calculate active bar area inside the background -----
    const bgDisplayW = this.bgFrames[0].displayWidth;
    const bgDisplayH = this.bgFrames[0].displayHeight;
    // Start at the left edge of the background image
    this.barLeft = (W / 2) - (bgDisplayW * 0.50);
    this.barRight = (W / 2) + (bgDisplayW * 0.40) + 15;
    this.barWidth = this.barRight - this.barLeft;
    this.barY = bgY;

    // ----- Determine difficulty -----
    const difficulty = this.getDifficulty();

    // Overlap zone pixel widths (original pixel art) must match the fish_bar image widths
    const overlapPx = difficulty === 'easy' ? 38 : difficulty === 'medium' ? 22 : 16;
    this.catchZoneHalfW = (overlapPx * SCALE) / (2 * this.barWidth);

    switch (difficulty) {
      case 'easy':   this.fishSpeed = 0.28; break;
      case 'medium': this.fishSpeed = 0.38; break;
      case 'hard':   this.fishSpeed = 0.50; break;
    }

    // ----- Catch zone (fish bar) -----
    // Align origin to the visual center of the yellow bar within the sprite
    this.fishBar = this.add.image(this.barLeft + 0.5 * this.barWidth, this.barY, `minigame-fishbar-${difficulty}`)
      .setScale(SCALE)
      .setDepth(2);
    {
      const fw = this.fishBar.frame.width;
      const barStartPx = 4; // yellow bar starts ~4px from left edge in pixel art
      const barCenterPx = barStartPx + overlapPx / 2;
      this.fishBar.setOrigin(barCenterPx / fw, 0.5);
    }

    // ----- Fish icon -----
    // Align origin to the visual center of the fish body within the sprite
    this.fishIcon = this.add.image(this.barLeft, this.barY, 'minigame-fish')
      .setScale(SCALE)
      .setDepth(3);
    {
      const fw = this.fishIcon.frame.width;
      const fishCenterPx = 4; // fish body center ~4px from left edge in pixel art
      this.fishIcon.setOrigin(fishCenterPx / fw, 0.5);
    }

    // ----- Progress bar (below background) -----
    this.progressBar = this.add.image(W / 2, bgY + bgDisplayH * 0.5 + 30, 'minigame-progress-1')
      .setScale(SCALE)
      .setDepth(1);

    // ----- Timer text -----
    this.timerText = this.add.text(W / 2, bgY - bgDisplayH * 0.5 - 50, 'Time: 10', {
      fontSize: '36px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(10);

    // ----- Instruction text -----
    this.add.text(W / 2, bgY - bgDisplayH * 0.5 - 100, 'Hold SPACE to move the catch zone!', {
      fontSize: '28px',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // ----- Difficulty label -----
    this.add.text(W / 2, bgY + bgDisplayH * 0.5 + 80, `Difficulty: ${difficulty.toUpperCase()}`, {
      fontSize: '24px',
      color: difficulty === 'easy' ? '#00ff00' : difficulty === 'medium' ? '#ffaa00' : '#ff4444',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(10);

    // ----- Input -----
    if (this.input.keyboard) {
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    // ----- Countdown timer -----
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      repeat: 9,
      callback: () => {
        if (this.isComplete) return;
        this.timeRemaining--;
        this.timerText.setText(`Time: ${this.timeRemaining}`);
        if (this.timeRemaining <= 3) {
          this.timerText.setColor('#ff4444');
        }
        if (this.timeRemaining <= 0) {
          this.completeMiniGame(false);
        }
      }
    });

    // ----- Cursor -----
    CursorManager.createCursor(this);
  }

  update(_time: number, delta: number): void {
    if (this.isComplete) return;

    const dt = delta / 1000;

    // --- Move fish automatically (bouncing with random direction changes) ---
    this.fishX += this.fishSpeed * this.fishDirection * dt;

    if (this.fishX >= 1) {
      this.fishX = 1;
      this.fishDirection = -1;
    } else if (this.fishX <= 0) {
      this.fishX = 0;
      this.fishDirection = 1;
    }

    // Random direction flips for unpredictability
    if (Math.random() < 0.015) {
      this.fishDirection *= -1;
    }

    // --- Move catch zone based on SPACE key ---
    if (this.spaceKey && this.spaceKey.isDown) {
      this.catchZoneX += 0.7 * dt;
    } else {
      this.catchZoneX -= 0.35 * dt;
    }
    this.catchZoneX = Phaser.Math.Clamp(this.catchZoneX, 0, 1);

    // --- Check overlap ---
    const isCatching = Math.abs(this.fishX - this.catchZoneX) < this.catchZoneHalfW;

    // --- Update progress ---
    if (isCatching) {
      this.progress += (1 / this.FILL_DURATION) * dt;
    } else {
      this.progress -= this.DRAIN_RATE * dt;
    }
    this.progress = Phaser.Math.Clamp(this.progress, 0, 1);

    // --- Win check ---
    if (this.progress >= 1) {
      this.completeMiniGame(true);
      return;
    }

    // --- Update visuals ---

    // Fish position
    const fishScreenX = this.barLeft + this.fishX * this.barWidth;
    this.fishIcon.setX(fishScreenX);

    // Catch zone position
    const catchScreenX = this.barLeft + this.catchZoneX * this.barWidth;
    this.fishBar.setX(catchScreenX);

    // Progress bar frame
    const newFrame = Math.max(1, Math.min(this.TOTAL_PROGRESS_FRAMES,
      Math.ceil(this.progress * this.TOTAL_PROGRESS_FRAMES)));
    if (newFrame !== this.progressFrame) {
      this.progressFrame = newFrame;
      this.progressBar.setTexture(`minigame-progress-${this.progressFrame}`);
    }

    // Tint catch zone green when overlapping fish
    if (isCatching) {
      this.fishBar.setTint(0x88ff88);
    } else {
      this.fishBar.clearTint();
    }

    // Update cursor
    CursorManager.bringToTop();
  }

  // ----------------------------------------------------------------
  //  Helpers
  // ----------------------------------------------------------------

  private getDifficulty(): 'easy' | 'medium' | 'hard' {
    const roll = Math.random();
    if (roll < 0.40) return 'easy';
    if (roll < 0.75) return 'medium';
    return 'hard';
  }

  private completeMiniGame(success: boolean): void {
    if (this.isComplete) return;
    this.isComplete = true;

    // Stop timers
    if (this.bgAnimTimer) this.bgAnimTimer.remove();
    if (this.countdownTimer) this.countdownTimer.remove();

    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // Result text
    this.add.text(W / 2, H / 2 - 120, success ? 'CAUGHT!' : 'Fish Escaped!', {
      fontSize: '56px',
      color: success ? '#00ff00' : '#ff4444',
      stroke: '#000000',
      strokeThickness: 6,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(20);

    // Flash effect
    this.cameras.main.flash(300, success ? 0 : 255, success ? 255 : 0, 0);

    // Return to GameScene after a short delay
    this.time.delayedCall(1500, () => {
      const data = {
        success: success,
        timeBonus: success ? Math.max(0, this.timeRemaining) : 0,
        quizData: null
      };

      this.scene.resume('GameScene', data);
      this.scene.stop();
    });
  }
}

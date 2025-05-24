import { GameState } from '../types/gameState';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private map!: Phaser.GameObjects.Image;
  private floater: Phaser.GameObjects.Image | null = null;
  private lure: Phaser.GameObjects.Image | null = null;
  private fishingState: 'idle' | 'casting' | 'waiting' | 'catching' | 'reeling' = 'idle';
  private fishingTimer: Phaser.Time.TimerEvent | null = null;
  private currentFish: string | null = null;
  private lives: number = 3;
  private livesText!: Phaser.GameObjects.Text;
  private livesIcons: Phaser.GameObjects.Image[] = [];
  private fishCaught: number = 0;
  private fishCaughtText!: Phaser.GameObjects.Text;
  private gameState: GameState = {
    lives: 3,
    fishCaught: 0,
    score: 0
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    // Reset game state
    this.gameState = {
      lives: 3,
      fishCaught: 0,
      score: 0
    };
    this.fishingState = 'idle';
    this.currentFish = null;
    
    // Add map
    this.map = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'map');
    this.map.setScale(1);
    
    // Add player (boat)
    this.player = this.physics.add.sprite(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      'boat-blue'
    );
    this.player.setScale(0.5);
    
    // Set up keyboard input
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    
    // Add UI elements
    this.createUI();
    
    // Create world bounds
    this.physics.world.setBounds(0, 0, this.map.width, this.map.height);
    this.player.setCollideWorldBounds(true);
    
    // Set up camera to follow player
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1);
  }

  update(): void {
    // Handle player movement
    this.handlePlayerMovement();
    
    // Handle fishing action
    this.handleFishing();
    
    // Update UI elements
    this.updateUI();
  }

  private handlePlayerMovement(): void {
    // Only allow movement when not fishing
    if (this.fishingState === 'idle') {
      this.player.setVelocity(0);
      
      // Handle WASD movement
      if (this.input && this.input.keyboard) {
        const keyW = this.input.keyboard.addKey('W');
        const keyA = this.input.keyboard.addKey('A');
        const keyS = this.input.keyboard.addKey('S');
        const keyD = this.input.keyboard.addKey('D');
        
        if (keyW.isDown) {
          this.player.setVelocityY(-150);
        } else if (keyS.isDown) {
          this.player.setVelocityY(150);
        }
        
        if (keyA.isDown) {
          this.player.setVelocityX(-150);
          this.player.flipX = true;
        } else if (keyD.isDown) {
          this.player.setVelocityX(150);
          this.player.flipX = false;
        }
      }
    } else {
      // Stop movement when fishing
      this.player.setVelocity(0);
    }
  }

  private handleFishing(): void {
    // Start fishing when space is pressed
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.fishingState === 'idle') {
      this.startFishing();
    }
  }

  private startFishing(): void {
    this.fishingState = 'casting';
    
    // Create floater and lure
    this.floater = this.add.image(
      this.player.x,
      this.player.y + 50,
      'floater'
    ).setScale(0.3);
    
    this.lure = this.add.image(
      this.floater!.x,
      this.floater!.y + 20,
      'lure'
    ).setScale(0.2);
    
    // Start waiting for fish
    this.fishingTimer = this.time.delayedCall(Phaser.Math.Between(2000, 5000), () => {
      this.fishBite();
    });
    
    // Update fishing state
    this.fishingState = 'waiting';
  }

  private fishBite(): void {
    if (this.fishingState !== 'waiting') return;
    
    // Fish is biting!
    this.fishingState = 'catching';
    
    // Make the floater bob
    this.tweens.add({
      targets: this.floater,
      y: this.floater!.y - 10,
      duration: 300,
      yoyo: true,
      repeat: 3
    });
    
    // Select a random fish
    const fishTypes = [
      'bass', 'clown_fish', 'cod', 'guppy', 'herring', 
      'mackerel', 'pike', 'puffer_fish', 'rainbow_fish'
    ];
    this.currentFish = fishTypes[Phaser.Math.Between(0, fishTypes.length - 1)];
    
    // Player needs to press space to catch the fish
    const catchWindow = this.time.delayedCall(2000, () => {
      // If player didn't press space in time, fish gets away
      if (this.fishingState === 'catching') {
        this.fishGotAway();
      }
    });
    
    // Check for space key to catch fish
    const spaceCheck = this.time.addEvent({
      delay: 100,
      callback: () => {
        if (this.spaceKey.isDown && this.fishingState === 'catching') {
          catchWindow.remove();
          spaceCheck.remove();
          this.catchFish();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  private catchFish(): void {
    this.fishingState = 'reeling';
    
    // Show reeling animation
    this.tweens.add({
      targets: [this.floater, this.lure],
      y: this.player.y,
      duration: 1000,
      onComplete: () => {
        // Start the quiz
        this.scene.pause();
        this.scene.launch('QuizScene', { 
          gameState: this.gameState,
          currentFish: this.currentFish 
        });
        
        // Listen for quiz completion
        this.events.once('resume', (sys: Phaser.Scenes.Systems, data: any) => {
          if (data && data.success) {
            this.fishCaught++;
            this.gameState.fishCaught = this.fishCaught;
            this.gameState.score += 100;
          } else {
            this.lives--;
            this.gameState.lives = this.lives;
            
            if (this.lives <= 0) {
              this.gameOver();
            }
          }
          
          // Clean up fishing
          this.cleanUpFishing();
        });
      }
    });
  }

  private fishGotAway(): void {
    // Fish got away
    if (this.floater) {
      this.tweens.add({
        targets: this.floater,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.cleanUpFishing();
        }
      });
    }
  }

  private cleanUpFishing(): void {
    // Remove floater and lure
    if (this.floater) {
      this.floater.destroy();
      this.floater = null;
    }
    
    if (this.lure) {
      this.lure.destroy();
      this.lure = null;
    }
    
    // Reset fishing state
    this.fishingState = 'idle';
    this.currentFish = null;
    
    // Clear any remaining timers
    if (this.fishingTimer) {
      this.fishingTimer.remove();
      this.fishingTimer = null;
    }
  }

  private createUI(): void {
    // Create lives display
    this.livesText = this.add.text(20, 20, 'Lives:', {
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    }).setScrollFactor(0);
    
    // Add life icons
    for (let i = 0; i < this.lives; i++) {
      const lifeIcon = this.add.image(
        this.livesText.x + this.livesText.width + 30 + (i * 40),
        this.livesText.y + 12,
        'life-icon'
      ).setScrollFactor(0).setScale(0.5);
      
      this.livesIcons.push(lifeIcon);
    }
    
    // Create fish caught display
    this.fishCaughtText = this.add.text(
      20,
      this.livesText.y + this.livesText.height + 20,
      `Fish Caught: ${this.fishCaught}`,
      {
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 4
      }
    ).setScrollFactor(0);
  }

  private updateUI(): void {
    // Update fish caught text
    this.fishCaughtText.setText(`Fish Caught: ${this.fishCaught}`);
    
    // Update lives icons
    for (let i = 0; i < this.livesIcons.length; i++) {
      this.livesIcons[i].setVisible(i < this.lives);
    }
  }

  private gameOver(): void {
    this.scene.start('GameOverScene', { gameState: this.gameState });
  }
}

import { GameState } from '../types/gameState';
import { BoatFactory, BoatType } from '../factories/boatFactory';

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
  private coordsText!: Phaser.GameObjects.Text;
  private gameState: GameState = {
    lives: 3,
    fishCaught: 0,
    score: 0
  };
  private currentBoatType: BoatType = BoatType.BLUE;

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
    
    // Add map with fixed dimensions of 1280 × 640
    this.map = this.add.image(this.cameras.main.width / 2, this.cameras.main.height / 2, 'map');
    
    // Calculate scale to fit the map to the specified dimensions
    // We're setting the map to exactly 1280 × 640 pixels
    const targetWidth = 1280;
    const targetHeight = 640;
    const scaleX = targetWidth / this.map.width;
    const scaleY = targetHeight / this.map.height;
    this.map.setScale(scaleX, scaleY);
    
    // Get the actual dimensions of the map after scaling
    const mapWidth = targetWidth;
    const mapHeight = targetHeight;
    
    // Calculate map boundaries to match the game dimensions
    const mapLeft = this.cameras.main.width / 2 - mapWidth / 2;
    const mapTop = this.cameras.main.height / 2 - mapHeight / 2;
    const mapRight = mapLeft + mapWidth;
    const mapBottom = mapTop + mapHeight;
    
    // Add player (boat) using the BoatFactory
    this.player = BoatFactory.createBoat(
      this,
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.currentBoatType
    );
    
    // Set up keyboard input
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    
    // Create world bounds based on the actual map dimensions
    this.physics.world.setBounds(mapLeft, mapTop, mapWidth, mapHeight);
    
    // Make sure the player stays within the map boundaries
    this.player.setCollideWorldBounds(true);
    
    // Add a debug graphics to visualize the boundaries (can be removed in production)
    if (this.physics.world.debugGraphic) {
      const debugGraphics = this.add.graphics();
      debugGraphics.lineStyle(2, 0xff0000, 1);
      debugGraphics.strokeRect(mapLeft, mapTop, mapWidth, mapHeight);
    }
    
    // Configure the main camera to follow player with zoom
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(3.0); // Zoom in for better visibility
    this.cameras.main.setName('MainCamera'); // Name the main camera for easier reference
    
    // Create UI elements - must be done after main camera setup
    this.createUI();
    
    // Set up collision detection for map boundaries
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    
    // Update UI elements
    this.updateUI();
  }

  update(): void {
    // Handle player movement
    this.handlePlayerMovement();
    
    // Handle fishing action
    this.handleFishing();
    
    // Update UI elements
    this.updateUI();
    
    // Ensure UI camera stays fixed
    const uiCamera = this.cameras.getCamera('UICamera');
    if (uiCamera) {
      uiCamera.setScroll(0, 0);
      uiCamera.setZoom(1); // Always keep UI at normal zoom
    }
  }

  private handlePlayerMovement(): void {
    // Only allow movement when not fishing
    if (this.fishingState === 'idle') {
      // Reset velocity at the start of each update
      this.player.setVelocity(0);
      
      // Handle WASD movement
      if (this.input && this.input.keyboard) {
        const keyW = this.input.keyboard.addKey('W');
        const keyA = this.input.keyboard.addKey('A');
        const keyS = this.input.keyboard.addKey('S');
        const keyD = this.input.keyboard.addKey('D');
        
        // Get boat speed from factory
        const boatSpeed = BoatFactory.getBoatSpeed(this.currentBoatType);
        let velocityX = 0;
        let velocityY = 0;
        
        // Calculate velocity based on key presses
        if (keyW.isDown) {
          velocityY = -boatSpeed;
        } else if (keyS.isDown) {
          velocityY = boatSpeed;
        }
        
        if (keyA.isDown) {
          velocityX = -boatSpeed;
        } else if (keyD.isDown) {
          velocityX = boatSpeed;
        }
        
        // Apply velocity to the player
        this.player.setVelocity(velocityX, velocityY);
        
        // Update boat direction based on velocity
        if (velocityX !== 0 || velocityY !== 0) {
          BoatFactory.updateBoatDirection(this.player, velocityX, velocityY);
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
    // Create a UI scene camera that won't move or zoom with the main camera
    // This ensures UI elements stay fixed regardless of main camera zoom/position
    const uiCamera = this.cameras.add(0, 0, this.cameras.main.width, this.cameras.main.height);
    uiCamera.setScroll(0, 0);
    uiCamera.setName('UICamera');
    
    // Create a UI container that will hold all UI elements
    // This container will only be visible to the UI camera
    const uiContainer = this.add.container(0, 0);
    
    // Add a semi-transparent background for the UI
    const bgWidth = 350;
    const bgHeight = 180;
    const bg = this.add.rectangle(10, 10, bgWidth, bgHeight, 0x000000, 0.7)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.5);
    
    // Create lives display with clear visibility
    this.livesText = this.add.text(20, 20, 'Lives:', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 5
    });
    
    // Clear any existing life icons
    this.livesIcons = [];
    
    // Add life icons
    const iconStartX = this.livesText.x + this.livesText.width + 10;
    for (let i = 0; i < this.lives; i++) {
      const lifeIcon = this.add.image(
        iconStartX + (i * 30),
        this.livesText.y + this.livesText.height/2,
        'life-icon'
      ).setScale(0.8);
      
      this.livesIcons.push(lifeIcon);
    }
    
    // Create fish caught display
    this.fishCaughtText = this.add.text(
      20,
      this.livesText.y + this.livesText.height + 10,
      `Fish: ${this.fishCaught}`,
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
      }
    );
    
    // Create coordinates display
    this.coordsText = this.add.text(
      20,
      this.fishCaughtText.y + this.fishCaughtText.height + 10,
      `X: 0, Y: 0`,
      {
        fontSize: '24px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
      }
    );
    
    // Add all UI elements to the container
    uiContainer.add([bg, this.livesText, ...this.livesIcons, this.fishCaughtText, this.coordsText]);
    
    // Set high depth for the UI container to ensure it's on top
    uiContainer.setDepth(1000);
    
    // Make the UI container only visible to the UI camera and not the main camera
    this.cameras.main.ignore(uiContainer);
    uiCamera.ignore(this.player);
    uiCamera.ignore(this.map);
    
    // If there's a floater or lure, ignore them in the UI camera
    if (this.floater) uiCamera.ignore(this.floater);
    if (this.lure) uiCamera.ignore(this.lure);
  }

  private updateUI(): void {
    // Update fish caught text
    if (this.fishCaughtText) {
      this.fishCaughtText.setText(`Fish: ${this.fishCaught}`);
    }
    
    // Update lives icons
    for (let i = 0; i < this.livesIcons.length; i++) {
      this.livesIcons[i].setVisible(i < this.lives);
    }
    
    // Update coordinates text with player position (rounded to integers for readability)
    if (this.coordsText && this.player) {
      const x = Math.round(this.player.x);
      const y = Math.round(this.player.y);
      this.coordsText.setText(`X: ${x}, Y: ${y}`);
    }
    
    // Update game state
    this.gameState.lives = this.lives;
    this.gameState.fishCaught = this.fishCaught;
  }

  /**
   * Switch to a different boat type
   * @param boatType The new boat type to use
   */
  public switchBoat(boatType: BoatType): void {
    // Store the current boat type
    this.currentBoatType = boatType;
    
    // Get current position
    const x = this.player.x;
    const y = this.player.y;
    
    // Remove current boat
    this.player.destroy();
    
    // Create new boat at the same position
    this.player = BoatFactory.createBoat(this, x, y, boatType);
    
    // Set up camera to follow the new boat
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private gameOver(): void {
    this.scene.start('GameOverScene', { gameState: this.gameState });
  }
}

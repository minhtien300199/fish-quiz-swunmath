import { GameState } from '../types/gameState';
import { BoatFactory, BoatType } from '../factories/boatFactory';
import { CharacterFactory, CharacterType } from '../factories/characterFactory';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private character!: Phaser.GameObjects.Sprite; // Character sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private map!: Phaser.Tilemaps.Tilemap;
  private mapLayers: { [key: string]: Phaser.Tilemaps.TilemapLayer } = {};
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
  private currentCharacterType: CharacterType = CharacterType.LIGHT; // Default character type

  constructor() {
    super({ key: 'GameScene' });
  }
  preload(): void {
    // Load tilemap from Tiled
    this.load.tilemapTiledJSON('map', 'assets/maps/new-map.json');
    // load images tileset
    this.load.image('new-sand-tile', 'assets/tilesets/new-sand-tile.png');
    this.load.image('beach-objects', 'assets/tilesets/beach-objects.png');
    this.load.image('palm_tree', 'assets/tilesets/palm_tree.png');
    this.load.image('sub-objects', 'assets/tilesets/coconut.png');
  }
  create(): void {
    // Clean up any existing objects first
    this.cleanup();
    
    // Reset game state
    this.gameState = {
      lives: 3,
      fishCaught: 0,
      score: 0
    };
    this.fishingState = 'idle';
    this.currentFish = null;
    // Create a simple tilemap programmatically instead of loading from JSON
    // This avoids issues with external tileset references
    const map = this.make.tilemap({
      tileWidth: 32,
      tileHeight: 32,
      width: 40,
      height: 20
    });
    
    // Add the tilesets using the loaded image assets
    const seaSandTileset = map.addTilesetImage('new-sand-tile', 'new-sand-tile');
    const objectsTileset = map.addTilesetImage('beach-objects', 'beach-objects');
    const palmTreeTileset = map.addTilesetImage('palm_tree', 'palm_tree');
    const subObjectsTileset = map.addTilesetImage('sub-objects', 'coconut');
    
    if (!seaSandTileset || !objectsTileset || !palmTreeTileset || !subObjectsTileset) {
      console.error('Failed to load one or more tilesets');
      return;
    }
    
    // Create blank layers
    const seaLayer = map.createLayer('sea', seaSandTileset);
    const sandLayer = map.createLayer('sand', seaSandTileset);
    const objectsLayer = map.createLayer('objects', objectsTileset);
    const subObjectsLayer = map.createLayer('sub-objects', subObjectsTileset);
    
    if (!seaLayer || !sandLayer || !objectsLayer || !subObjectsLayer) {
      console.error('Failed to create one or more layers');
      return;
    }
    
    // Fill the sea layer with water tiles
    seaLayer.fill(1);
    
    // Add some sand around the edges
    sandLayer.fill(1, 0, 0, 3, 20); // Left edge
    sandLayer.fill(1, 0, 0, 40, 3); // Top edge
    
    // Add some objects (trees, rocks, etc.)
    objectsLayer.fill(1, 0, 17, 3, 3); // Bottom left corner
    objectsLayer.fill(1, 37, 17, 3, 3); // Bottom right corner
    
    // Store layers in the mapLayers object for easy access
    this.mapLayers = {
      sea: seaLayer,
      sand: sandLayer,
      objects: objectsLayer,
      subObjects: subObjectsLayer
    };
    
    // Set collision for sand and objects layers
    sandLayer.setCollisionByProperty({ collides: true });
    objectsLayer.setCollisionByProperty({ collides: true });
    
    // Store map reference
    this.map = map;
    
    // Set world bounds based on map dimensions
    const mapWidth = map.widthInPixels;
    const mapHeight = map.heightInPixels;
    this.physics.world.setBounds(0, 0, mapWidth, mapHeight);
    
    // Set camera bounds
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    
    // Add player (boat) using the BoatFactory at the specified starting position (x: 1024, y: 288)
    this.player = BoatFactory.createBoat(
      this,
      1024, // Fixed starting X position
      288,  // Fixed starting Y position
      this.currentBoatType
    );
    
    // Add character on top of the boat (only one character)
    const characterOffset = CharacterFactory.getCharacterOffset(this.currentCharacterType);
    this.character = CharacterFactory.createCharacter(
      this,
      this.player.x + characterOffset.x,
      this.player.y + characterOffset.y,
      this.currentCharacterType
    );
    
    // Set up keyboard input
    if (this.input && this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }
    
    // Make sure the player stays within the map boundaries
    this.player.setCollideWorldBounds(true);
    
    // Add collision between player and land/object layers
    this.physics.add.collider(this.player, this.mapLayers.sand);
    this.physics.add.collider(this.player, this.mapLayers.objects);
    
    // Add a debug graphics to visualize the boundaries (can be removed in production)
    if (this.physics.world.debugGraphic) {
      const debugGraphics = this.add.graphics();
      debugGraphics.lineStyle(2, 0xff0000, 1);
      // Use the actual map dimensions from the tilemap
      debugGraphics.strokeRect(0, 0, mapWidth, mapHeight);
    }
    
    // Configure the main camera to follow player with zoom
    this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setZoom(3.0); // Zoom in for better visibility
    this.cameras.main.setName('MainCamera'); // Name the main camera for easier reference
    
    // Ensure the character is only visible to the main camera
    // This must be done before creating any additional cameras
    for (let i = 1; i < this.cameras.cameras.length; i++) {
      const camera = this.cameras.cameras[i];
      if (camera && camera !== this.cameras.main) {
        camera.ignore(this.character);
      }
    }
    
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
    // Check if player exists before trying to move it
    if (!this.player) {
      return;
    }
    
    // Only allow movement when not fishing
    if (this.fishingState === 'idle') {
      // Reset velocity at the start of each update
      this.player.setVelocity(0);
      
      // Get boat speed from factory
      const boatSpeed = BoatFactory.getBoatSpeed(this.currentBoatType);
      
      // Create key objects once in create() instead of every frame
      // But for now, we'll handle it here with proper null checks
      const keyA = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A) : null;
      const keyD = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D) : null;
      const keyW = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W) : null;
      const keyS = this.input.keyboard ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S) : null;
      
      // Handle horizontal movement
      if (this.cursors.left.isDown || (keyA && keyA.isDown)) {
        this.player.setVelocityX(-boatSpeed);
      } else if (this.cursors.right.isDown || (keyD && keyD.isDown)) {
        this.player.setVelocityX(boatSpeed);
      }
      
      // Handle vertical movement
      if (this.cursors.up.isDown || (keyW && keyW.isDown)) {
        this.player.setVelocityY(-boatSpeed);
      } else if (this.cursors.down.isDown || (keyS && keyS.isDown)) {
        this.player.setVelocityY(boatSpeed);
      }
      
      // Safe access to body.velocity with null checks
      const velocityX = this.player.body ? this.player.body.velocity.x : 0;
      const velocityY = this.player.body ? this.player.body.velocity.y : 0;
      
      // Update boat direction based on velocity
      BoatFactory.updateBoatDirection(
        this.player,
        velocityX,
        velocityY
      );
      
      // Always update character position to follow the boat, even when not moving
      // This ensures the character stays with the boat and doesn't leave shadows
      const characterOffset = CharacterFactory.getCharacterOffset(this.currentCharacterType);
      if (this.character && this.player) {
        // Clear any previous rendering artifacts
        this.character.setPosition(
          this.player.x + characterOffset.x,
          this.player.y + characterOffset.y
        );
        
        // Update character animation based on movement direction
        CharacterFactory.updateCharacterDirection(
          this.character,
          velocityX,
          velocityY,
          this.currentCharacterType
        );
      }
    } else {
      // Stop movement when fishing
      this.player.setVelocity(0);
    }
  }

  private handleFishing(): void {
    // Check if player exists and space key is defined
    if (!this.player || !this.spaceKey) {
      return;
    }
    
    // Start fishing when space is pressed
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.fishingState === 'idle') {
      this.startFishing();
    }
  }

  private startFishing(): void {
    this.fishingState = 'casting';
    
    // Create floater with improved rendering settings to prevent shadow artifacts
    this.floater = this.add.image(
      this.player.x,
      this.player.y + 50,
      'floater'
    )
    .setScale(0.3)
    .setDepth(5) // Set depth to be above map but below character
    .setOrigin(0.5, 0.5) // Center origin point
    .setAlpha(1) // Full opacity
    .setPipeline('TextureTintPipeline'); // Use standard rendering pipeline
    
    // Create lure with improved rendering settings to prevent shadow artifacts
    this.lure = this.add.image(
      this.floater!.x,
      this.floater!.y + 20,
      'lure'
    )
    .setScale(0.2)
    .setDepth(5) // Same depth as floater
    .setOrigin(0.5, 0.5) // Center origin point
    .setAlpha(1) // Full opacity
    .setPipeline('TextureTintPipeline'); // Use standard rendering pipeline
    
    // Make sure these objects are only visible to the main camera
    // This prevents them from showing up in UI cameras
    const uiCamera = this.cameras.getCamera('UICamera');
    if (uiCamera) {
      uiCamera.ignore(this.floater);
      uiCamera.ignore(this.lure);
    }
    
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
    
    // Add heart icons for lives
    const iconStartX = this.livesText.x + this.livesText.width + 10;
    for (let i = 0; i < this.lives; i++) {
      const heartIcon = this.add.image(
        iconStartX + (i * 24), // Reduced spacing since heart icons are smaller (16x16)
        this.livesText.y + this.livesText.height/2,
        'heart-icon'
      ).setScale(2); // No scaling needed as it's already the right size (16x16)
      
      this.livesIcons.push(heartIcon);
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
    
    // Make gameplay elements only visible to the main camera and not the UI camera
    uiCamera.ignore(this.player);
    
    // Make tilemap layers only visible to the main camera
    Object.values(this.mapLayers).forEach(layer => {
      if (layer) uiCamera.ignore(layer);
    });
    
    // Make sure the character is only visible to the main camera
    if (this.character) uiCamera.ignore(this.character);
    
    // If there's a floater or lure, ignore them in the UI camera
    if (this.floater) uiCamera.ignore(this.floater);
    if (this.lure) uiCamera.ignore(this.lure);
  }

  private updateUI(): void {
    // Skip UI updates if critical elements aren't initialized yet
    if (!this.player) {
      return;
    }
    
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
    
    // Make sure player exists before proceeding
    if (!this.player) return;
    
    // Get current position
    const x = this.player.x;
    const y = this.player.y;
    
    // Remove current boat and character
    this.player.destroy();
    if (this.character) {
      this.character.destroy();
    }
    
    // Create new boat at the same position
    this.player = BoatFactory.createBoat(this, x, y, boatType);
    
    // Create new character at the same position
    const characterOffset = CharacterFactory.getCharacterOffset(this.currentCharacterType);
    this.character = CharacterFactory.createCharacter(
      this,
      x + characterOffset.x,
      y + characterOffset.y,
      this.currentCharacterType
    );
    
    // Set up camera to follow the new boat
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
  }

  private gameOver(): void {
    this.scene.start('GameOverScene', { gameState: this.gameState });
  }
  

  
  /**
   * Clean up any existing game objects to prevent duplicates
   * This is called at the start of create() to ensure we don't have multiple instances
   */
  private cleanup(): void {
    // Clean up character if it exists
    if (this.character) {
      this.character.destroy();
      this.character = null as unknown as Phaser.GameObjects.Sprite;
    }
    
    // Clean up player if it exists
    if (this.player) {
      this.player.destroy();
      this.player = null as unknown as Phaser.Physics.Arcade.Sprite;
    }
    
    // Clean up fishing objects
    if (this.floater) {
      this.floater.destroy();
      this.floater = null;
    }
    
    if (this.lure) {
      this.lure.destroy();
      this.lure = null;
    }
    
    // Clear any timers
    if (this.fishingTimer) {
      this.fishingTimer.remove();
      this.fishingTimer = null;
    }
  }
}

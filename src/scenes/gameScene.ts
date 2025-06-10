import { GameState } from '../types/gameState';
import { BoatFactory, BoatType } from '../factories/boatFactory';
import { CharacterFactory, CharacterType, CharacterActionType } from '../factories/characterFactory';
import { FishType } from '../const/fishType';
import { FloaterFactory, FloaterType } from '../factories/floaterFactory';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { pointRules } from '../const/pointRules';
import { FishCollectionManager } from '../managers/fishCollectionManager';
import { MusicManager } from '../managers/musicManager';
import { LeaderboardManager } from '../managers/leaderboardManager';
import { FishShadowFactory, FishShadowSize, FishShadowAction, FishShadowDirection } from '../factories/fishShadowFactory';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private character!: Phaser.GameObjects.Sprite; // Character sprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private map!: Phaser.Tilemaps.Tilemap;
  private mapLayers: { [key: string]: Phaser.Tilemaps.TilemapLayer } = {};
  private floater: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image | null = null;
  private lure: Phaser.GameObjects.Image | null = null;
  private fishingState: 'idle' | 'casting' | 'waiting' | 'catching' | 'reeling' = 'idle';
  private fishingTimer: Phaser.Time.TimerEvent | null = null;
  private currentFish: FishType | null = null;
  private lives: number = 3;
  private livesText!: Phaser.GameObjects.Text;
  private livesIcons: Phaser.GameObjects.Image[] = [];
  private fishCaught: number = 0;
  private fishCaughtText!: Phaser.GameObjects.Text;
  private progressText!: Phaser.GameObjects.Text;
  private coordsText!: Phaser.GameObjects.Text;
  private gameState: GameState = {
    lives: 3,
    fishCaught: 0,
    score: 0,
    caughtFishTypes: [],
    currentRunFish: []
  };
  private completionData: CompletionData | null = null;
  private points: number = 0;
  private pointsText!: Phaser.GameObjects.Text;
  private currentBoatType: BoatType = BoatType.BLUE;
  private currentCharacterType: CharacterType = CharacterType.LIGHT; // Default character type
  private shouldReset: boolean = false;
  private isMenuOpen: boolean = false; // Flag to prevent multiple menus
  private fishShadows: Phaser.GameObjects.Sprite[] = []; // Array to store fish shadows
  private fishShadowSpawnTimer: Phaser.Time.TimerEvent | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * Initialize the scene with data
   * @param data Optional data passed from other scenes
   */
  init(data: any): void {
    // Check if we should reset the game (coming from WinScene)
    this.shouldReset = data && data.reset === true;
    console.log('GameScene init with reset:', this.shouldReset);
  }
  preload(): void {
    // Load tilemap from Tiled
    this.load.tilemapTiledJSON('map', 'assets/maps/new-map.json');
    // load images tileset
    this.load.image('new-sand-tile', 'assets/tilesets/new-sand-tile.png');
    this.load.image('beach-objects', 'assets/tilesets/beach-objects.png');
    this.load.image('palm_tree', 'assets/tilesets/palm_tree.png');
    this.load.image('coconut', 'assets/tilesets/coconut.png');

    // Load fish shadow assets
    FishShadowFactory.loadAllShadowAssets(this);
  }
  async create(): Promise<void> {
    // Clean up any existing objects first
    this.cleanup();

    // Initialize music manager
    MusicManager.init(this);

    // Fetch completion data from mock backend
    try {
      this.completionData = await fetchCompletionData();
      console.log('Fetched completion data:', this.completionData);
    } catch (error) {
      console.error('Error fetching completion data:', error);
      // Use default values if fetch fails
      this.completionData = {
        title: 'Easy',
        RarityRate: 0.4,
        Timers: [30],
        TotalFish: 5
      };
    }

    // Reset game state - always reset if coming from WinScene or if it's a new game
    if (this.shouldReset || !this.gameState) {
      console.log('Resetting game state completely');
      this.gameState = {
        lives: 3,
        fishCaught: 0,
        score: 0,
        caughtFishTypes: FishCollectionManager.getCaughtFishTypes(), // Load from persistent storage
        currentRunFish: [] // Initialize empty array for current run
      };
      this.points = 0;
      this.fishCaught = 0;
      this.lives = 3; // Reset lives to 3
    } else {
      // Even if not resetting completely, sync the caught fish types from storage
      this.gameState.caughtFishTypes = FishCollectionManager.getCaughtFishTypes();
      // Initialize current run fish if it doesn't exist
      if (!this.gameState.currentRunFish) {
        this.gameState.currentRunFish = [];
      }
    }

    // Always reset these states regardless
    this.fishingState = 'idle';
    this.currentFish = null;

    // Load the tilemap from the JSON file
    const map = this.make.tilemap({ key: 'map' });

    // Add the tilesets
    // The first parameter must match the tileset name in the JSON file
    // The second parameter is the key of the image we loaded in preload
    const seaSandTileset = map.addTilesetImage('new-sand-tile', 'new-sand-tile');
    const objectsTileset = map.addTilesetImage('beach-objects', 'beach-objects');
    const palmTreeTileset = map.addTilesetImage('palm_tree', 'palm_tree');
    const coconutTileset = map.addTilesetImage('coconut', 'coconut');

    if (!seaSandTileset || !objectsTileset || !palmTreeTileset || !coconutTileset) {
      console.error('Failed to load one or more tilesets');
      return;
    }

    // Create layers from the tilemap
    const seaLayer = map.createLayer('sea', seaSandTileset);
    const sandLayer = map.createLayer('sand', seaSandTileset);
    const objectsLayer = map.createLayer('objects', objectsTileset);
    const subObjectsLayer = map.createLayer('sub-objects', coconutTileset);

    if (!seaLayer || !sandLayer || !objectsLayer || !subObjectsLayer) {
      console.error('Failed to create one or more layers');
      return;
    }

    // Store layers in the mapLayers object for easy access
    this.mapLayers = {
      sea: seaLayer,
      sand: sandLayer,
      objects: objectsLayer,
      subObjects: subObjectsLayer,
    };

    // Set collision for sand and objects layers
    // For tilemaps created in Tiled, we can use setCollisionByExclusion to set all non-empty tiles as collidable
    sandLayer.setCollisionByExclusion([-1]); // -1 is the empty tile
    objectsLayer.setCollisionByExclusion([-1]);

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
    this.cameras.main.startFollow(this.player, true, 0.5, 0.5); // Follow player with deadzone centered
    this.cameras.main.setZoom(3.0); // Zoomed in for better detail
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

    // Start spawning fish shadows in water areas
    this.startFishShadowSpawning();
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

      // Check for keyboard movement first
      let keyboardMovement = false;

      // Handle horizontal movement
      if (this.cursors.left.isDown || (keyA && keyA.isDown)) {
        this.player.setVelocityX(-boatSpeed);
        keyboardMovement = true;
      } else if (this.cursors.right.isDown || (keyD && keyD.isDown)) {
        this.player.setVelocityX(boatSpeed);
        keyboardMovement = true;
      }

      // Handle vertical movement
      if (this.cursors.up.isDown || (keyW && keyW.isDown)) {
        this.player.setVelocityY(-boatSpeed);
        keyboardMovement = true;
      } else if (this.cursors.down.isDown || (keyS && keyS.isDown)) {
        this.player.setVelocityY(boatSpeed);
        keyboardMovement = true;
      }

      // Handle mouse movement (only if no keyboard movement is active)
      if (!keyboardMovement && this.input.activePointer.isDown) {
        this.handleMouseMovement(boatSpeed);
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

  private handleMouseMovement(boatSpeed: number): void {
    if (!this.player || !this.input.activePointer) {
      return;
    }

    // Get the world position of the mouse pointer (accounting for camera zoom and position)
    const worldPointer = this.cameras.main.getWorldPoint(
      this.input.activePointer.x,
      this.input.activePointer.y
    );

    // Calculate the distance from player to mouse pointer
    const distanceX = worldPointer.x - this.player.x;
    const distanceY = worldPointer.y - this.player.y;

    // Calculate the total distance
    const totalDistance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

    // Only move if the mouse is far enough away (minimum distance threshold)
    const minDistance = 20; // Minimum distance to start moving
    if (totalDistance > minDistance) {
      // Normalize the direction vector
      const directionX = distanceX / totalDistance;
      const directionY = distanceY / totalDistance;

      // Set velocity towards the mouse pointer
      this.player.setVelocityX(directionX * boatSpeed);
      this.player.setVelocityY(directionY * boatSpeed);
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

    // Play bait hit water sound effect with delay to match when bait hits water
    this.time.delayedCall(500, () => {
      MusicManager.playSound(this, 'bait-hit-water', { volume: 0.5 });
    });

    // Set character to fishing throw action
    if (this.character) {
      CharacterFactory.setCharacterAction(
        this.character,
        this,
        CharacterActionType.FISHING_THROW,
        this.currentCharacterType
      );

      // Store the character for later use
      const character = this.character;

      // Create a delayed call to create the floater after the throw animation
      // This creates a more realistic effect where the floater appears after the throw
      this.time.delayedCall(800, () => {
        // Only proceed if we're still in casting or waiting state
        if (this.fishingState === 'casting' || this.fishingState === 'waiting') {
          // Create floater using FloaterFactory with animated floating state and character direction
          this.floater = FloaterFactory.createFloater(
            this,
            this.player.x,
            this.player.y,
            FloaterType.FLOATING,
            character // Pass the character to determine direction
          );

          // Configure floater for UI camera
          FloaterFactory.configureFloaterForUI(this, this.floater);

          // No lure creation - removed as requested
          this.lure = null; // Set to null to avoid errors in other methods

          // Start waiting for fish only after the floater appears
          this.fishingTimer = this.time.delayedCall(Phaser.Math.Between(2000, 5000), () => {
            this.fishBite();
          });

          // Update fishing state
          this.fishingState = 'waiting';
        }
      });
    } else {
      // Fallback if no character exists
      // Create floater immediately
      this.floater = FloaterFactory.createFloater(
        this,
        this.player.x,
        this.player.y,
        FloaterType.FLOATING
      );

      // Configure floater for UI camera
      FloaterFactory.configureFloaterForUI(this, this.floater);

      // No lure creation - removed as requested
      this.lure = null;

      // Start waiting for fish
      this.fishingTimer = this.time.delayedCall(Phaser.Math.Between(2000, 5000), () => {
        this.fishBite();
      });

      // Update fishing state
      this.fishingState = 'waiting';
    }
  }

  private fishBite(): void {
    if (this.fishingState !== 'waiting') return;

    // Fish is biting!
    this.fishingState = 'catching';

    // Change character animation to REEL when the fish bites (not pull yet)
    if (this.character) {
      CharacterFactory.setCharacterAction(
        this.character,
        this,
        CharacterActionType.FISHING_REEL,
        this.currentCharacterType
      );
    }

    // Replace static floater with animated one using FloaterFactory
    if (this.floater) {
      // Replace with fish biting floater (without bobbing)
      // Don't pass character to keep the floater in the same position
      this.floater = FloaterFactory.replaceFloater(
        this,
        this.floater,
        FloaterType.FISH_BITING
        // Not passing character to keep the floater in the same position
      );

      // No bobbing effect - floater stays in place
    }

    // Select a random fish from all available fish types
    const fishTypes = Object.values(FishType);
    this.currentFish = fishTypes[Phaser.Math.Between(0, fishTypes.length - 1)] as FishType;

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
          // Change animation from reel to pull when space is pressed
          if (this.character) {
            CharacterFactory.setCharacterAction(
              this.character,
              this,
              CharacterActionType.FISHING_PULL,
              this.currentCharacterType
            );
          }

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
    // Play rod reeling sound effect
    MusicManager.playSound(this, 'rod-reels', { volume: 0.6 });

    this.fishingState = 'reeling';

    // Show reeling animation - only target the floater since lure is removed
    this.tweens.add({
      targets: this.floater,
      y: this.player.y,
      duration: 1000,
      onComplete: () => {
        // Start the quiz
        this.scene.pause();
        this.scene.launch('QuizScene', {
          gameState: this.gameState,
          currentFish: this.currentFish,
          completionData: this.completionData
        });

        // Listen for quiz completion
        this.events.once('resume', (sys: Phaser.Scenes.Systems, data: any) => {
          if (data && data.success) {
            // Increment fish caught counter
            this.fishCaught++;

            // Add the caught fish to the collection if we have a current fish
            let isNewFish = false;
            if (this.currentFish) {
              isNewFish = FishCollectionManager.addCaughtFish(this.currentFish);

              // Add fish to current run tracking
              this.gameState.currentRunFish.push(this.currentFish.toString());

              // Update game state with current caught fish types
              this.gameState.caughtFishTypes = FishCollectionManager.getCaughtFishTypes();

              // Show new fish discovery notification if it's a new catch
              if (isNewFish) {
                this.showNewFishNotification(this.currentFish);
              }
            }

            // Determine fish size/rarity type
            let fishType: 'small' | 'medium' | 'rare';

            // Use RarityRate from completion data to determine fish type
            const rarityRoll = Math.random();
            if (rarityRoll < 0.6) {
              fishType = 'small'; // 60% chance for small fish
            } else if (rarityRoll < 0.9) {
              fishType = 'medium'; // 30% chance for medium fish
            } else {
              fishType = 'rare'; // 10% chance for rare fish
            }

            // Award points based on fish type using pointRules
            const pointsAwarded = pointRules[fishType];
            this.points += pointsAwarded;

            // Check if there's a time bonus for answering quickly
            if (data.timeBonus && data.timeBonus > 0) {
              // Calculate bonus points - 10 points per second remaining
              const bonusPoints = data.timeBonus * 10;
              this.points += bonusPoints;

              // Show bonus points notification
              this.showBonusPointsNotification(bonusPoints);
            }

            // Show points awarded notification for the fish
            this.showPointsNotification(pointsAwarded, fishType);

            // Update game state
            this.gameState.fishCaught = this.fishCaught;
            this.gameState.score = this.points;
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

    // Remove any rod sprites
    this.children.getChildren()
      .filter(child => child.type === 'Sprite' &&
        (child as Phaser.GameObjects.Sprite).texture.key.includes('rod-'))
      .forEach(rod => rod.destroy());

    // Reset character to idle if we have a character
    if (this.character) {
      CharacterFactory.setCharacterAction(
        this.character,
        this,
        CharacterActionType.IDLE,
        this.currentCharacterType
      );
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
        this.livesText.y + this.livesText.height / 2,
        'heart-icon'
      ).setScale(2); // No scaling needed as it's already the right size (16x16)

      this.livesIcons.push(heartIcon);
    }

    // Create fish caught display
    this.fishCaughtText = this.add.text(
      20,
      this.livesText.y + this.livesText.height + 10,
      `Fish: ${this.fishCaught}/${this.completionData?.TotalFish || 5} fish`,
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
      }
    );

    // Create points display
    this.pointsText = this.add.text(
      20,
      this.fishCaughtText.y + this.fishCaughtText.height + 10,
      `Points: ${this.points}`,
      {
        fontSize: '18px', // Smaller font size for points
        color: '#ffff00', // Yellow color for points
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3 // Reduced stroke thickness
      }
    );

    // Create coordinates display
    this.coordsText = this.add.text(
      20,
      this.pointsText.y + this.pointsText.height + 10,
      `X: 0, Y: 0`,
      {
        fontSize: '24px',
        color: '#ffff00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5
      }
    );

    // Create menu button in the top right corner
    const menuButtonSize = 50;
    const menuButtonX = this.cameras.main.width - menuButtonSize - 20; // 20px from right edge
    const menuButtonY = 20; // 20px from top edge

    // Create menu button background
    const menuButton = this.add.rectangle(
      menuButtonX, menuButtonY, menuButtonSize, menuButtonSize,
      0x333333, 0.8
    )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive();

    // Create menu button icon (three horizontal lines)
    const lineSpacing = 8;
    const lineWidth = 30;
    const lineHeight = 3;
    const startX = menuButtonX + (menuButtonSize - lineWidth) / 2;
    const startY = menuButtonY + (menuButtonSize - (lineHeight * 3 + lineSpacing * 2)) / 2;

    const menuLine1 = this.add.rectangle(startX, startY, lineWidth, lineHeight, 0xffffff)
      .setOrigin(0, 0);
    const menuLine2 = this.add.rectangle(startX, startY + lineHeight + lineSpacing, lineWidth, lineHeight, 0xffffff)
      .setOrigin(0, 0);
    const menuLine3 = this.add.rectangle(startX, startY + (lineHeight + lineSpacing) * 2, lineWidth, lineHeight, 0xffffff)
      .setOrigin(0, 0);

    // Add hover effects for the menu button
    menuButton.on('pointerover', () => {
      menuButton.setFillStyle(0x555555, 0.9);
      menuLine1.setFillStyle(0xffff00);
      menuLine2.setFillStyle(0xffff00);
      menuLine3.setFillStyle(0xffff00);
    });

    menuButton.on('pointerout', () => {
      menuButton.setFillStyle(0x333333, 0.8);
      menuLine1.setFillStyle(0xffffff);
      menuLine2.setFillStyle(0xffffff);
      menuLine3.setFillStyle(0xffffff);
    });

    // Add click handler for menu button
    menuButton.on('pointerdown', () => {
      this.showGameMenu();
    });

    // Create sound toggle buttons
    const buttonSize = 40;
    const buttonSpacing = 10;

    // Music toggle button
    const musicButtonX = this.cameras.main.width - buttonSize - 20;
    const musicButtonY = menuButtonY + menuButtonSize + buttonSpacing;

    const musicButton = this.add.rectangle(
      musicButtonX, musicButtonY, buttonSize, buttonSize,
      MusicManager.isMusicOn() ? 0x27ae60 : 0xe74c3c, 0.8
    )
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive();

    const musicIcon = this.add.text(
      musicButtonX + buttonSize / 2,
      musicButtonY + buttonSize / 2,
      '♪',
      {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
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
      .setStrokeStyle(2, 0xffffff, 0.8)
      .setInteractive();

    const soundIcon = this.add.text(
      soundButtonX + buttonSize / 2,
      soundButtonY + buttonSize / 2,
      '🔊',
      {
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5);

    // Music button handlers
    musicButton.on('pointerover', () => {
      musicButton.setFillStyle(MusicManager.isMusicOn() ? 0x2ecc71 : 0xc0392b, 0.9);
    });

    musicButton.on('pointerout', () => {
      musicButton.setFillStyle(MusicManager.isMusicOn() ? 0x27ae60 : 0xe74c3c, 0.8);
    });

    musicButton.on('pointerdown', () => {
      const isMusicOn = MusicManager.toggleMusic();
      musicButton.setFillStyle(isMusicOn ? 0x27ae60 : 0xe74c3c, 0.8);
      console.log('Music toggled:', isMusicOn ? 'ON' : 'OFF');
    });

    // Sound button handlers
    soundButton.on('pointerover', () => {
      soundButton.setFillStyle(MusicManager.isSoundOn() ? 0x2ecc71 : 0xc0392b, 0.9);
    });

    soundButton.on('pointerout', () => {
      soundButton.setFillStyle(MusicManager.isSoundOn() ? 0x27ae60 : 0xe74c3c, 0.8);
    });

    soundButton.on('pointerdown', () => {
      const isSoundOn = MusicManager.toggleSound();
      soundButton.setFillStyle(isSoundOn ? 0x27ae60 : 0xe74c3c, 0.8);
      console.log('Sound toggled:', isSoundOn ? 'ON' : 'OFF');
    });

    // Add all UI elements to the container
    uiContainer.add([
      bg, this.livesText, ...this.livesIcons, this.fishCaughtText,
      this.pointsText, this.coordsText, menuButton, menuLine1, menuLine2, menuLine3,
      musicButton, musicIcon, soundButton, soundIcon
    ]);

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

  /**
   * Show the in-game menu with options to resume, restart, or go to main menu
   */
  private showGameMenu(): void {
    // Prevent multiple menus from opening
    if (this.isMenuOpen) {
      console.log('Menu already open, ignoring request');
      return;
    }

    console.log('Opening game menu...');
    this.isMenuOpen = true;

    // Pause the game physics but keep the scene running
    this.physics.pause();

    // Get the UI camera - this is where we should create the menu to avoid zoom issues
    const uiCamera = this.cameras.getCamera('UICamera');
    if (!uiCamera) {
      console.error('UI Camera not found!');
      this.isMenuOpen = false;
      this.physics.resume();
      return;
    }

    // Create a simple overlay that blocks input to the game
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.8);
    overlay.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);
    overlay.setScrollFactor(0);
    overlay.setDepth(9000);
    // Make overlay interactive to block all clicks behind modal
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.cameras.main.width, this.cameras.main.height), Phaser.Geom.Rectangle.Contains);

    // Create menu container at the center of the screen (UI camera coordinates)
    const menuContainer = this.add.container(this.cameras.main.width / 2, this.cameras.main.height / 2);
    menuContainer.setScrollFactor(0);
    menuContainer.setDepth(9001);

    // Create menu background (adjusted size for 4 buttons)
    const menuBg = this.add.rectangle(0, 0, 400, 450, 0x2c3e50);
    menuBg.setStrokeStyle(4, 0x3498db);

    // Create title (positioned lower for better balance)
    const title = this.add.text(0, -180, 'GAME MENU', {
      fontSize: '32px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    // Create buttons using simple graphics and text
    const createButton = (x: number, y: number, color: number, text: string, callback: () => void) => {
      // Use Rectangle instead of Graphics for more reliable hit detection
      const button = this.add.rectangle(x, y, 250, 50, color);
      button.setStrokeStyle(2, 0xffffff, 0.3);
      button.setInteractive({ useHandCursor: true });

      const buttonText = this.add.text(x, y, text, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      // Add hover effect
      button.on('pointerover', () => {
        // Use predefined lighter colors for hover effect
        let hoverColor = color;
        if (color === 0x27ae60) hoverColor = 0x2ecc71; // Green hover
        else if (color === 0xe67e22) hoverColor = 0xf39c12; // Orange hover
        else if (color === 0xe74c3c) hoverColor = 0xc0392b; // Red hover
        else if (color === 0x9b59b6) hoverColor = 0x8e44ad; // Purple hover
        else if (color === 0x95a5a6) hoverColor = 0xbdc3c7; // Light gray hover (Resume button)
        else if (color === 0x34495e) hoverColor = 0x5d6d7e; // Lighter dark gray hover (Exit to Menu button)

        button.setFillStyle(hoverColor);
        console.log(`Hovering over ${text} button`);
      });

      button.on('pointerout', () => {
        button.setFillStyle(color);
      });

      button.on('pointerdown', () => {
        console.log(`${text} button clicked!`);
        callback();
      });

      return { button, buttonText };
    };

    // Cleanup function
    const cleanup = () => {
      console.log('Cleaning up menu...');
      this.isMenuOpen = false;
      this.physics.resume();

      // Destroy all menu elements
      if (overlay) overlay.destroy();
      if (menuContainer) menuContainer.destroy();
    };

    // Create the buttons with proper vertical alignment and consistent spacing
    const buttonSpacing = 70; // Space between each button
    const startY = -120; // Starting Y position (higher up)

    const resumeBtn = createButton(0, startY, 0x95a5a6, 'Resume', () => {
      cleanup();
    });

    const fishCollectionBtn = createButton(0, startY + buttonSpacing, 0x27ae60, 'Fish Collection', () => {
      cleanup();
      this.scene.pause();
      this.scene.launch('FishCollectionScene', { returnTo: 'GameScene' });
    });

    const restartBtn = createButton(0, startY + buttonSpacing * 2, 0xe74c3c, 'Restart', () => {
      cleanup();
      this.scene.start('GameScene', { reset: true });
    });

    const mainMenuBtn = createButton(0, startY + buttonSpacing * 3, 0x34495e, 'Exit to Menu', () => {
      cleanup();
      this.scene.start('MenuScene');
    });

    // Add all elements to container
    menuContainer.add([
      menuBg,
      title,
      resumeBtn.button,
      resumeBtn.buttonText,
      fishCollectionBtn.button,
      fishCollectionBtn.buttonText,
      restartBtn.button,
      restartBtn.buttonText,
      mainMenuBtn.button,
      mainMenuBtn.buttonText
    ]);

    // IMPORTANT: Make menu elements visible ONLY to UI camera (ignore main camera)
    // This prevents the zoomed duplicate from appearing
    this.cameras.main.ignore([overlay, menuContainer]);
    this.cameras.main.ignore([
      menuBg, title,
      resumeBtn.button, resumeBtn.buttonText,
      fishCollectionBtn.button, fishCollectionBtn.buttonText,
      restartBtn.button, restartBtn.buttonText,
      mainMenuBtn.button, mainMenuBtn.buttonText
    ]);

    // Add ESC key listener
    const escKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    if (escKey) {
      const escHandler = () => {
        console.log('ESC pressed - closing menu');
        cleanup();
        escKey.off('down', escHandler);
      };
      escKey.on('down', escHandler);
    }

    console.log('Menu created successfully for UI camera only');
  }

  private updateUI(): void {
    // Skip UI updates if critical elements aren't initialized yet
    if (!this.player) {
      return;
    }

    // Update fish caught text
    if (this.fishCaughtText) {
      const totalFish = this.completionData?.TotalFish || 5;
      this.fishCaughtText.setText(`Fish: ${this.fishCaught}/${totalFish} fish`);

      // Check if player has caught enough fish to win
      if (this.fishCaught >= (this.completionData?.TotalFish || 5)) {
        // Player has won! Transition to the win scene
        console.log('Player has caught enough fish to win!');
        this.triggerWin();
      }
    }

    // Update points text
    if (this.pointsText) {
      this.pointsText.setText(`Points: ${this.points}`);
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
    this.gameState.score = this.points; // Update score with points
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
    // Always save score to leaderboard when game ends (win or lose)
    this.saveScoreToLeaderboard();

    this.scene.start('GameOverScene', { gameState: this.gameState });
  }

  /**
   * Trigger the win scene when player reaches the required points
   */
  private triggerWin(): void {
    // Prevent multiple win triggers
    if (this.scene.isActive('WinScene')) return;

    // Always save score to leaderboard when game ends (win or lose)
    this.saveScoreToLeaderboard();

    // Clean up any existing objects and stop fishing
    this.cleanup();

    // Reset fishing state
    this.fishingState = 'idle';
    this.currentFish = null;

    // Play a victory sound if available
    // this.sound.play('victory');

    // Transition to the win scene
    this.scene.start('WinScene', {
      gameState: this.gameState,
      completionTitle: this.completionData?.title || 'Easy'
    });
  }

  /**
   * Show a notification with points awarded
   * @param points Number of points awarded
   * @param fishType Type of fish caught (small, medium, rare)
   */
  private showPointsNotification(points: number, fishType: 'small' | 'medium' | 'rare'): void {
    let notificationText = `+${points} points`;
    let textColor = '#ffffff';

    // Set color based on fish type
    switch (fishType) {
      case 'small':
        textColor = '#ffffff'; // White for small fish
        break;
      case 'medium':
        textColor = '#00ffff'; // Cyan for medium fish
        break;
      case 'rare':
        textColor = '#ffff00'; // Yellow for rare fish
        notificationText = `+${points} points (RARE!)`;
        break;
    }

    // Create floating text notification
    const notification = this.add.text(
      this.player.x,
      this.player.y - 50,
      notificationText,
      {
        fontSize: '12px',
        color: textColor,
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Animate the notification floating upward and fading out
    this.tweens.add({
      targets: notification,
      y: notification.y - 100,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        notification.destroy();
      }
    });
  }

  /**
   * Show a notification for bonus points from answering quickly
   * @param bonusPoints Number of bonus points awarded
   */
  private showBonusPointsNotification(bonusPoints: number): void {
    // Create floating text notification for bonus points
    const notification = this.add.text(
      this.player.x + 30, // Offset to the right so it doesn't overlap with main notification
      this.player.y - 80, // Higher than the main notification
      `+${bonusPoints} TIME BONUS!`,
      {
        fontSize: '10px',
        color: '#f1c40f', // Gold color for bonus
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Animate the notification floating upward and fading out
    this.tweens.add({
      targets: notification,
      y: notification.y - 100,
      alpha: 0,
      duration: 2500,
      ease: 'Power2',
      onComplete: () => {
        notification.destroy();
      }
    });
  }

  /**
   * Show a notification when a new fish type is discovered
   * @param fishType The new fish type that was discovered
   */
  private showNewFishNotification(fishType: FishType): void {
    // Play star blinking sound effect for new fish discovery
    MusicManager.playSound(this, 'star-blinking', { volume: 0.7 });

    // Format fish name for display
    const fishName = fishType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Create floating text notification for new fish discovery
    const notification = this.add.text(
      this.player.x,
      this.player.y - 120, // Above other notifications
      `NEW FISH DISCOVERED!\n${fishName}`,
      {
        fontSize: '14px',
        color: '#e74c3c', // Bright red for discovery
        fontStyle: 'bold',
        stroke: '#ffffff',
        strokeThickness: 4,
        align: 'center'
      }
    ).setOrigin(0.5);

    // Create a sparkle effect around the notification
    const sparkles = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sparkle = this.add.text(
        notification.x + Math.cos(angle) * 60,
        notification.y + Math.sin(angle) * 40,
        '✨',
        {
          fontSize: '16px',
          color: '#f1c40f'
        }
      ).setOrigin(0.5);
      sparkles.push(sparkle);
    }

    // Animate the notification and sparkles
    this.tweens.add({
      targets: notification,
      y: notification.y - 100,
      alpha: 0,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => {
        notification.destroy();
      }
    });

    // Animate sparkles
    sparkles.forEach((sparkle, index) => {
      this.tweens.add({
        targets: sparkle,
        rotation: Math.PI * 2,
        alpha: 0,
        duration: 3000,
        delay: index * 100,
        ease: 'Power2',
        onComplete: () => {
          sparkle.destroy();
        }
      });
    });

    console.log(`🎉 New fish discovered: ${fishName}!`);
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

    // Clean up fish shadows
    this.cleanupFishShadows();
  }

  /**
   * Start spawning fish shadows randomly in water areas
   */
  private startFishShadowSpawning(): void {
    // Initial spawn of some fish shadows
    this.spawnInitialFishShadows();

    // Set up timer to spawn new fish shadows periodically
    this.fishShadowSpawnTimer = this.time.addEvent({
      delay: 3000, // Spawn every 3 seconds
      callback: this.spawnRandomFishShadow,
      callbackScope: this,
      loop: true
    });

    console.log('Fish shadow spawning started');
  }

  /**
   * Spawn initial fish shadows across the map
   */
  private spawnInitialFishShadows(): void {
    const maxInitialShadows = 8; // Start with 8 fish shadows

    for (let i = 0; i < maxInitialShadows; i++) {
      this.spawnRandomFishShadow();
    }
  }

  /**
   * Spawn a random fish shadow in a valid water location
   */
  private spawnRandomFishShadow(): void {
    // Don't spawn too many shadows
    if (this.fishShadows.length >= 12) {
      return;
    }

    const validPosition = this.getRandomWaterPosition();
    if (!validPosition) {
      console.warn('Could not find valid water position for fish shadow');
      return;
    }

    // Random size and direction
    const size = FishShadowFactory.getRandomSize();
    const direction = FishShadowFactory.getRandomDirection();

    // Temporarily use only appearing action to avoid swimming animation issues
    // TODO: Re-enable swimming when animation assets are confirmed working
    const action = FishShadowAction.APPEARING;

    // Create the fish shadow
    const fishShadow = FishShadowFactory.createFishShadow(
      this,
      validPosition.x,
      validPosition.y,
      size,
      action,
      direction
    );

    // Start the fish shadow lifecycle: appear → move → disappear
    if (action === FishShadowAction.APPEARING) {
      try {
        FishShadowFactory.playAppearingAnimation(this, fishShadow, size, () => {
          // After appearing, start the movement phase
          this.startFishMovementPhase(fishShadow, size, validPosition.x, validPosition.y);
        });
      } catch (error) {
        console.warn('Failed to play appearing animation:', error);
        // If appearing fails, still start movement
        this.startFishMovementPhase(fishShadow, size, validPosition.x, validPosition.y);
      }
    }

    // Add to our tracking array
    this.fishShadows.push(fishShadow);

    console.log(`Spawned fish shadow: ${size} at (${validPosition.x}, ${validPosition.y})`);
  }

  /**
 * Start the movement phase for a fish shadow
 * @param fishShadow The fish shadow sprite
 * @param size Size of the fish shadow
 * @param startX Starting X position
 * @param startY Starting Y position
 */
  private startFishMovementPhase(fishShadow: Phaser.GameObjects.Sprite, size: FishShadowSize, startX: number, startY: number): void {
    if (!fishShadow || !fishShadow.active) return;

    // Random number of direction changes (1 to 3)
    const totalMoves = Phaser.Math.Between(1, 3);
    let currentMove = 0;

    console.log(`Starting movement phase for fish: ${totalMoves} moves planned`);

    // Start the movement sequence
    this.executeNextMove(fishShadow, size, currentMove, totalMoves);
  }

  /**
   * Execute the next movement for a fish shadow
   * @param fishShadow The fish shadow sprite
   * @param size Size of the fish shadow
   * @param currentMove Current move index
   * @param totalMoves Total number of moves to execute
   */
  private executeNextMove(fishShadow: Phaser.GameObjects.Sprite, size: FishShadowSize, currentMove: number, totalMoves: number): void {
    if (!fishShadow || !fishShadow.active || currentMove >= totalMoves) {
      // All moves completed, start disappearing phase
      this.startFishDisappearingPhase(fishShadow, size);
      return;
    }

    // Generate random movement direction and distance
    const directions = [
      { x: 1, y: 0, swim: FishShadowDirection.RIGHT },      // right
      { x: -1, y: 0, swim: FishShadowDirection.LEFT },     // left
      { x: 0, y: 1, swim: FishShadowDirection.BOTTOM },    // down
      { x: 0, y: -1, swim: FishShadowDirection.TOP },      // up
      { x: 1, y: 1, swim: FishShadowDirection.BOTTOM_RIGHT },   // down-right
      { x: -1, y: 1, swim: FishShadowDirection.BOTTOM_LEFT },   // down-left
      { x: 1, y: -1, swim: FishShadowDirection.TOP_RIGHT },     // up-right
      { x: -1, y: -1, swim: FishShadowDirection.TOP_LEFT }      // up-left
    ];

    const direction = Phaser.Utils.Array.GetRandom(directions);
    const distance = Phaser.Math.Between(30, 80); // Reduced distance for slower movement
    const duration = Phaser.Math.Between(2000, 4000); // Increased duration for slower movement

    // Calculate target position
    let targetX = fishShadow.x + (direction.x * distance);
    let targetY = fishShadow.y + (direction.y * distance);

    // Ensure target position is within water bounds
    const validTarget = this.getValidMoveTarget(fishShadow.x, fishShadow.y, targetX, targetY);
    targetX = validTarget.x;
    targetY = validTarget.y;

    console.log(`Fish swimming ${currentMove + 1}/${totalMoves}: (${fishShadow.x}, ${fishShadow.y}) → (${targetX}, ${targetY}) direction: ${direction.swim}`);

    // Start swimming animation in the movement direction
    try {
      FishShadowFactory.playSwimmingAnimation(this, fishShadow, size, direction.swim);
    } catch (error) {
      console.warn('Failed to start swimming animation:', error);
    }

    // Create tween to move the fish while swimming
    this.tweens.add({
      targets: fishShadow,
      x: targetX,
      y: targetY,
      duration: duration,
      ease: 'Power1', // Gentler easing for more natural swimming
      onComplete: () => {
        // Stop swimming animation and pause before next move
        try {
          FishShadowFactory.stopSwimmingAnimation(fishShadow, size, direction.swim, 1);
        } catch (error) {
          console.warn('Failed to stop swimming animation:', error);
        }

        // Execute next move after a longer pause for more natural behavior
        this.time.delayedCall(Phaser.Math.Between(1000, 2000), () => {
          this.executeNextMove(fishShadow, size, currentMove + 1, totalMoves);
        });
      }
    });
  }

  /**
   * Get a valid movement target that stays in water
   * @param startX Starting X position
   * @param startY Starting Y position
   * @param targetX Desired target X position
   * @param targetY Desired target Y position
   * @returns Valid target position
   */
  private getValidMoveTarget(startX: number, startY: number, targetX: number, targetY: number): { x: number, y: number } {
    // Check if target is in water
    if (this.isPositionInWater(targetX, targetY)) {
      return { x: targetX, y: targetY };
    }

    // If target is not valid, try to find a closer valid position
    const steps = 10;
    for (let i = steps; i > 0; i--) {
      const factor = i / steps;
      const adjustedX = startX + (targetX - startX) * factor;
      const adjustedY = startY + (targetY - startY) * factor;

      if (this.isPositionInWater(adjustedX, adjustedY)) {
        return { x: adjustedX, y: adjustedY };
      }
    }

    // If no valid position found, stay at current position
    return { x: startX, y: startY };
  }

  /**
   * Start the disappearing phase for a fish shadow
   * @param fishShadow The fish shadow sprite
   * @param size Size of the fish shadow
   */
  private startFishDisappearingPhase(fishShadow: Phaser.GameObjects.Sprite, size: FishShadowSize): void {
    if (!fishShadow || !fishShadow.active) return;

    console.log('Starting disappearing phase for fish');

    try {
      FishShadowFactory.playDisappearingAnimation(this, fishShadow, size, () => {
        // Remove fish after disappearing animation completes
        this.removeFishShadow(fishShadow);
      });
    } catch (error) {
      console.warn('Failed to play disappearing animation:', error);
      // If disappearing animation fails, just remove the fish
      this.removeFishShadow(fishShadow);
    }
  }

  /**
   * Convert an appearing fish to a swimming fish (legacy method - no longer used)
   */
  private convertToSwimmingFish(appearingFish: Phaser.GameObjects.Sprite, size: FishShadowSize): void {
    // This method is no longer used since we now use the movement phase system
    console.warn('convertToSwimmingFish called but is deprecated');
  }

  /**
   * Get a random position in water that's not colliding with land
   */
  private getRandomWaterPosition(): { x: number, y: number } | null {
    const maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      // Get random position within map bounds
      const x = Phaser.Math.Between(50, this.map.widthInPixels - 50);
      const y = Phaser.Math.Between(50, this.map.heightInPixels - 50);

      // Check if position is in water (not on land/collision tiles)
      if (this.isPositionInWater(x, y)) {
        return { x, y };
      }

      attempts++;
    }

    return null; // Couldn't find valid position
  }

  /**
   * Check if a position is in water (not on collision tiles)
   */
  private isPositionInWater(x: number, y: number): boolean {
    // Convert world coordinates to tile coordinates
    const tileX = Math.floor(x / this.map.tileWidth);
    const tileY = Math.floor(y / this.map.tileHeight);

    // Check if position is within map bounds
    if (tileX < 0 || tileX >= this.map.width || tileY < 0 || tileY >= this.map.height) {
      return false;
    }

    // Check sand layer for collision tiles
    const sandLayer = this.mapLayers.sand;
    if (sandLayer) {
      const sandTile = sandLayer.getTileAt(tileX, tileY);
      if (sandTile && sandTile.index !== -1) {
        return false; // Position is on sand/land
      }
    }

    // Check objects layer for collision tiles
    const objectsLayer = this.mapLayers.objects;
    if (objectsLayer) {
      const objectTile = objectsLayer.getTileAt(tileX, tileY);
      if (objectTile && objectTile.index !== -1) {
        return false; // Position has objects
      }
    }

    // Check if there's a sea tile at this position
    const seaLayer = this.mapLayers.sea;
    if (seaLayer) {
      const seaTile = seaLayer.getTileAt(tileX, tileY);
      if (seaTile && seaTile.index !== -1) {
        return true; // Position is in water
      }
    }

    return false; // No sea tile found
  }

  /**
   * Remove a fish shadow with disappearing animation
   */
  private removeFishShadow(fishShadow: Phaser.GameObjects.Sprite): void {
    if (!fishShadow || !fishShadow.active) return;

    // Remove from tracking array
    const index = this.fishShadows.indexOf(fishShadow);
    if (index > -1) {
      this.fishShadows.splice(index, 1);
    }

    // Use factory's destroy method with fade out
    FishShadowFactory.destroyFishShadow(this, fishShadow, true);

    console.log('Removed fish shadow');
  }

  /**
   * Clean up all fish shadows
   */
  private cleanupFishShadows(): void {
    // Clean up spawn timer
    if (this.fishShadowSpawnTimer) {
      this.fishShadowSpawnTimer.destroy();
      this.fishShadowSpawnTimer = null;
    }

    // Clean up all fish shadows
    this.fishShadows.forEach(shadow => {
      if (shadow && shadow.active) {
        shadow.destroy();
      }
    });
    this.fishShadows = [];

    console.log('Fish shadows cleaned up');
  }

  /**
   * Save the current game score to leaderboard
   */
  private saveScoreToLeaderboard(): void {
    // Generate automatic player name based on total entries + 1
    const stats = LeaderboardManager.getStats();
    const playerNumber = stats.totalEntries + 1;
    const playerName = `Player ${playerNumber}`;

    // Calculate total fish caught
    const totalFishCaught = this.gameState.caughtFishTypes.length;

    // Get completion title based on current completion data
    const completionTitle = this.completionData?.title || 'Beginner';

    // Save the score
    const isHighScore = LeaderboardManager.saveScore(
      playerName,
      this.gameState.score,
      totalFishCaught,
      completionTitle
    );

    // Show feedback to player
    if (isHighScore) {
      console.log(`🎉 New high score saved! Score: ${this.gameState.score}, Rank: ${LeaderboardManager.getPlayerRank(this.gameState.score)}`);

      // Create high score notification
      this.showHighScoreNotification(this.gameState.score, LeaderboardManager.getPlayerRank(this.gameState.score));
    } else {
      console.log(`Score saved: ${this.gameState.score} (${totalFishCaught} fish caught) for ${playerName}`);
    }
  }

  /**
   * Show high score achievement notification
   */
  private showHighScoreNotification(score: number, rank: number): void {
    // Create notification container
    const notificationContainer = this.add.container(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 100
    );
    notificationContainer.setDepth(2000);

    // Background
    const notificationBg = this.add.rectangle(0, 0, 400, 120, 0xf39c12, 0.95);
    notificationBg.setStrokeStyle(4, 0xe67e22);

    // Title
    const title = this.add.text(0, -30, '🏆 HIGH SCORE! 🏆', {
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Details
    const details = this.add.text(0, 10, `Score: ${score} | Rank: #${rank}`, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    notificationContainer.add([notificationBg, title, details]);

    // Auto-hide after 3 seconds
    this.time.delayedCall(3000, () => {
      notificationContainer.destroy();
    });

    // Scale animation
    notificationContainer.setScale(0);
    this.tweens.add({
      targets: notificationContainer,
      scale: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });
  }
}

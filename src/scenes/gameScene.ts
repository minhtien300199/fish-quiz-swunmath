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
    caughtFishTypes: []
  };
  private completionData: CompletionData | null = null;
  private points: number = 0;
  private pointsText!: Phaser.GameObjects.Text;
  private currentBoatType: BoatType = BoatType.BLUE;
  private currentCharacterType: CharacterType = CharacterType.LIGHT; // Default character type
  private shouldReset: boolean = false;
  private isMenuOpen: boolean = false; // Flag to prevent multiple menus

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
        caughtFishTypes: FishCollectionManager.getCaughtFishTypes() // Load from persistent storage
      };
      this.points = 0;
      this.fishCaught = 0;
      this.lives = 3; // Reset lives to 3
    } else {
      // Even if not resetting completely, sync the caught fish types from storage
      this.gameState.caughtFishTypes = FishCollectionManager.getCaughtFishTypes();
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
    // Save score to leaderboard if it's significant (more than 0 points)
    if (this.gameState.score > 0) {
      this.saveScoreToLeaderboard();
    }

    this.scene.start('GameOverScene', { gameState: this.gameState });
  }

  /**
   * Trigger the win scene when player reaches the required points
   */
  private triggerWin(): void {
    // Prevent multiple win triggers
    if (this.scene.isActive('WinScene')) return;

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
  }

  /**
   * Save the current game score to leaderboard
   */
  private saveScoreToLeaderboard(): void {
    // Get player name from a simple prompt (can be enhanced with a proper UI later)
    const playerName = prompt('Enter your name for the leaderboard:') || 'Anonymous';

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
      console.log(`Score saved: ${this.gameState.score} (${totalFishCaught} fish caught)`);
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

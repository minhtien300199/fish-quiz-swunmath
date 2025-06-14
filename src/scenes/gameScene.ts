import { GameState } from '../types/gameState';
import { BoatFactory, BoatType } from '../factories/boatFactory';
import { CharacterFactory, CharacterType, CharacterActionType } from '../factories/characterFactory';
import { FishType, fishVariants, isSharkPattern } from '../const/fishType';
import { FloaterFactory, FloaterType } from '../factories/floaterFactory';
import { FishFactory } from '../factories/fishFactory';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { pointRules } from '../const/pointRules';
import { FishCollectionManager } from '../managers/fishCollectionManager';
import { MusicManager } from '../managers/musicManager';
import { LeaderboardManager } from '../managers/leaderboardManager';
import { FishShadowFactory, FishShadowSize, FishShadowAction, FishShadowDirection } from '../factories/fishShadowFactory';
import { BoxFactory, BoxState } from '../factories/boxFactory';
import { FishQuizModal, FishQuizData } from '../components/FishQuizModal';

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
  private fishingLine: Phaser.GameObjects.Graphics | null = null; // Visual fishing line
  private fishSplashingSound: Phaser.Sound.BaseSound | null = null; // Fish splashing sound
  private bitingFishShadow: Phaser.GameObjects.Sprite | null = null; // Fish shadow that will bite the floater
  private catchButton: Phaser.GameObjects.Container | null = null; // Button to catch fish when biting
  private fishCelebrationContainer: Phaser.GameObjects.Container | null = null; // Fish celebration display
  private fishBox: Phaser.GameObjects.Container | null = null; // Fish storage box
  private keyboardAnimationTimer: Phaser.Time.TimerEvent | null = null; // Timer for keyboard animation
  private fishQuizDataList: FishQuizData[] = []; // Store quiz data for caught fish
  private fishQuizModal: FishQuizModal | null = null; // Modal component for displaying quiz data

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

    // Load fishmarket stall
    this.load.image('fishmarket-stall', 'assets/fishmarket/commerce_fishmarket_stall.png');

    // Load fishmarket shop spritesheet
    this.load.spritesheet('fishmarket-shop', 'assets/fishmarket/commerce_fishmarket_shop.png', {
      frameWidth: 128,
      frameHeight: 128
    });

    // Load keyboard sprite images for catch button animation
    this.load.image('keyboard-frame-1', 'assets/ui/control_ui/space_0001.png');
    this.load.image('keyboard-frame-2', 'assets/ui/control_ui/space_0002.png');

    // Load box assets
    BoxFactory.loadAssets(this);
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

    // Set boat depth higher than fishmarket-shop and fish shadows
    this.player.setDepth(15);

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

    // Initialize fish quiz modal component
    this.fishQuizModal = new FishQuizModal(this);

    // Add fishmarket stall in the sand at the start of the map (after camera setup)
    const fishmarketStall = this.add.image(150, 140, 'fishmarket-stall');
    fishmarketStall.setOrigin(0.5, 1); // Set origin to bottom center for proper ground placement
    fishmarketStall.setDepth(10); // Make sure it appears above the ground tiles

    // Add fishmarket shop with animation at specified coordinates
    const fishmarketShop = this.add.sprite(1080, 180, 'fishmarket-shop');
    fishmarketShop.setOrigin(0.5, 1); // Set origin to bottom center for proper ground placement
    fishmarketShop.setDepth(10); // Make sure it appears above the ground tiles

    // Create animation for fishmarket shop
    this.anims.create({
      key: 'fishmarket-shop-anim',
      frames: this.anims.generateFrameNumbers('fishmarket-shop', { start: 0, end: 1 }),
      frameRate: 1,
      repeat: -1
    });

    // Play the animation
    fishmarketShop.play('fishmarket-shop-anim');

    // Ensure both fishmarket buildings are only visible to the main camera
    for (let i = 1; i < this.cameras.cameras.length; i++) {
      const camera = this.cameras.cameras[i];
      if (camera && camera !== this.cameras.main) {
        camera.ignore([fishmarketStall, fishmarketShop]);
      }
    }

    // Fish storage box will be created in createUI method
  }

  update(): void {
    // Handle player movement
    this.handlePlayerMovement();

    // Handle fishing action
    this.handleFishing();

    // Update fishing line if active
    if (this.fishingLine && this.fishingState !== 'idle') {
      this.updateFishingLine();
    }

    // Update UI elements
    this.updateUI();

    // Update catch button position
    this.updateCatchButton();

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

      // Handle mouse movement (only if no keyboard movement is active and not clicking on UI)
      if (!keyboardMovement && this.input.activePointer.isDown && !this.isClickingOnUI()) {
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

  private isClickingOnUI(): boolean {
    if (!this.input.activePointer) {
      return false;
    }

    const pointer = this.input.activePointer;

    // Check if clicking on the fishing box
    if (this.fishBox) {
      const bounds = this.fishBox.getBounds();
      if (pointer.x >= bounds.x && pointer.x <= bounds.x + bounds.width &&
        pointer.y >= bounds.y && pointer.y <= bounds.y + bounds.height) {
        return true;
      }
    }

    // Check if the menu is open (since it blocks boat movement)
    if (this.isMenuOpen) {
      return true;
    }

    // Add other UI elements as needed
    return false;
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

      // Calculate the actual floater position using action offset instead of fixed directional offset
      const targetPosition = this.calculateFloaterPositionWithActionOffset(character);

      // Start the animated line casting
      this.animateFishingLineCast(targetPosition, () => {
        // Only proceed if we're still in casting state
        if (this.fishingState === 'casting') {
          // Create floater at the calculated position (using action offset)
          this.floater = this.add.sprite(targetPosition.x, targetPosition.y, 'floater-floating-1')
            .setScale(2.0) // Same scale as FloaterFactory.FLOATING
            .setDepth(5)
            .setOrigin(0.5, 0.5);

          // Create and play floating animation
          if (!this.anims.exists('floater-float')) {
            // Create animation from individual frames
            const frames = [];
            for (let i = 1; i <= 5; i++) {
              frames.push({
                key: `floater-floating-${i}`
              });
            }

            this.anims.create({
              key: 'floater-float',
              frames: frames,
              frameRate: 6,
              repeat: -1
            });
          }

          // Play the animation
          if (this.floater instanceof Phaser.GameObjects.Sprite) {
            this.floater.play('floater-float');
          }

          // Configure floater for UI camera
          FloaterFactory.configureFloaterForUI(this, this.floater);

          // Play bait hit water sound effect
          MusicManager.playSound(this, 'bait-hit-water', { volume: 0.5 });

          // No lure creation - removed as requested
          this.lure = null;

          // Update fishing state to waiting
          this.fishingState = 'waiting';

          // Start the fish shadow bite sequence instead of simple timer
          const biteDelay = Phaser.Math.Between(1000, 3000); // Delay before fish appears
          this.fishingTimer = this.time.delayedCall(biteDelay, () => {
            if (this.fishingState === 'waiting') {
              this.spawnBitingFishShadow();
            }
          });
        }
      });
    } else {
      // Fallback if no character exists - create floater immediately
      this.floater = FloaterFactory.createFloater(
        this,
        this.player.x,
        this.player.y,
        FloaterType.FLOATING
      );

      // Configure floater for UI camera
      FloaterFactory.configureFloaterForUI(this, this.floater);

      // Create fishing line from character to floater
      this.createFishingLine();

      // No lure creation - removed as requested
      this.lure = null;

      // Update fishing state to waiting
      this.fishingState = 'waiting';

      // Start the fish shadow bite sequence instead of simple timer
      const biteDelay = Phaser.Math.Between(1000, 3000); // Delay before fish appears
      this.fishingTimer = this.time.delayedCall(biteDelay, () => {
        if (this.fishingState === 'waiting') {
          this.spawnBitingFishShadow();
        }
      });
    }
  }

  /**
   * Calculate floater position using action offset for casting, maintaining 50px distance
   */
  private calculateFloaterPositionWithActionOffset(character: Phaser.GameObjects.Sprite): { x: number, y: number } {
    // Get the character's current direction
    let direction = 'down'; // Default direction

    // Check if there's a current animation playing
    const currentAnim = character.anims.currentAnim;
    if (currentAnim) {
      const animKey = currentAnim.key;
      if (animKey.includes('down')) direction = 'down';
      else if (animKey.includes('left')) direction = 'left';
      else if (animKey.includes('up')) direction = 'up';
      else if (animKey.includes('right')) direction = 'right';
    } else {
      // If no animation, try to determine from the frame
      const frame = character.frame.name;
      if (typeof frame === 'number' || !isNaN(Number(frame))) {
        const frameNum = Number(frame);
        // These frame numbers correspond to CharacterDirection enum in characterFactory.ts
        if (frameNum === 4 || frameNum === 5) direction = 'down';
        else if (frameNum === 2 || frameNum === 3) direction = 'left';
        else if (frameNum === 6 || frameNum === 7) direction = 'up';
        else if (frameNum === 0 || frameNum === 1) direction = 'right';
      }
    }

    // Convert direction to the format expected by getActionOffset (uppercase with full direction names)
    let directionForOffset = 'RIGHT'; // Default
    switch (direction) {
      case 'down': directionForOffset = 'BOTTOM'; break;
      case 'left': directionForOffset = 'LEFT'; break;
      case 'up': directionForOffset = 'TOP'; break;
      case 'right': directionForOffset = 'RIGHT'; break;
    }

    // Get the action offset for casting
    const actionOffset = this.getActionOffset('casting', directionForOffset);

    // The original system used 50px distance in cardinal directions
    // We need to scale the action offset to maintain this 50px distance
    const originalDistance = 50;

    // Calculate the magnitude of the action offset
    const actionMagnitude = Math.sqrt(actionOffset.x * actionOffset.x + actionOffset.y * actionOffset.y);

    // If action offset is zero, use the original directional offset
    if (actionMagnitude === 0) {
      const originalOffsets: Record<string, { x: number; y: number }> = {
        down: { x: 0, y: 50 },
        left: { x: -50, y: 0 },
        up: { x: 0, y: -50 },
        right: { x: 50, y: 0 }
      };
      const originalOffset = originalOffsets[direction] || originalOffsets['down'];
      return {
        x: this.player.x + originalOffset.x,
        y: this.player.y + originalOffset.y
      };
    }

    // Scale the action offset to maintain the original 50px distance
    const scaleFactor = originalDistance / actionMagnitude;
    const scaledOffset = {
      x: actionOffset.x * scaleFactor,
      y: actionOffset.y * scaleFactor
    };

    // Calculate the final position with scaled action offset
    return {
      x: this.player.x + scaledOffset.x,
      y: this.player.y + scaledOffset.y
    };
  }

  private fishBite(): void {
    if (this.fishingState !== 'waiting') return;

    // Fish is biting!
    this.fishingState = 'catching';

    // Play fish splashing sound effect (looping) - use direct sound system for control
    if (MusicManager.isSoundOn()) {
      this.fishSplashingSound = this.sound.add('fish-splashing', {
        volume: 0.7,
        loop: true
      });
      this.fishSplashingSound.play();
    }

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

    // Show catch button above player's head
    this.showCatchButton();

    // Player needs to press space or click button to catch the fish
    const catchWindow = this.time.delayedCall(2000, () => {
      // If player didn't press space or click button in time, fish gets away
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
          this.handleCatchAttempt();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  private catchFish(): void {
    // Stop fish splashing sound
    if (this.fishSplashingSound) {
      this.fishSplashingSound.stop();
      this.fishSplashingSound = null;
    }

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
            // Show fish celebration first, then continue with other logic
            if (this.currentFish) {
              this.showFishCelebration(this.currentFish, () => {
                // Continue with success logic after celebration
                this.handleQuizSuccess(data);
              });
            } else {
              // Fallback if no current fish
              this.handleQuizSuccess(data);
            }
          } else {
            this.lives--;
            this.gameState.lives = this.lives;

            if (this.lives <= 0) {
              this.gameOver();
            }

            // Clean up fishing
            this.cleanUpFishing();
          }
        });
      }
    });
  }

  private fishGotAway(): void {
    // Stop fish splashing sound
    if (this.fishSplashingSound) {
      this.fishSplashingSound.stop();
      this.fishSplashingSound = null;
    }

    // Remove catch button
    this.removeCatchButton();

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

    // Remove fishing line
    if (this.fishingLine) {
      this.fishingLine.destroy();
      this.fishingLine = null;
    }

    // Remove biting fish shadow if it exists
    this.removeBitingFishShadow();

    // Remove catch button if it exists
    this.removeCatchButton();

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

  /**
   * Calculate target position for floater based on character direction and throw distance
   */
  private calculateFloaterTarget(character: Phaser.GameObjects.Sprite): { x: number, y: number } {
    // Base throw distance
    const baseDistance = 150;
    const randomDistance = Phaser.Math.Between(100, 200);

    // Get a random angle for throwing direction (in degrees)
    const throwAngle = Phaser.Math.Between(0, 360);

    // Convert to radians for calculation
    const angleRad = throwAngle * (Math.PI / 180);

    // Calculate target position
    const targetX = character.x + Math.cos(angleRad) * randomDistance;
    const targetY = character.y + Math.sin(angleRad) * randomDistance;

    // Ensure the target is within water bounds if possible
    const validTarget = this.getValidMoveTarget(character.x, character.y, targetX, targetY);

    return validTarget;
  }

  /**
   * Animate the fishing line casting from character to target position
   */
  private animateFishingLineCast(targetPosition: { x: number, y: number }, onComplete: () => void): void {
    if (!this.character) return;

    // Create graphics object for the fishing line
    this.fishingLine = this.add.graphics();
    this.fishingLine.setDepth(20); // Above boat and character

    // Make sure fishing line is only visible to main camera
    const cameras = this.cameras.cameras;
    for (let i = 1; i < cameras.length; i++) {
      const camera = cameras[i];
      if (camera && camera !== this.cameras.main) {
        camera.ignore(this.fishingLine);
      }
    }

    // Get both starting and ending character line attachment points
    const direction = this.getCharacterDirectionToPoint(targetPosition);
    const reelingPoint = this.getCharacterLinePoint(direction, 'reeling'); // Starting position
    const castingPoint = this.getCharacterLinePoint(direction, 'casting'); // Ending position

    // Animation parameters
    const castDuration = 800; // 800ms cast duration
    const segments = 5;
    let animationProgress = 0;

    // Create animation tween
    this.tweens.add({
      targets: { progress: 0 },
      progress: 1,
      duration: castDuration,
      ease: 'Power2',
      onUpdate: (tween) => {
        animationProgress = tween.getValue() || 0;
        this.drawAnimatedFishingLineWithMovingStart(reelingPoint, castingPoint, targetPosition, animationProgress, segments);
      },
      onComplete: () => {
        // Animation complete, call the callback
        onComplete();
      }
    });
  }

  /**
   * Draw animated fishing line during casting with moving start point
   */
  private drawAnimatedFishingLineWithMovingStart(
    reelingPoint: { x: number, y: number },
    castingPoint: { x: number, y: number },
    targetPosition: { x: number, y: number },
    progress: number,
    segments: number
  ): void {
    if (!this.fishingLine) return;

    // Clear previous line
    this.fishingLine.clear();

    // Calculate current start point (interpolating from reeling to casting position)
    const currentStartX = reelingPoint.x + (castingPoint.x - reelingPoint.x) * progress;
    const currentStartY = reelingPoint.y + (castingPoint.y - reelingPoint.y) * progress;

    // Calculate current end point based on animation progress
    const currentEndX = currentStartX + (targetPosition.x - currentStartX) * progress;
    const currentEndY = currentStartY + (targetPosition.y - currentStartY) * progress;

    // Calculate line properties
    const distance = Phaser.Math.Distance.Between(currentStartX, currentStartY, currentEndX, currentEndY);
    const thickness = Math.max(1, 1 - (distance / 200));

    // Set line style - white color for fishing line
    this.fishingLine.lineStyle(thickness, 0xFFFFFF, 0.8);

    // Draw the animated line with realistic sag
    this.fishingLine.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = currentStartX + (currentEndX - currentStartX) * t;
      const y = currentStartY + (currentEndY - currentStartY) * t + Math.sin(t * Math.PI) * (distance / 20) * progress; // Sag increases with progress

      if (i === 0) {
        this.fishingLine.moveTo(x, y);
      } else {
        this.fishingLine.lineTo(x, y);
      }
    }
    this.fishingLine.strokePath();

    // Add subtle shadow/depth effect
    this.fishingLine.lineStyle(Math.max(1, thickness + 1), 0x000000, 0.3);
    this.fishingLine.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = currentStartX + (currentEndX - currentStartX) * t + 1;
      const y = currentStartY + (currentEndY - currentStartY) * t + Math.sin(t * Math.PI) * (distance / 20) * progress + 1;

      if (i === 0) {
        this.fishingLine.moveTo(x, y);
      } else {
        this.fishingLine.lineTo(x, y);
      }
    }
    this.fishingLine.strokePath();
  }

  /**
   * Draw animated fishing line during casting
   */
  private drawAnimatedFishingLine(startPoint: { x: number, y: number }, targetPosition: { x: number, y: number }, progress: number, segments: number): void {
    if (!this.fishingLine) return;

    // Clear previous line
    this.fishingLine.clear();

    // Calculate current end point based on animation progress
    const currentEndX = startPoint.x + (targetPosition.x - startPoint.x) * progress;
    const currentEndY = startPoint.y + (targetPosition.y - startPoint.y) * progress;

    // Calculate line properties
    const distance = Phaser.Math.Distance.Between(startPoint.x, startPoint.y, currentEndX, currentEndY);
    const thickness = Math.max(1, 1 - (distance / 200));

    // Set line style - white color for fishing line
    this.fishingLine.lineStyle(thickness, 0xFFFFFF, 0.8);

    // Draw the animated line with realistic sag
    this.fishingLine.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startPoint.x + (currentEndX - startPoint.x) * t;
      const y = startPoint.y + (currentEndY - startPoint.y) * t + Math.sin(t * Math.PI) * (distance / 20) * progress; // Sag increases with progress

      if (i === 0) {
        this.fishingLine.moveTo(x, y);
      } else {
        this.fishingLine.lineTo(x, y);
      }
    }
    this.fishingLine.strokePath();

    // Add subtle shadow/depth effect
    this.fishingLine.lineStyle(Math.max(1, thickness + 1), 0x000000, 0.3);
    this.fishingLine.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startPoint.x + (currentEndX - startPoint.x) * t + 1;
      const y = startPoint.y + (currentEndY - startPoint.y) * t + Math.sin(t * Math.PI) * (distance / 20) * progress + 1;

      if (i === 0) {
        this.fishingLine.moveTo(x, y);
      } else {
        this.fishingLine.lineTo(x, y);
      }
    }
    this.fishingLine.strokePath();
  }

  /**
   * Get character's facing direction based on target point
   */
  private getCharacterDirectionToPoint(targetPoint: { x: number, y: number }): string {
    if (!this.character) return 'RIGHT';

    const deltaX = targetPoint.x - this.character.x;
    const deltaY = targetPoint.y - this.character.y;

    // Calculate angle in degrees
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Convert to 0-360 range
    const normalizedAngle = (angle + 360) % 360;

    // Determine direction based on angle ranges
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) {
      return 'RIGHT';
    } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
      return 'BOTTOM_RIGHT';
    } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
      return 'BOTTOM';
    } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
      return 'BOTTOM_LEFT';
    } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
      return 'LEFT';
    } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
      return 'TOP_LEFT';
    } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
      return 'TOP';
    } else if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) {
      return 'TOP_RIGHT';
    }

    return 'RIGHT'; // Default fallback
  }

  /**
   * Create a visual fishing line from the character to the floater
   */
  private createFishingLine(): void {
    if (!this.character || !this.floater) return;

    // Create graphics object for the fishing line
    this.fishingLine = this.add.graphics();
    this.fishingLine.setDepth(20); // Above boat and character

    // Make sure fishing line is only visible to main camera
    const cameras = this.cameras.cameras;
    for (let i = 1; i < cameras.length; i++) {
      const camera = cameras[i];
      if (camera && camera !== this.cameras.main) {
        camera.ignore(this.fishingLine);
      }
    }

    // Draw the initial line
    this.updateFishingLine();
  }

  /**
   * Get character's facing direction based on floater position
   */
  private getCharacterDirection(): string {
    if (!this.character || !this.floater) return 'RIGHT';

    const deltaX = this.floater.x - this.character.x;
    const deltaY = this.floater.y - this.character.y;

    // Calculate angle in degrees
    const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

    // Convert to 0-360 range
    const normalizedAngle = (angle + 360) % 360;

    // Determine direction based on angle ranges
    if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) {
      return 'RIGHT';
    } else if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) {
      return 'BOTTOM_RIGHT';
    } else if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) {
      return 'BOTTOM';
    } else if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) {
      return 'BOTTOM_LEFT';
    } else if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) {
      return 'LEFT';
    } else if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) {
      return 'TOP_LEFT';
    } else if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) {
      return 'TOP';
    } else if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) {
      return 'TOP_RIGHT';
    }

    return 'RIGHT'; // Default fallback
  }

  /**
   * Get character line attachment point based on direction
   */
  /**
   * Get character line attachment point based on direction and fishing action
   */
  private getCharacterLinePoint(direction: string, action: string = 'idle'): { x: number; y: number } {
    if (!this.character) return { x: 0, y: 0 };

    const baseX = this.character.x;
    const baseY = this.character.y;

    // Get base offsets for direction
    let baseOffset = this.getDirectionOffset(direction);

    // Modify offsets based on fishing action
    const actionOffset = this.getActionOffset(action, direction);

    return {
      x: baseX + baseOffset.x + actionOffset.x,
      y: baseY + baseOffset.y + actionOffset.y
    };
  }

  /**
   * Get base direction offsets for rod positioning
   */
  private getDirectionOffset(direction: string): { x: number; y: number } {
    switch (direction) {
      case 'TOP':
        return { x: 0, y: -10 }; // Rod pointing up

      case 'BOTTOM':
        return { x: 0, y: 5 }; // Rod pointing down

      case 'LEFT':
        return { x: -15, y: -3 }; // Rod pointing left

      case 'RIGHT':
        return { x: 10, y: -5 }; // Rod pointing right

      case 'TOP_LEFT':
        return { x: -12, y: -12 }; // Rod pointing top-left

      case 'TOP_RIGHT':
        return { x: 12, y: -12 }; // Rod pointing top-right

      case 'BOTTOM_LEFT':
        return { x: -12, y: 2 }; // Rod pointing bottom-left

      case 'BOTTOM_RIGHT':
        return { x: 12, y: 2 }; // Rod pointing bottom-right

      default:
        return { x: 10, y: -5 }; // Default to right
    }
  }

  /**
   * Get action-specific offsets for different fishing states
   */
  private getActionOffset(action: string, direction: string): { x: number; y: number } {
    switch (action) {
      case 'casting':
        // Rod extended forward during cast
        switch (direction) {
          case 'TOP': return { x: 0, y: -3 };
          case 'BOTTOM': return { x: 0, y: 3 };
          case 'LEFT': return { x: -3, y: 0 };
          case 'RIGHT': return { x: 3, y: 0 };
          case 'TOP_LEFT': return { x: -2, y: -2 };
          case 'TOP_RIGHT': return { x: 2, y: -2 };
          case 'BOTTOM_LEFT': return { x: -2, y: 2 };
          case 'BOTTOM_RIGHT': return { x: 2, y: 2 };
          default: return { x: 3, y: 0 };
        }

      case 'catching':
        // Rod positioned for catching (slightly forward)
        switch (direction) {
          case 'TOP': return { x: 0, y: -2 };
          case 'BOTTOM': return { x: 0, y: -1 };
          case 'LEFT': return { x: 0, y: 2 };
          case 'RIGHT': return { x: 2, y: 5 };
          case 'TOP_LEFT': return { x: -1, y: -1 };
          case 'TOP_RIGHT': return { x: 1, y: -1 };
          case 'BOTTOM_LEFT': return { x: -1, y: 1 };
          case 'BOTTOM_RIGHT': return { x: 1, y: 1 };
          default: return { x: 2, y: 0 };
        }

      case 'reeling':
        // Rod pulled back during reeling 
        switch (direction) {
          case 'TOP': return { x: 0, y: 5 }; // Pull rod down
          case 'BOTTOM': return { x: 0, y: -3 }; // Pull rod up
          case 'LEFT': return { x: 11, y: -2 }; // Pull rod back (right)
          case 'RIGHT': return { x: -15, y: -2 }; // Pull rod back (left)
          case 'TOP_LEFT': return { x: 3, y: 3 }; // Pull back diagonally
          case 'TOP_RIGHT': return { x: -3, y: 3 }; // Pull back diagonally
          case 'BOTTOM_LEFT': return { x: 3, y: -3 }; // Pull back diagonally
          case 'BOTTOM_RIGHT': return { x: -3, y: -3 }; // Pull back diagonally
          default: return { x: -5, y: -2 };
        }

      case 'waiting':
        // Rod in relaxed waiting position
        return { x: 0, y: 1 }; // Slightly lower

      case 'idle':
      default:
        // No additional offset for idle state
        return { x: 0, y: 0 };
    }
  }

  /**
   * Update the fishing line position and appearance
   */
  private updateFishingLine(): void {
    if (!this.fishingLine || !this.character || !this.floater) return;

    // Clear previous line
    this.fishingLine.clear();

    // Get character direction and line attachment point
    const direction = this.getCharacterDirection();
    const linePoint = this.getCharacterLinePoint(direction, this.fishingState);

    // Calculate line positions
    const characterX = linePoint.x;
    const characterY = linePoint.y;
    const floaterX = this.floater.x;
    const floaterY = this.floater.y;

    // Calculate distance for line thickness variation
    const distance = Phaser.Math.Distance.Between(characterX, characterY, floaterX, floaterY);
    const baseThickness = 1;
    const thickness = Math.max(1, baseThickness - (distance / 200)); // Thinner for longer distances

    // Set line style - white color for fishing line
    this.fishingLine.lineStyle(thickness, 0xFFFFFF, 0.8); // White color with slight transparency

    // Draw the main line
    this.fishingLine.beginPath();
    this.fishingLine.moveTo(characterX, characterY);

    // For a realistic fishing line, use a straight line with slight variations
    // Instead of curves, we'll draw multiple line segments to simulate the line sag
    const segments = 5;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = characterX + (floaterX - characterX) * t;
      const y = characterY + (floaterY - characterY) * t + Math.sin(t * Math.PI) * (distance / 20); // Slight sag

      if (i === 0) {
        this.fishingLine.moveTo(x, y);
      } else {
        this.fishingLine.lineTo(x, y);
      }
    }
    this.fishingLine.strokePath();

    // Add subtle shadow/depth effect
    this.fishingLine.lineStyle(Math.max(1, thickness + 1), 0x000000, 0.3);
    this.fishingLine.beginPath();
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = characterX + (floaterX - characterX) * t + 1;
      const y = characterY + (floaterY - characterY) * t + Math.sin(t * Math.PI) * (distance / 20) + 1;

      if (i === 0) {
        this.fishingLine.moveTo(x, y);
      } else {
        this.fishingLine.lineTo(x, y);
      }
    }
    this.fishingLine.strokePath();
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
      `Progress: ${this.fishCaught}/${this.completionData?.TotalFish || 5} fish`,
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

    // Create fish storage box in bottom right corner (after UI camera is set up)
    this.fishBox = BoxFactory.createBox(this);
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

    // Remove biting fish shadow if it exists
    this.removeBitingFishShadow();

    // Remove catch button if it exists
    this.removeCatchButton();

    // Remove fish celebration if it exists
    this.removeFishCelebration();

    // Stop any playing sounds
    if (this.fishSplashingSound) {
      this.fishSplashingSound.stop();
      this.fishSplashingSound = null;
    }

    // Clear any timers
    if (this.fishingTimer) {
      this.fishingTimer.remove();
      this.fishingTimer = null;
    }

    // Clean up fish shadows
    this.cleanupFishShadows();

    // Clean up fish box
    if (this.fishBox) {
      BoxFactory.destroy();
      this.fishBox = null;
    }

    // Clean up keyboard animation timer
    if (this.keyboardAnimationTimer) {
      this.keyboardAnimationTimer.remove();
      this.keyboardAnimationTimer = null;
    }

    // Clean up fish quiz modal
    if (this.fishQuizModal) {
      this.fishQuizModal.close();
    }

    // Clear quiz data list
    this.fishQuizDataList = [];
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
 * Find a nearby fish shadow or spawn a new one to bite the floater
 */
  private spawnBitingFishShadow(): void {
    if (!this.floater) {
      console.warn('Cannot spawn biting fish shadow: no floater present');
      return;
    }

    // First, try to find a nearby existing fish shadow
    const nearbyFish = this.findNearbyFishShadow(this.floater.x, this.floater.y, 300); // Search within 300px

    if (nearbyFish) {
      const distance = Phaser.Math.Distance.Between(this.floater.x, this.floater.y, nearbyFish.fish.x, nearbyFish.fish.y);
      console.log(`Found nearby fish shadow (${Math.round(distance)}px away), redirecting to floater`);
      this.redirectFishToFloater(nearbyFish.fish, nearbyFish.size);
    } else {
      console.log(`No nearby fish found within 300px (${this.fishShadows.length} total fish in area), spawning new fish shadow`);
      this.spawnNewBitingFishShadow();
    }
  }

  /**
   * Find the nearest fish shadow within a given radius
   */
  private findNearbyFishShadow(x: number, y: number, radius: number): { fish: Phaser.GameObjects.Sprite, size: FishShadowSize } | null {
    let nearestFish: Phaser.GameObjects.Sprite | null = null;
    let nearestDistance = radius;
    let fishSize: FishShadowSize = FishShadowSize.MEDIUM;

    for (const fishShadow of this.fishShadows) {
      if (!fishShadow || !fishShadow.active) continue;

      const distance = Phaser.Math.Distance.Between(x, y, fishShadow.x, fishShadow.y);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestFish = fishShadow;

        // Try to determine fish size from texture key
        const textureKey = fishShadow.texture.key;
        if (textureKey.includes('big')) {
          fishSize = FishShadowSize.BIG;
        } else if (textureKey.includes('small')) {
          fishSize = FishShadowSize.SMALL;
        } else {
          fishSize = FishShadowSize.MEDIUM;
        }
      }
    }

    return nearestFish ? { fish: nearestFish, size: fishSize } : null;
  }

  /**
   * Redirect an existing fish shadow to swim to the floater
   */
  private redirectFishToFloater(fishShadow: Phaser.GameObjects.Sprite, size: FishShadowSize): void {
    if (!fishShadow || !fishShadow.active) return;

    // Stop any existing tweens on this fish
    this.tweens.killTweensOf(fishShadow);

    // Remove from regular fish shadows array and add to biting fish
    const index = this.fishShadows.indexOf(fishShadow);
    if (index > -1) {
      this.fishShadows.splice(index, 1);
    }

    this.bitingFishShadow = fishShadow;

    console.log(`Redirecting existing fish shadow: ${size} from (${Math.round(fishShadow.x)}, ${Math.round(fishShadow.y)}) to floater at (${Math.round(this.floater!.x)}, ${Math.round(this.floater!.y)})`);

    // Start swimming toward the floater
    this.animateFishShadowToFloater(fishShadow, size);
  }

  /**
   * Spawn a completely new fish shadow to bite the floater
   */
  private spawnNewBitingFishShadow(): void {
    if (!this.floater) return;

    // Get a spawn position near the floater but not too close
    const spawnDistance = Phaser.Math.Between(120, 200);
    const angle = Phaser.Math.Between(0, 360) * (Math.PI / 180);

    const spawnX = this.floater.x + Math.cos(angle) * spawnDistance;
    const spawnY = this.floater.y + Math.sin(angle) * spawnDistance;

    // Ensure spawn position is in water
    const validSpawnPosition = this.getValidMoveTarget(this.floater.x, this.floater.y, spawnX, spawnY);

    // Random size for the biting fish
    const size = FishShadowFactory.getRandomSize();

    // Create the fish shadow
    this.bitingFishShadow = FishShadowFactory.createFishShadow(
      this,
      validSpawnPosition.x,
      validSpawnPosition.y,
      size,
      FishShadowAction.APPEARING,
      FishShadowDirection.RIGHT // Will be updated when swimming
    );

    console.log(`Spawned new biting fish shadow: ${size} at (${validSpawnPosition.x}, ${validSpawnPosition.y})`);

    // Start with appearing animation
    try {
      FishShadowFactory.playAppearingAnimation(this, this.bitingFishShadow, size, () => {
        // After appearing, swim towards the floater
        this.animateFishShadowToFloater(this.bitingFishShadow!, size);
      });
    } catch (error) {
      console.warn('Failed to play appearing animation for biting fish:', error);
      // If appearing fails, directly swim to floater
      this.animateFishShadowToFloater(this.bitingFishShadow, size);
    }
  }

  /**
   * Animate the fish shadow swimming towards the floater to bite it
   */
  private animateFishShadowToFloater(fishShadow: Phaser.GameObjects.Sprite, size: FishShadowSize): void {
    if (!fishShadow || !fishShadow.active || !this.floater) {
      return;
    }

    // Calculate direction from fish to floater
    const deltaX = this.floater.x - fishShadow.x;
    const deltaY = this.floater.y - fishShadow.y;

    // Determine swimming direction based on movement vector
    let swimDirection: FishShadowDirection;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal movement is dominant
      swimDirection = deltaX > 0 ? FishShadowDirection.RIGHT : FishShadowDirection.LEFT;
    } else {
      // Vertical movement is dominant
      swimDirection = deltaY > 0 ? FishShadowDirection.BOTTOM : FishShadowDirection.TOP;
    }

    // For diagonal movement, combine directions
    if (Math.abs(deltaX) > 20 && Math.abs(deltaY) > 20) {
      if (deltaX > 0 && deltaY > 0) swimDirection = FishShadowDirection.BOTTOM_RIGHT;
      else if (deltaX < 0 && deltaY > 0) swimDirection = FishShadowDirection.BOTTOM_LEFT;
      else if (deltaX > 0 && deltaY < 0) swimDirection = FishShadowDirection.TOP_RIGHT;
      else if (deltaX < 0 && deltaY < 0) swimDirection = FishShadowDirection.TOP_LEFT;
    }

    console.log(`Fish swimming to floater: direction ${swimDirection}`);

    // Start swimming animation
    try {
      FishShadowFactory.playSwimmingAnimation(this, fishShadow, size, swimDirection);
    } catch (error) {
      console.warn('Failed to start swimming animation for biting fish:', error);
    }

    // Animate movement to floater
    const duration = Phaser.Math.Between(1500, 2500); // Swimming duration

    this.tweens.add({
      targets: fishShadow,
      x: this.floater.x,
      y: this.floater.y,
      duration: duration,
      ease: 'Power2',
      onComplete: () => {
        // Fish has reached the floater - trigger bite!
        console.log('Fish shadow reached floater, triggering bite');

        // Stop swimming animation
        try {
          FishShadowFactory.stopSwimmingAnimation(fishShadow, size, swimDirection, 1);
        } catch (error) {
          console.warn('Failed to stop swimming animation:', error);
        }

        // Remove the biting fish shadow (it "disappears" into the bite)
        this.removeBitingFishShadow();

        // Trigger the fish bite event
        this.fishBite();
      }
    });
  }

  /**
   * Remove the biting fish shadow
   */
  private removeBitingFishShadow(): void {
    if (this.bitingFishShadow) {
      // Stop any ongoing tweens
      this.tweens.killTweensOf(this.bitingFishShadow);

      // Make sure it's not in the regular fish shadows array
      const index = this.fishShadows.indexOf(this.bitingFishShadow);
      if (index > -1) {
        this.fishShadows.splice(index, 1);
      }

      this.bitingFishShadow.destroy();
      this.bitingFishShadow = null;
    }
  }

  /**
   * Show a catch button above the player's head when fish is biting
   */
  private showCatchButton(): void {
    if (!this.character) return;

    // Remove existing button if any
    this.removeCatchButton();

    // Create a container for the button
    this.catchButton = this.add.container(this.character.x, this.character.y - 60);

    // Create button background (adjusted size for keyboard gif)
    const buttonBg = this.add.rectangle(0, 0, 80, 40, 0xe74c3c, 0.9)
      .setStrokeStyle(2, 0xffffff, 1);

    // Create animated keyboard sprite instead of text
    const keyboardSprite = this.add.image(0, 0, 'keyboard-frame-1');
    keyboardSprite.setOrigin(0.5);
    keyboardSprite.setScale(0.15); // Scale down to fit nicely in the button (488x185 -> ~58x22)

    // Create animation by alternating between frames
    let currentFrame = 1;
    this.keyboardAnimationTimer = this.time.addEvent({
      delay: 200, // Switch frames every 500ms
      callback: () => {
        if (keyboardSprite && keyboardSprite.active) {
          currentFrame = currentFrame === 1 ? 2 : 1;
          keyboardSprite.setTexture(`keyboard-frame-${currentFrame}`);
        }
      },
      loop: true
    });

    // Create pulsing exclamation mark (smaller)
    const exclamation = this.add.text(0, -22, '!', {
      fontSize: '16px',
      color: '#ffff00',
      fontStyle: 'bold',
      stroke: '#ff0000',
      strokeThickness: 1
    }).setOrigin(0.5);

    // Add all elements to container
    this.catchButton.add([buttonBg, keyboardSprite, exclamation]);

    // Set depth to appear above everything else
    this.catchButton.setDepth(1001);

    // Make sure it's visible to main camera only
    const cameras = this.cameras.cameras;
    for (let i = 1; i < cameras.length; i++) {
      const camera = cameras[i];
      if (camera && camera !== this.cameras.main) {
        camera.ignore(this.catchButton);
      }
    }

    // Make button interactive
    buttonBg.setInteractive({ useHandCursor: true });

    // Add hover effects
    buttonBg.on('pointerover', () => {
      buttonBg.setFillStyle(0xc0392b, 1);
      buttonBg.setScale(1.05);
    });

    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(0xe74c3c, 0.9);
      buttonBg.setScale(1);
    });

    // Add click handler
    buttonBg.on('pointerdown', () => {
      this.handleCatchAttempt();
    });

    // Add pulsing animation to exclamation mark
    this.tweens.add({
      targets: exclamation,
      scaleX: 1.3,
      scaleY: 1.3,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Add gentle bobbing animation to entire button
    this.tweens.add({
      targets: this.catchButton,
      y: this.character.y - 65,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    console.log('Catch button displayed above player');
  }

  /**
   * Remove the catch button
   */
  private removeCatchButton(): void {
    if (this.catchButton) {
      // Stop any tweens on the button
      this.tweens.killTweensOf(this.catchButton);

      // Check if container has children and stop their tweens too
      if (this.catchButton.list && this.catchButton.list.length > 0) {
        this.catchButton.list.forEach(child => {
          this.tweens.killTweensOf(child);
        });
      }

      // Stop keyboard animation timer
      if (this.keyboardAnimationTimer) {
        this.keyboardAnimationTimer.remove();
        this.keyboardAnimationTimer = null;
      }

      this.catchButton.destroy();
      this.catchButton = null;
      console.log('Catch button removed');
    }
  }

  /**
   * Handle catch attempt (from button click or space key)
   */
  private handleCatchAttempt(): void {
    if (this.fishingState === 'catching') {
      // Change animation from reel to pull when catch is attempted
      if (this.character) {
        CharacterFactory.setCharacterAction(
          this.character,
          this,
          CharacterActionType.FISHING_PULL,
          this.currentCharacterType
        );
      }

      // Remove the catch button
      this.removeCatchButton();

      // Proceed with catching the fish
      this.catchFish();

      console.log('Fish caught via button/space!');
    }
  }

  /**
   * Update catch button position to follow character
   */
  private updateCatchButton(): void {
    if (this.catchButton && this.character) {
      // Keep button positioned above character's head
      this.catchButton.x = this.character.x;
      // Don't update y position as it's handled by the bobbing animation
    }
  }

  /**
   * Show fish celebration with lighting effects after quiz success
   */
  private showFishCelebration(fishType: FishType, onComplete: () => void): void {
    if (!this.currentFish || !this.player) return;

    // Get camera zoom for scaling calculations
    const cameraZoom = this.cameras.main.zoom;

    // Pause the game
    this.physics.pause();

    // Create celebration container above the player
    this.fishCelebrationContainer = this.add.container(
      this.player.x,
      this.player.y - 70 // Position above the player, moved down 50px
    );

    // Create dark overlay centered on player
    const overlay = this.add.rectangle(
      this.player.x,
      this.player.y,
      this.cameras.main.width * 2,
      this.cameras.main.height * 2,
      0x000000,
      0.7
    );
    overlay.setDepth(2000);

    // Create main celebration background
    const celebrationBg = this.add.rectangle(
      0, 0,
      300, 200,
      0x2c3e50,
      0.95
    ).setStrokeStyle(4, 0xf39c12, 1);

    // Create "Fish Obtained!" text
    const titleText = this.add.text(0, -60, 'Fish Obtained!', {
      fontSize: '24px',
      color: '#f39c12',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5);

    // Create fish sprite using FishFactory
    const fishSprite = FishFactory.createFish(this, 0, -10, fishType);
    fishSprite.setScale(4);

    // Create fish name
    const fishName = this.formatFishName(fishType);
    const fishNameText = this.add.text(0, 40, fishName, {
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2
    }).setOrigin(0.5);

    // Add all elements to celebration container
    this.fishCelebrationContainer.add([
      celebrationBg,
      titleText,
      fishSprite,
      fishNameText
    ]);

    // Set high depth for celebration
    this.fishCelebrationContainer.setDepth(2001);

    // Make sure basic celebration elements are visible to main camera only
    const cameras = this.cameras.cameras;
    for (let i = 1; i < cameras.length; i++) {
      const camera = cameras[i];
      if (camera && camera !== this.cameras.main) {
        camera.ignore([overlay, this.fishCelebrationContainer]);
      }
    }

    // Scale in animation for the celebration - adjust for camera zoom
    const targetScale = 1 / cameraZoom; // Inverse scale to maintain size regardless of zoom

    this.fishCelebrationContainer.setScale(0);
    this.tweens.add({
      targets: this.fishCelebrationContainer,
      scaleX: targetScale,
      scaleY: targetScale,
      duration: 500,
      ease: 'Back.easeOut'
    });

    // Pulsing effect for the fish
    this.tweens.add({
      targets: fishSprite,
      scaleX: fishSprite.scaleX * 1.1,
      scaleY: fishSprite.scaleY * 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Variables to store effects (will be created after delay)
    let lightRays: Phaser.GameObjects.Graphics | null = null;
    let particles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    // Add celebration effects after a short delay (after container animation completes)
    this.time.delayedCall(600, () => {
      // Create rotating light rays around the fish
      lightRays = this.add.graphics();
      lightRays.setDepth(2000);

      // Scale light rays with camera zoom
      const rayScale = 1 / cameraZoom;
      lightRays.setScale(rayScale);

      // Draw light rays positioned around the celebration container center
      for (let i = 0; i < 8; i++) {
        const angle = (i * 45) * (Math.PI / 180);
        const rayLength = 120; // Fixed ray length for container scale
        const innerRadius = 50; // Inner radius around container

        lightRays.lineStyle(3, 0xffd700, 0.6);
        lightRays.beginPath();
        lightRays.moveTo(
          this.fishCelebrationContainer!.x + Math.cos(angle) * innerRadius,
          this.fishCelebrationContainer!.y + Math.sin(angle) * innerRadius
        );
        lightRays.lineTo(
          this.fishCelebrationContainer!.x + Math.cos(angle) * rayLength,
          this.fishCelebrationContainer!.y + Math.sin(angle) * rayLength
        );
        lightRays.strokePath();
      }

      // Animate light rays rotation
      this.tweens.add({
        targets: lightRays,
        rotation: Math.PI * 2,
        duration: 2000,
        repeat: -1,
        ease: 'Linear'
      });

      // Create sparkling particles positioned around celebration container
      particles = this.add.particles(
        this.fishCelebrationContainer!.x,
        this.fishCelebrationContainer!.y,
        'star-blinking',
        {
          scale: { start: 0.3, end: 0 },
          alpha: { start: 1, end: 0 },
          speed: { min: 30, max: 80 },
          lifespan: 1500,
          frequency: 80,
          quantity: 3,
          emitZone: {
            source: new Phaser.Geom.Circle(0, 0, 80),
            type: 'edge',
            quantity: 3
          }
        }
      );
      particles.setDepth(2002);

      // Make sure effects are visible to main camera only
      for (let i = 1; i < cameras.length; i++) {
        const camera = cameras[i];
        if (camera && camera !== this.cameras.main) {
          camera.ignore([lightRays, particles]);
        }
      }
    });

    // Auto-close after 3 seconds
    this.time.delayedCall(3000, () => {
      // Scale out animation
      this.tweens.add({
        targets: [this.fishCelebrationContainer, overlay],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.removeFishCelebration();
          // Resume physics
          this.physics.resume();
          onComplete();
        }
      });

      // Stop particles and light rays if they exist
      if (particles) {
        particles.destroy();
      }
      if (lightRays) {
        lightRays.destroy();
      }
    });
  }

  /**
   * Remove fish celebration display
   */
  private removeFishCelebration(): void {
    if (this.fishCelebrationContainer) {
      this.fishCelebrationContainer.destroy();
      this.fishCelebrationContainer = null;
    }
  }

  /**
   * Format fish name for display
   */
  private formatFishName(fishType: FishType): string {
    return fishType
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Handle quiz success logic after celebration
   */
  private handleQuizSuccess(data: any): void {
    // Store quiz data if provided
    if (data.quizData) {
      this.fishQuizDataList.push(data.quizData);
      console.log('Stored quiz data for fish:', data.quizData.fishType);
    }

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

      // Add the caught fish to the storage box
      this.addFishToBox(this.currentFish);

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

    // Clean up fishing
    this.cleanUpFishing();
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
   * Add a caught fish to the storage box
   * @param fishType The type of fish to add to the box
   */
  private addFishToBox(fishType: FishType): void {
    // Generate the fish texture key (same logic as FishFactory)
    const fishKey = this.generateFishTextureKey(fishType);

    // Add fish to the box using BoxFactory with click callback
    const wasAdded = BoxFactory.addFish(this, fishKey, (fishIndex: number) => {
      this.onFishClicked(fishIndex);
    });

    if (wasAdded) {
      console.log(`Added ${fishType} to storage box`);
    } else {
      console.log(`Storage box is full, cannot add ${fishType}`);
      // TODO: Could show notification that box is full
    }
  }

  /**
   * Handle fish click in the storage box
   * @param fishIndex The index of the clicked fish
   */
  private onFishClicked(fishIndex: number): void {
    // Find the corresponding quiz data for this fish
    if (fishIndex < this.fishQuizDataList.length) {
      const quizData = this.fishQuizDataList[fishIndex];
      if (this.fishQuizModal) {
        this.fishQuizModal.show(quizData);
      }
    } else {
      console.warn('No quiz data found for fish index:', fishIndex);
    }
  }



  /**
   * Generate the texture key for a fish (matches FishFactory logic)
   * For shark pattern fish, uses inventory version for box display
   * @param fishType The fish type
   * @returns The texture key to use for loading the fish image
   */
  private generateFishTextureKey(fishType: FishType): string {
    const variants = fishVariants[fishType];

    // If this fish has variants, randomly select one
    if (variants && variants.length > 0) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      // For shark pattern fish, use inventory version for box display
      if (isSharkPattern(fishType)) {
        return `fish-${fishType}-${variant}-inventory`;
      }
      return `fish-${fishType}-${variant}`;
    } else {
      // For shark pattern fish, use inventory version for box display
      if (isSharkPattern(fishType)) {
        return `fish-${fishType}-inventory`;
      }
      return `fish-${fishType}`;
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

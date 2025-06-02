import { GameState } from '../types/gameState';
import { BoatFactory, BoatType } from '../factories/boatFactory';
import { CharacterFactory, CharacterType, CharacterActionType } from '../factories/characterFactory';
import { FishType } from '../const/fishType';
import { FloaterFactory, FloaterType } from '../factories/floaterFactory';
import { CompletionData, fetchCompletionData } from '../datas/completion';
import { pointRules } from '../const/pointRules';

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
    score: 0
  };
  private completionData: CompletionData | null = null;
  private points: number = 0;
  private pointsText!: Phaser.GameObjects.Text;
  private currentBoatType: BoatType = BoatType.BLUE;
  private currentCharacterType: CharacterType = CharacterType.LIGHT; // Default character type
  private shouldReset: boolean = false;

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
        score: 0
      };
      this.points = 0;
      this.fishCaught = 0;
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

    // Add all UI elements to the container
    uiContainer.add([bg, this.livesText, ...this.livesIcons, this.fishCaughtText, this.pointsText, this.coordsText]);

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
      this.player.x,
      this.player.y - 90, // Position it higher than the regular points notification
      `SPEED BONUS: +${bonusPoints} points!`,
      {
        fontSize: '14px',
        color: '#ff00ff', // Magenta color for bonus points
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3
      }
    ).setOrigin(0.5);

    // Animate the notification with a special effect
    this.tweens.add({
      targets: notification,
      y: notification.y - 80,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 2500,
      ease: 'Bounce.Out',
      onComplete: () => notification.destroy()
    });
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

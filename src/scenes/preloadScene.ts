import { BodyColor } from "../const/bodyType";
import { RodType, RodCatchAssets, RodThrowAssets, RodPullAssets, RodReelAssets } from "../const/rodType";
import { FishType, getFishPath, fishSizes, FishVariantType, fishVariants, hasFishVariants } from '../const/fishType';
import { FishFactory } from '../factories/fishFactory';

// Define a global variable to store the questions
declare global {
  interface Window {
    QUIZ_QUESTIONS: any[];
  }
}

export class PreloadScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  public defaultCharacterColor: 'light' | 'dark' | 'brown' | 'black' = 'light';
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Create loading bar
    this.createLoadingBar();

    // Register loading progress event
    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0xffffff, 1);
      this.progressBar.fillRect(
        this.cameras.main.width / 4,
        this.cameras.main.height / 2 - 16,
        (this.cameras.main.width / 2) * value,
        32
      );
    });

    // Register complete event
    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.loadingBar.destroy();
    });

    // Load all game assets
    this.loadAssets();
  }

  create(): void {
    // Mock API fetch for question bank
    this.fetchQuestionBank().then(() => {
      this.scene.start('MenuScene');
    });
  }

  private async fetchQuestionBank(): Promise<void> {
    // Simulate API delay
    return new Promise((resolve) => {
      console.log('Fetching question bank from API...');

      // Simulate network delay (1 second)
      setTimeout(() => {
        // Import question bank from local file
        import('../datas/quesionBank').then(module => {
          // Store questions in global variable for access across scenes
          window.QUIZ_QUESTIONS = module.questionBank;
          console.log('Question bank loaded:', window.QUIZ_QUESTIONS.length, 'questions');
          resolve();
        });
      }, 1000);
    });
  }

  private createLoadingBar(): void {
    this.loadingBar = this.add.graphics();
    this.loadingBar.fillStyle(0x222222, 0.8);
    this.loadingBar.fillRect(
      this.cameras.main.width / 4 - 2,
      this.cameras.main.height / 2 - 18,
      this.cameras.main.width / 2 + 4,
      36
    );
    this.progressBar = this.add.graphics();
  }

  private loadAssets(): void {
    // set default character color:
    this.defaultCharacterColor = 'light';
    // Load boats as spritesheets (8 frames for 8 directions)
    this.load.spritesheet('boat-fishing_boat_blue', 'assets/boats/fishing_boat_blue/full_boat.png', {
      frameWidth: 128, // Adjust these values based on your actual sprite dimensions
      frameHeight: 128
    });
    this.load.spritesheet('boat-fishing_boat_yellow', 'assets/boats/fishing_boat_yellow/full_boat.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.spritesheet('boat-small_boat', 'assets/boats/small_boat/full_boat.png', {
      frameWidth: 128,
      frameHeight: 128
    });
    this.load.image('all-boats', 'assets/boats/all_full_boats.png');

    // Load fish (we'll load a few for now, can add more as needed)
    this.load.image('all-fish', 'assets/fish/all_fish.png');

    // Use FishFactory to load all fish spritesheets
    // Each fish has a 32x32 spritesheet with 2 rows and 2 frames per row
    FishFactory.loadAllFishAssets(this);

    // Log the number of fish types and variants loaded
    let variantCount = 0;
    Object.values(FishType).forEach(fishType => {
      variantCount += fishVariants[fishType as FishType].length;
    });
    console.log(`Loaded ${Object.keys(FishType).length} fish types and ${variantCount} variants`);


    // Load fishing equipment
    this.load.image('fishing-rod', 'assets/fishing_rods/fishing_rod.png');
    this.load.image('floater', 'assets/floaters/floater.png');
    this.load.image('lure', 'assets/lure/lure.png');

    // Load background
    this.load.image('menu-background', 'assets/background/background_v1.png');

    // Load floater animations
    this.load.spritesheet('floater-fish-biting', 'assets/animations/bobber_fish_bitting/bobber_fish_bitting_animation.png', {
      frameWidth: 48,
      frameHeight: 48
    });

    // Load floater floating animation frames individually
    for (let i = 1; i <= 5; i++) {
      const frameNumber = String(i).padStart(4, '0'); // Format as 0001, 0002, etc.
      this.load.image(
        `floater-floating-${i}`,
        `assets/animations/bobber_floating_animation/boober_red_floating_animation_${frameNumber}.png`
      );
    }

    // Load fishing rod assets for different rod types and actions as spritesheets
    // Each spritesheet has 4 rows (for directions) and 5 columns (for animation frames)
    Object.keys(RodType).forEach(rodKey => {
      const rodType = rodKey as keyof typeof RodType;

      // Throw action
      this.load.spritesheet(`rod-throw-${rodType}`, RodThrowAssets[rodType], {
        frameWidth: 64,
        frameHeight: 64
      });

      // Pull action
      this.load.spritesheet(`rod-pull-${rodType}`, RodPullAssets[rodType], {
        frameWidth: 64,
        frameHeight: 64
      });

      // Reel action
      this.load.spritesheet(`rod-reel-${rodType}`, RodReelAssets[rodType], {
        frameWidth: 64,
        frameHeight: 64
      });

      // Catch action
      this.load.spritesheet(`rod-catch-${rodType}`, RodCatchAssets[rodType], {
        frameWidth: 64,
        frameHeight: 64
      });
    });

    // Load UI elements
    this.load.image('button', 'assets/ui_fishing_minigame/button.png');
    this.load.image('panel', 'assets/ui_fishing_minigame/panel.png');
    this.load.image('heart-icon', 'assets/game_ui/icons/heart-icon.png'); // 16x16 heart icon for lives
    this.load.image('paper-bg', 'assets/ui/paper-bg.png'); // Paper background for quiz
    this.load.image('game-over-bg', 'assets/background/game_over.png'); // Game over background image

    // Load fish information JSON
    this.load.json('fishInfo', 'assets/data/fishInfo.json');

    // Load sound effects
    this.load.audio('bait-hit-water', 'assets/sounds/bait-hit-water.mp3');
    this.load.audio('rod-reels', 'assets/sounds/rod-reels.mp3');
    this.load.audio('star-blinking', 'assets/sounds/star-blinking.mp3');
    this.load.audio('fish-splashing', 'assets/sounds/fish-splashing.mp3');

    // Load background music
    this.load.audio('game-background-music', 'assets/sounds/game-background-music.mp3');

    // Load character animations for fishing actions as spritesheets
    // Each spritesheet has 4 rows (for directions) and 5 columns (for animation frames)

    // character_tools_fishing_rod_catch_body_light
    this.load.spritesheet('character-fishing-throw',
      `assets/character/tool_fishing_rod_throw/character_body/character_tools_fishing_rod_throw_body_${this.defaultCharacterColor}.png`,
      {
        frameWidth: 64,  // Adjust based on your actual sprite dimensions
        frameHeight: 64
      }
    );

    // Fishing rod pull
    this.load.spritesheet('character-fishing-pull',
      `assets/character/tool_fishing_rod_pull/character_body/character_tools_fishing_rod_pull_body_${this.defaultCharacterColor}.png`,
      {
        frameWidth: 64,
        frameHeight: 64
      }
    );

    // Fishing rod reel
    this.load.spritesheet('character-fishing-reel',
      `assets/character/tool_fishing_rod_reel/character_body/character_tools_fishing_rod_reel_body_${this.defaultCharacterColor}.png`,
      {
        frameWidth: 64,
        frameHeight: 64
      }
    );

    // Fishing rod catch (keeping for backward compatibility)
    this.load.spritesheet('character-catch',
      `assets/character/tool_fishing_rod_catch/character_body/character_tools_fishing_rod_catch_body_${this.defaultCharacterColor}.png`,
      {
        frameWidth: 64,
        frameHeight: 64
      }
    );

    // Load character idle sprites (8 frames for 4 directions - 2 frames per direction)
    this.load.spritesheet('character-idle-light', 'assets/character/idle/character_idle_body_light.png', {
      frameWidth: 64,  // Adjust based on your actual sprite dimensions
      frameHeight: 64
    });
    this.load.spritesheet('character-idle-dark', 'assets/character/idle/character_idle_body_dark.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    this.load.spritesheet('character-idle-brown', 'assets/character/idle/character_idle_body_brown.png', {
      frameWidth: 64,
      frameHeight: 64
    });
    // Also load the black variant that might be randomly selected
    this.load.spritesheet('character-idle-black', 'assets/character/idle/character_idle_body_black.png', {
      frameWidth: 64,
      frameHeight: 64
    });

    // Load completion data (mock backend)
    this.load.json('completion', 'src/datas/completion.json');
  }
}

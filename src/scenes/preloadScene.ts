import { BodyColor } from "../const/bodyType";
import { RodType, RodCatchAssets, RodThrowAssets, RodPullAssets, RodReelAssets } from "../const/rodType";
import { FishType, getFishPath, fishSizes, FishVariantType, fishVariants, hasFishVariants } from '../const/fishType';
import { FishFactory } from '../factories/fishFactory';
import { CursorManager } from '../managers/cursorManager';
import { StandardSettingManager } from '../managers/standardSettingManager';
import { HourglassLoadingBar } from '../components/HourglassLoadingBar';
// @ts-ignore
import gameSdk from '../service/apiService.js';
import { QuizQuestion } from "types/quiz.model";
// Define global variables to store the questions and total count
declare global {
  interface Window {
    QUIZ_QUESTIONS: any[];
    TOTAL_QUESTIONS: number;
    GAME_ATTEMPT_ID: string;
  }
}

export class PreloadScene extends Phaser.Scene {
  private hourglassLoadingBar: HourglassLoadingBar | null = null;
  public defaultCharacterColor: 'light' | 'dark' | 'brown' | 'black' = 'light';
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Initialize hourglass loading bar
    this.hourglassLoadingBar = new HourglassLoadingBar(this);

    // Show loading screen
    this.hourglassLoadingBar.show('Loading game assets...');

    // Register loading progress event
    this.load.on('progress', (value: number) => {
      if (this.hourglassLoadingBar) {
        this.hourglassLoadingBar.updateProgress(value, `Loading... ${Math.round(value * 100)}%`);
      }
    });

    // Register complete event
    this.load.on('complete', () => {
      // Loading bar will auto-hide when progress reaches 100%
    });

    // Load all game assets
    this.loadAssets();
  }

  create(): void {
    // Log URL parameters from apiService
    console.log('Game URL Parameters loaded from apiService');

    // Call getQuestion API instead of using mock data
    this.fetchQuestionFromAPI();
  }

  private fetchQuestionFromAPI(): void {
    // Show loading message
    if (this.hourglassLoadingBar) {
      this.hourglassLoadingBar.show('Fetching questions from server...');
    }

    // Call getQuestion API with callbacks
    gameSdk.getQuestion(
      // Progress callback
      (event: ProgressEvent) => {
        if (this.hourglassLoadingBar && event.lengthComputable) {
          const progress = event.loaded / event.total;
          this.hourglassLoadingBar.updateProgress(progress, `Loading questions... ${Math.round(progress * 100)}%`);
        }
      },
      // Success callback
      (data: any) => {
        console.log('Questions loaded successfully:', data);
        let quizQuestions: QuizQuestion = data.question || null;
        // Store questions in global variable for access across scenes
        window.QUIZ_QUESTIONS = data.question || [];

        // Store the total number of questions for completion logic
        window.TOTAL_QUESTIONS = (data.question || []).length;

        // Initialize standard setting from API response
        StandardSettingManager.init(data.standardSetting || null);

        console.log('data', data);
        console.log(`Loaded ${window.TOTAL_QUESTIONS} questions from API`);

        // Check if questions are null or empty
        if (!data.question || data.question.length === 0) {
          console.error('No questions available');
          this.scene.start('ErrorScene');
          return;
        }

        // Start the menu scene
        this.scene.start('MenuScene');
      },
      // Error callback
      () => {
        console.error('Failed to load questions from API');

        // Show error scene instead of falling back silently
        console.log('Showing error scene');
        
        // Start the error scene to inform the user
        this.scene.start('ErrorScene');
      }
    );
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
    this.load.image('errorBackground', 'assets/background/background_v1.png');

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
    this.load.image('heart-icon', 'assets/game_ui/icons/heart-icon.png'); // 16x16 heart icon for lives
    this.load.image('game-over-bg', 'assets/background/game_over.png'); // Game over background image

    // Load fish information JSON
    this.load.json('fishInfo', 'assets/data/fishInfo.json');

    // Load custom cursor assets
    CursorManager.init(this);

    // Load sound effects
    this.load.audio('bait-hit-water', 'assets/sounds/bait-hit-water.mp3');
    this.load.audio('rod-reels', 'assets/sounds/rod-reels.mp3');
    this.load.audio('star-blinking', 'assets/sounds/star-blinking.mp3');
    this.load.audio('fish-splashing', 'assets/sounds/fish-splashing.mp3');

    // Load star animation frames (1-13 frames, 32x32 px)
    for (let i = 1; i <= 13; i++) {
      const frameNumber = String(i).padStart(4, '0'); // Format as 0001, 0002, etc.
      this.load.image(
        `star-frame-${i}`,
        `assets/effect/star/star_${frameNumber}.png`
      );
    }

    // Load blink animation frames (1-4 frames, 32x32 px)
    for (let i = 1; i <= 4; i++) {
      const frameNumber = String(i).padStart(4, '0'); // Format as 0001, 0002, etc.
      this.load.image(
        `blink-frame-${i}`,
        `assets/effect/blink/blink_${frameNumber}.png`
      );
    }

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

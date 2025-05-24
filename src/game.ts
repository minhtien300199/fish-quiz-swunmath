import 'phaser';
import { BootScene } from './scenes/bootScene';
import { PreloadScene } from './scenes/preloadScene';
import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';
import { QuizScene } from './scenes/quizScene';
import { GameOverScene } from './scenes/gameOverScene';

export class Game extends Phaser.Game {
  constructor(config: Phaser.Types.Core.GameConfig) {
    // Add all scenes to the game
    const scenes = [
      BootScene,
      PreloadScene,
      MenuScene,
      GameScene,
      QuizScene,
      GameOverScene
    ];
    
    // Add scenes to the config
    config.scene = scenes;
    
    super(config);
  }
}

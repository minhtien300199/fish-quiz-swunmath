import 'phaser';
import { Game } from './game';

window.onload = () => {
  const gameConfig: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1920,  // Base resolution width
    height: 1080, // 16:9 aspect ratio height
    parent: 'game-container',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false
      }
    },
    scene: [],
    backgroundColor: '#4488aa',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    pixelArt: true,
    roundPixels: true
  };

  new Game(gameConfig);
};

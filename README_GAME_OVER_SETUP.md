# Game Over Background Setup

## To complete the game over background replacement:

1. Save the uploaded "GAME OVER" image as `assets/ui/game_over.png`
2. Make sure the image is in PNG format
3. The image will automatically be loaded and scaled to fit the screen

## Changes Made:

- Updated `src/scenes/preloadScene.ts` to load the game over background image
- Modified `src/scenes/gameOverScene.ts` to use the image instead of a solid color background
- The background image will scale automatically to cover the full screen while maintaining aspect ratio

## File Location:
```
assets/ui/game_over.png
```

The game over scene will now display your custom background image with the fishing theme! 
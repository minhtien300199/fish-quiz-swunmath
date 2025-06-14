# Fish Quiz Game

A fishing quiz game built with Phaser 3 and TypeScript. Catch fish and answer math questions to earn points!

## Game Overview

Fish Quiz is a fun educational game that combines fishing mechanics with math quizzes. Players control a boat, cast their fishing rod, and when they catch a fish, they must answer a math question correctly to keep the fish.

### Game Features

- Control a boat with WASD keys
- Cast your fishing rod with the spacebar
- Catch various types of fish
- Answer math questions to keep your catch
- Limited lives (3) - game over when all lives are lost
- Score tracking and fish count

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

### Running the Game

To start the development server:

```bash
npm start
```

This will open the game in your default browser at http://localhost:8080.

### Building for Production

To build the game for production:

```bash
npm run build
```

The built files will be in the `dist` directory.

## Game Controls

- **W**: Move boat up
- **A**: Move boat left
- **S**: Move boat down
- **D**: Move boat right
- **Spacebar**: Cast fishing rod / Reel in fish
- **Right-click**: Cast fishing rod / Reel in fish (alternative to spacebar)

## Game Rules

1. You have 3 lives
2. Move your boat around the lake to find good fishing spots
3. Press spacebar or right-click to cast your fishing rod
4. When a fish bites (the floater bobs), press spacebar or right-click to catch it
5. Answer the math question correctly to keep the fish
6. If you answer incorrectly or run out of time, you lose a life
7. Game ends when all lives are lost

## Assets

The game uses various assets located in the `assets` folder:
- Boats
- Fish (47 different types)
- Maps
- Characters
- UI elements

## Development

The game is built with:
- Phaser 3 - Game framework
- TypeScript - Programming language
- Webpack - Bundling tool

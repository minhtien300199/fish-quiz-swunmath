export interface GameState {
  lives: number;
  fishCaught: number;
  score: number;
  caughtFishTypes: string[]; // Array of fish types that have been caught (persistent)
  currentRunFish: string[]; // Fish caught only in the current game run
}

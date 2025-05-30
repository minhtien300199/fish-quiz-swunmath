
// Define rod types
export const RodType = {
  blackRed: 'black_red',
  blackYellow: 'black_yellow',
  blue: 'blue',
  green: 'green',
  purple: 'purple',
  red: 'red',
  yellow: 'yellow',
};

// Base paths for rod assets
const rodCatchBasePath = 'assets/character/tool_fishing_rod_catch/fishing_rods/character_fishing_rod_';
const rodThrowBasePath = 'assets/character/tool_fishing_rod_throw/fishing_rods/character_tools_fishing_rod_throw_rod_';
const rodPullBasePath = 'assets/character/tool_fishing_rod_pull/fishing_rods/character_tools_fishing_rod_pull_rod_';
const rodReelBasePath = 'assets/character/tool_fishing_rod_reel/fishing_rods/character_tools_fishing_rod_reel_rod_';

// Define rod directions based on frame order (same as character)
// Throw rod: 7x4 (4 rows 7 frame)
export enum RodDirectionThrow {
  DOWN_START = 14,  // First frame for DOWN direction
  DOWN_END = 20,    // Last frame for DOWN direction
  LEFT_START = 7,   // First frame for LEFT direction
  LEFT_END = 13,    // Last frame for LEFT direction
  UP_START = 21,    // First frame for UP direction
  UP_END = 27,      // Last frame for UP direction
  RIGHT_START = 0,  // First frame for RIGHT direction
  RIGHT_END = 6     // Last frame for RIGHT direction
}
// Pull rod: 8x4 (4 row 8 frame)
export enum RodDirectionPull {
  DOWN_START = 16,  // First frame for DOWN direction
  DOWN_END = 23,    // Last frame for DOWN direction
  LEFT_START = 8,   // First frame for LEFT direction
  LEFT_END = 15,    // Last frame for LEFT direction
  UP_START = 24,    // First frame for UP direction
  UP_END = 31,      // Last frame for UP direction
  RIGHT_START = 0,  // First frame for RIGHT direction
  RIGHT_END = 7     // Last frame for RIGHT direction
}

// Reel rod: 4x4 (4 row 4 frame)
export enum RodDirectionReel {
  DOWN_START = 8,   // First frame for DOWN direction
  DOWN_END = 11,    // Last frame for DOWN direction
  LEFT_START = 4,   // First frame for LEFT direction
  LEFT_END = 7,     // Last frame for LEFT direction
  UP_START = 12,    // First frame for UP direction
  UP_END = 15,      // Last frame for UP direction
  RIGHT_START = 0,  // First frame for RIGHT direction
  RIGHT_END = 3     // Last frame for RIGHT direction
}

// Catch: 5x4 (4 row 5 frame)
export enum RodDirectionCatch {
  DOWN_START = 10,  // First frame for DOWN direction
  DOWN_END = 14,    // Last frame for DOWN direction
  LEFT_START = 5,   // First frame for LEFT direction
  LEFT_END = 9,     // Last frame for LEFT direction
  UP_START = 15,    // First frame for UP direction
  UP_END = 19,      // Last frame for UP direction
  RIGHT_START = 0,  // First frame for RIGHT direction
  RIGHT_END = 4     // Last frame for RIGHT direction
}

// File extension
const rodExtension = '.png';

// Rod assets for each action
export const RodCatchAssets = {
  blackRed: `${rodCatchBasePath}${RodType.blackRed}${rodExtension}`,
  blackYellow: `${rodCatchBasePath}${RodType.blackYellow}${rodExtension}`,
  blue: `${rodCatchBasePath}${RodType.blue}${rodExtension}`,
  green: `${rodCatchBasePath}${RodType.green}${rodExtension}`,
  purple: `${rodCatchBasePath}${RodType.purple}${rodExtension}`,
  red: `${rodCatchBasePath}${RodType.red}${rodExtension}`,
  yellow: `${rodCatchBasePath}${RodType.yellow}${rodExtension}`,
};

export const RodThrowAssets = {
  blackRed: `${rodThrowBasePath}${RodType.blackRed}${rodExtension}`,
  blackYellow: `${rodThrowBasePath}${RodType.blackYellow}${rodExtension}`,
  blue: `${rodThrowBasePath}${RodType.blue}${rodExtension}`,
  green: `${rodThrowBasePath}${RodType.green}${rodExtension}`,
  purple: `${rodThrowBasePath}${RodType.purple}${rodExtension}`,
  red: `${rodThrowBasePath}${RodType.red}${rodExtension}`,
  yellow: `${rodThrowBasePath}${RodType.yellow}${rodExtension}`,
};

export const RodPullAssets = {
  blackRed: `${rodPullBasePath}${RodType.blackRed}${rodExtension}`,
  blackYellow: `${rodPullBasePath}${RodType.blackYellow}${rodExtension}`,
  blue: `${rodPullBasePath}${RodType.blue}${rodExtension}`,
  green: `${rodPullBasePath}${RodType.green}${rodExtension}`,
  purple: `${rodPullBasePath}${RodType.purple}${rodExtension}`,
  red: `${rodPullBasePath}${RodType.red}${rodExtension}`,
  yellow: `${rodPullBasePath}${RodType.yellow}${rodExtension}`,
};

export const RodReelAssets = {
  blackRed: `${rodReelBasePath}${RodType.blackRed}${rodExtension}`,
  blackYellow: `${rodReelBasePath}${RodType.blackYellow}${rodExtension}`,
  blue: `${rodReelBasePath}${RodType.blue}${rodExtension}`,
  green: `${rodReelBasePath}${RodType.green}${rodExtension}`,
  purple: `${rodReelBasePath}${RodType.purple}${rodExtension}`,
  red: `${rodReelBasePath}${RodType.red}${rodExtension}`,
  yellow: `${rodReelBasePath}${RodType.yellow}${rodExtension}`,
};

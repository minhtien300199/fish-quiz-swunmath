
const idleBodyFileName = '../assets/character/idle/character_idle_body_';
const idleBodyExtensionFileName = '.png';
export const IdleBodyType = {
    light: idleBodyFileName + 'light' + idleBodyExtensionFileName,
    dark: idleBodyFileName + (Math.random() < 0.5 ? 'dark' : 'black') + idleBodyExtensionFileName,
    brown: idleBodyFileName + 'brown' + idleBodyExtensionFileName,
}

// tool_fishing_rod_throw
const toolFishingRodThrowFileName = '../assets/character/tool_fishing_rod_throw/';
const toolFishingRodThrowExtensionFileName = '.png';
export const ToolFishingRodThrowType = {
    throw: toolFishingRodThrowFileName + 'tool_fishing_rod_throw' + toolFishingRodThrowExtensionFileName,
}

// tool_fishing_rod_pull
const toolFishingRodPullFileName = '../assets/character/tool_fishing_rod_pull/';
const toolFishingRodPullExtensionFileName = '.png';
export const ToolFishingRodPullType = {
    pull: toolFishingRodPullFileName + 'tool_fishing_rod_pull' + toolFishingRodPullExtensionFileName,
}

// tool_fishing_rod_reel
const toolFishingRodReelFileName = '../assets/character/tool_fishing_rod_reel/';
const toolFishingRodReelExtensionFileName = '.png';
export const ToolFishingRodReelType = {
    reel: toolFishingRodReelFileName + 'tool_fishing_rod_reel' + toolFishingRodReelExtensionFileName,
}

// tool_fishing_rod_catch
const toolFishingRodCatchFileName = '../assets/character/tool_fishing_rod_catch/';
const toolFishingRodCatchExtensionFileName = '.png';
export const ToolFishingRodCatchType = {
    catch: toolFishingRodCatchFileName + 'tool_fishing_rod_catch' + toolFishingRodCatchExtensionFileName,
}
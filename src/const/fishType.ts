export enum FishFileType {
    static = "static_fish",
    inventory = "inventory_icons"
}

export enum FishType {
    bass = "bass",
    blobfish = "blobfish",
    butterfly_fish = "butterfly_fish",
    catfish = "catfish",
    char = "char",
    cherry_salmon = "cherry_salmon",
    clown_fish = "clown_fish",
    cod = "cod",
    coho_salmon = "coho_salmon",
    cow_fish = "cow_fish",
    giant_tevally = "giant_tevally",
    golden_trout = "golden_trout",
    guppy = "guppy",
    halibut = "halibut",
    herring = "herring",
    lion_fish = "lion_fish",
    loach = "loach",
    mackerel = "mackerel",
    mahi_mahi = "mahi_mahi",
    manta_ray = "manta_ray",
    napolean_fish = "napolean_fish",
    neon_tetras = "neon_tetras",
    oarfish = "oarfish",
    ocean_sunfish = "ocean_sunfish",
    parrot_fish = "parrot_fish",
    pike = "pike",
    pink_salmon = "pink_salmon",
    pirana = "pirana",
    plaice = "plaice",
    pompano = "pompano",
    puffer_fish = "puffer_fish",
    rainbow_fish = "rainbow_fish",
    sea_horse = "sea_horse",
    shark_greatwhite = "shark_greatwhite",
    shark_hammerhead = "shark_hammerhead",
    shark_saw = "shark_saw",
    shark_whale = "shark_whale",
    silver_eel = "silver_eel",
    sockeye_salmon = "sockeye_salmon",
    squid = "squid",
    sucker_fish = "sucker_fish",
    surgeon_fish = "surgeon_fish",
    swordfish = "swordfish",
    whiting_fish = "whiting_fish"
}

/**
 * Fish size information
 * Most fish are 16x16, but some like shark_whale are different sizes
 */
export interface FishSize {
    width: number;
    height: number;
}

/**
 * Map of fish types to their sizes
 * Default size is 16x16 unless specified
 */
export const fishSizes: Record<FishType, FishSize> = {
    // Special case: shark_whale is 16x48
    [FishType.shark_whale]: { width: 48, height: 16 },
    
    // All other fish are standard 16x16
    [FishType.bass]: { width: 16, height: 16 },
    [FishType.blobfish]: { width: 16, height: 16 },
    [FishType.butterfly_fish]: { width: 16, height: 16 },
    [FishType.catfish]: { width: 16, height: 16 },
    [FishType.char]: { width: 16, height: 16 },
    [FishType.cherry_salmon]: { width: 16, height: 16 },
    [FishType.clown_fish]: { width: 16, height: 16 },
    [FishType.cod]: { width: 16, height: 16 },
    [FishType.coho_salmon]: { width: 16, height: 16 },
    [FishType.cow_fish]: { width: 16, height: 16 },
    [FishType.giant_tevally]: { width: 16, height: 16 },
    [FishType.golden_trout]: { width: 16, height: 16 },
    [FishType.guppy]: { width: 16, height: 16 },
    [FishType.halibut]: { width: 16, height: 16 },
    [FishType.herring]: { width: 16, height: 16 },
    [FishType.lion_fish]: { width: 16, height: 16 },
    [FishType.loach]: { width: 16, height: 16 },
    [FishType.mackerel]: { width: 16, height: 16 },
    [FishType.mahi_mahi]: { width: 16, height: 16 },
    [FishType.manta_ray]: { width: 16, height: 16 },
    [FishType.napolean_fish]: { width: 16, height: 16 },
    [FishType.neon_tetras]: { width: 16, height: 16 },
    [FishType.oarfish]: { width: 16, height: 16 },
    [FishType.ocean_sunfish]: { width: 16, height: 16 },
    [FishType.parrot_fish]: { width: 16, height: 16 },
    [FishType.pike]: { width: 16, height: 16 },
    [FishType.pink_salmon]: { width: 16, height: 16 },
    [FishType.pirana]: { width: 16, height: 16 },
    [FishType.plaice]: { width: 16, height: 16 },
    [FishType.pompano]: { width: 16, height: 16 },
    [FishType.puffer_fish]: { width: 16, height: 16 },
    [FishType.rainbow_fish]: { width: 16, height: 16 },
    [FishType.sea_horse]: { width: 16, height: 16 },
    [FishType.shark_greatwhite]: { width: 16, height: 16 },
    [FishType.shark_hammerhead]: { width: 16, height: 16 },
    [FishType.shark_saw]: { width: 16, height: 16 },
    [FishType.silver_eel]: { width: 16, height: 16 },
    [FishType.sockeye_salmon]: { width: 16, height: 16 },
    [FishType.squid]: { width: 16, height: 16 },
    [FishType.sucker_fish]: { width: 16, height: 16 },
    [FishType.surgeon_fish]: { width: 16, height: 16 },
    [FishType.swordfish]: { width: 16, height: 16 },
    [FishType.whiting_fish]: { width: 16, height: 16 }
}

/**
 * Fish variant types based on the asset directory structure
 * Maps fish types to their available variants
 */
export enum FishVariantType {
    // Butterfly fish variants
    butterfly_fish_white_black_fin = "white_black_fin",
    butterfly_fish_white_yellow_no_fin = "white_yellow_no_fin",
    butterfly_fish_yellow_blue_no_fin = "yellow_blue_no_fin",
    butterfly_fish_yellow_white_blue_fin = "yellow_white_blue_fin",
    butterfly_fish_yellow_white_fin = "yellow_white_fin",
    
    // Clown fish variants
    clown_fish_red = "red",
    clown_fish_yellow = "yellow",
    
    // Guppy variants
    guppy_blue = "blue",
    guppy_red = "red",
    
    // Loach variants
    loach_silver = "silver",
    loach_yellow = "yellow",
    
    // Mackerel variants
    mackerel_green = "green",
    mackerel_silver = "silver",
    
    // Neon tetras variants
    neon_tetras_dark_blue = "dark_blue",
    neon_tetras_light_blue = "light_blue",
    
    // Parrot fish variants
    parrot_fish_small = "small",
    
    // Pirana variants
    pirana_blue = "blue",
    pirana_gold = "gold",
    
    // Swordfish variants
    swordfish_blue = "blue",
    swordfish_white = "white",
    swordfish_white_pink = "white_pink"
}

export const fishPath = `assets/fish/`;

// Map fish types to their available variants
export const fishVariants: Record<FishType, string[]> = {
    [FishType.bass]: [],
    [FishType.blobfish]: [],
    [FishType.butterfly_fish]: [
        FishVariantType.butterfly_fish_white_black_fin,
        FishVariantType.butterfly_fish_white_yellow_no_fin,
        FishVariantType.butterfly_fish_yellow_blue_no_fin,
        FishVariantType.butterfly_fish_yellow_white_blue_fin,
        FishVariantType.butterfly_fish_yellow_white_fin
    ],
    [FishType.catfish]: [],
    [FishType.char]: [],
    [FishType.cherry_salmon]: [],
    [FishType.clown_fish]: [
        FishVariantType.clown_fish_red,
        FishVariantType.clown_fish_yellow
    ],
    [FishType.cod]: [],
    [FishType.coho_salmon]: [],
    [FishType.cow_fish]: [],
    [FishType.giant_tevally]: [],
    [FishType.golden_trout]: [],
    [FishType.guppy]: [
        FishVariantType.guppy_blue,
        FishVariantType.guppy_red
    ],
    [FishType.halibut]: [],
    [FishType.herring]: [],
    [FishType.lion_fish]: [],
    [FishType.loach]: [
        FishVariantType.loach_silver,
        FishVariantType.loach_yellow
    ],
    [FishType.mackerel]: [
        FishVariantType.mackerel_green,
        FishVariantType.mackerel_silver
    ],
    [FishType.mahi_mahi]: [],
    [FishType.manta_ray]: [],
    [FishType.napolean_fish]: [],
    [FishType.neon_tetras]: [
        FishVariantType.neon_tetras_dark_blue,
        FishVariantType.neon_tetras_light_blue
    ],
    [FishType.oarfish]: [],
    [FishType.ocean_sunfish]: [],
    [FishType.parrot_fish]: [
        FishVariantType.parrot_fish_small
    ],
    [FishType.pike]: [],
    [FishType.pink_salmon]: [],
    [FishType.pirana]: [
        FishVariantType.pirana_blue,
        FishVariantType.pirana_gold
    ],
    [FishType.plaice]: [],
    [FishType.pompano]: [],
    [FishType.puffer_fish]: [],
    [FishType.rainbow_fish]: [],
    [FishType.sea_horse]: [],
    [FishType.shark_greatwhite]: [],
    [FishType.shark_hammerhead]: [],
    [FishType.shark_saw]: [],
    [FishType.shark_whale]: [],
    [FishType.silver_eel]: [],
    [FishType.sockeye_salmon]: [],
    [FishType.squid]: [],
    [FishType.sucker_fish]: [],
    [FishType.surgeon_fish]: [],
    [FishType.swordfish]: [
        FishVariantType.swordfish_blue,
        FishVariantType.swordfish_white,
        FishVariantType.swordfish_white_pink
    ],
    [FishType.whiting_fish]: []
};

/**
 * Check if a fish type has variants
 * @param fishType The type of fish to check
 * @returns True if the fish has variants, false otherwise
 */
export const hasFishVariants = (fishType: FishType): boolean => {
    return fishVariants[fishType].length > 0;
};

/**
 * Get path for static fish with 1 frames and 2 rows
 * @param fishType The type of fish
 * @param variant Optional variant of the fish
 * @returns Path to the fish image
 */
export const getFishPath = (fishType: FishType, variant?: string): string => {
    // If a specific variant is provided, use that path
    if (variant) {
        return `${fishPath}${fishType}/${variant}/${FishFileType.static}.png`;
    }
    
    // If this fish type has variants but no specific variant was requested,
    // we need to use the first variant as the default since parent folder has no image
    if (hasFishVariants(fishType)) {
        const defaultVariant = fishVariants[fishType][0];
        return `${fishPath}${fishType}/${defaultVariant}/${FishFileType.static}.png`;
    }
    
    // For fish without variants, use the standard path
    return `${fishPath}${fishType}/${FishFileType.static}.png`;
};
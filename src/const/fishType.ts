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
export const fishPath = `assets/fish/`;

// get path for static fish with 1 frames and 2 rows
export const getFishPath = (fishType: FishType) => `${fishPath}${fishType}/${FishFileType.static}.png`;
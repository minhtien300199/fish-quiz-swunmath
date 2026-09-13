import 'phaser';

/**
 * Scatters pixel-art decoration across the island and the sea floor, and
 * replaces the flat sea tile layer with animated water plus a lapping
 * shoreline.
 *
 * The art lives in assets/tilesets/decor/ and is produced by
 * scripts/gen_map_decor.py. Frame order in the two atlases is a contract with
 * the enums below, so if you reorder the generator's cell list, update these.
 *
 * Layout is generated from a fixed seed, so the map looks identical on every
 * run and between players. Nothing added here has a physics body: decoration
 * must never change where the boat can sail or where fish can spawn.
 */

/** Frame indices in assets/tilesets/decor/underwater-decor.png. */
export enum UnderwaterDecor {
  ROCK_SMALL = 0,
  ROCK_MID = 1,
  BOULDER = 2,
  ROCK_CLUSTER = 3,
  ORE_GOLD = 4,
  ORE_AMETHYST = 5,
  ORE_COPPER = 6,
  ORE_EMERALD = 7,
  CORAL_BRANCH = 8,
  CORAL_FAN = 9,
  SEAWEED_TALL = 10,
  SEAWEED_SHORT = 11,
  STARFISH = 12,
  SHELL = 13,
  BUBBLES = 14,
  PEBBLES = 15
}

/** Frame indices in assets/tilesets/decor/island-decor.png. */
export enum IslandDecor {
  BOULDER = 0,
  ROCK_MID = 1,
  ROCK_SMALL = 2,
  PEBBLES = 3,
  ORE_GOLD = 4,
  ORE_AMETHYST = 5,
  ORE_COPPER = 6,
  DRIFTWOOD = 7,
  GRASS_TUFT = 8,
  BUSH = 9,
  STARFISH = 10,
  SHELL = 11
}

/** How a scattered item behaves once placed. */
const enum Motion {
  STILL = 0,
  /** Pivots at its base, like weed or coral in a current. */
  SWAY = 1,
  /** Drifts upward and fades, then restarts. */
  RISE = 2
}

interface DecorEntry {
  frame: number;
  /** Relative likelihood of being picked. Rocks common, ore rare. */
  weight: number;
  motion?: Motion;
}

/** A world-space circle that decoration must stay out of. */
export interface ReservedArea {
  x: number;
  y: number;
  radius: number;
}

export interface MapDecorLayers {
  sea: Phaser.Tilemaps.TilemapLayer;
  sand: Phaser.Tilemaps.TilemapLayer;
  objects: Phaser.Tilemaps.TilemapLayer;
}

export interface MapDecorOptions {
  /** Keep-out circles for buildings, the boat spawn, and anything else fixed. */
  reserved?: ReservedArea[];
  /** Change to reshuffle the layout; the default keeps it stable. */
  seed?: string;
}

/** Handle for everything the factory created, so the scene can tear it down. */
export interface MapDecor {
  /** Every created object, for `camera.ignore(...)` and debugging. */
  objects: Phaser.GameObjects.GameObject[];
  destroy(): void;
}

const UNDERWATER_TABLE: DecorEntry[] = [
  { frame: UnderwaterDecor.ROCK_SMALL, weight: 16 },
  { frame: UnderwaterDecor.ROCK_MID, weight: 13 },
  { frame: UnderwaterDecor.BOULDER, weight: 7 },
  { frame: UnderwaterDecor.ROCK_CLUSTER, weight: 8 },
  { frame: UnderwaterDecor.PEBBLES, weight: 10 },
  { frame: UnderwaterDecor.ORE_GOLD, weight: 7 },
  { frame: UnderwaterDecor.ORE_AMETHYST, weight: 7 },
  { frame: UnderwaterDecor.ORE_COPPER, weight: 6 },
  { frame: UnderwaterDecor.ORE_EMERALD, weight: 5 },
  { frame: UnderwaterDecor.CORAL_BRANCH, weight: 7, motion: Motion.SWAY },
  { frame: UnderwaterDecor.CORAL_FAN, weight: 6, motion: Motion.SWAY },
  { frame: UnderwaterDecor.SEAWEED_TALL, weight: 9, motion: Motion.SWAY },
  { frame: UnderwaterDecor.SEAWEED_SHORT, weight: 10, motion: Motion.SWAY },
  { frame: UnderwaterDecor.STARFISH, weight: 6 },
  { frame: UnderwaterDecor.SHELL, weight: 6 },
  { frame: UnderwaterDecor.BUBBLES, weight: 5, motion: Motion.RISE }
];

const ISLAND_TABLE: DecorEntry[] = [
  { frame: IslandDecor.BOULDER, weight: 6 },
  { frame: IslandDecor.ROCK_MID, weight: 11 },
  { frame: IslandDecor.ROCK_SMALL, weight: 14 },
  { frame: IslandDecor.PEBBLES, weight: 12 },
  { frame: IslandDecor.ORE_GOLD, weight: 6 },
  { frame: IslandDecor.ORE_AMETHYST, weight: 6 },
  { frame: IslandDecor.ORE_COPPER, weight: 5 },
  { frame: IslandDecor.DRIFTWOOD, weight: 7 },
  { frame: IslandDecor.GRASS_TUFT, weight: 12, motion: Motion.SWAY },
  { frame: IslandDecor.BUSH, weight: 9, motion: Motion.SWAY },
  { frame: IslandDecor.STARFISH, weight: 5 },
  { frame: IslandDecor.SHELL, weight: 6 }
];

export class MapDecorFactory {
  private static readonly WATER_KEY = 'decor-water';
  private static readonly FOAM_KEY = 'decor-foam';
  private static readonly UNDERWATER_KEY = 'decor-underwater';
  private static readonly ISLAND_KEY = 'decor-island';

  // The sea tile layer sits at depth 0 alongside sand and objects, the boat is
  // at 15 and fish shadows at 3-5, so decoration slots in around those.
  private static readonly WATER_DEPTH = -20;
  private static readonly UNDERWATER_DEPTH = 1;
  private static readonly FOAM_DEPTH = 2;   // above sand (0) so foam washes over it
  private static readonly ISLAND_DEPTH = 4; // below the fishmarket (10) and boat (15)

  private static readonly FOAM_HEIGHT = 16;
  private static readonly WATER_FRAMES = 8;
  private static readonly FOAM_FRAMES = 6;

  /** How many items to aim for, and how far apart to keep them (px). */
  private static readonly UNDERWATER_COUNT = 78;
  private static readonly UNDERWATER_SPACING = 30;
  private static readonly ISLAND_COUNT = 34;
  private static readonly ISLAND_SPACING = 25;

  /**
   * Multiplied over sea-floor decoration. Pulls red down more than blue, so
   * stone reads as being seen through water rather than floating on it.
   */
  private static readonly SUBMERGED_TINT = 0xc9dcf5;

  public static loadAssets(scene: Phaser.Scene): void {
    scene.load.spritesheet(this.WATER_KEY, 'assets/tilesets/decor/water-anim.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    scene.load.spritesheet(this.FOAM_KEY, 'assets/tilesets/decor/shore-foam.png', {
      frameWidth: 32,
      frameHeight: this.FOAM_HEIGHT
    });
    scene.load.spritesheet(this.UNDERWATER_KEY, 'assets/tilesets/decor/underwater-decor.png', {
      frameWidth: 32,
      frameHeight: 32
    });
    scene.load.spritesheet(this.ISLAND_KEY, 'assets/tilesets/decor/island-decor.png', {
      frameWidth: 32,
      frameHeight: 32
    });
  }

  /**
   * Build the animated water and scatter decoration.
   *
   * Call this after the tilemap layers exist. Depths are explicit, so it does
   * not matter where in `create()` this lands relative to other game objects.
   */
  public static create(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: MapDecorLayers,
    options: MapDecorOptions = {}
  ): MapDecor {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const timers: Phaser.Time.TimerEvent[] = [];
    const tweens: Phaser.Tweens.Tween[] = [];
    const rng = new Phaser.Math.RandomDataGenerator([options.seed ?? 'fish-quiz-map-decor-v1']);
    const reserved = options.reserved ?? [];

    // Per column, the first row that is not land. Everything above it is
    // island, everything below is open water.
    const shoreRow = this.findShoreRows(map, layers);

    this.createWater(scene, map, layers, objects, timers, tweens);
    this.createShoreFoam(scene, map, layers, shoreRow, objects, timers);
    this.scatterUnderwater(scene, map, layers, shoreRow, reserved, rng, objects, tweens);
    this.scatterIsland(scene, map, layers, shoreRow, reserved, rng, objects, tweens);

    return {
      objects,
      destroy: () => {
        timers.forEach(timer => timer.destroy());
        tweens.forEach(tween => tween.remove());
        objects.forEach(object => object.destroy());
        objects.length = 0;
        // Put the original flat sea layer back, in case the scene is rebuilt.
        // Guarded because a full scene shutdown may already have disposed it.
        if (layers.sea.scene) {
          layers.sea.setVisible(true);
        }
      }
    };
  }

  /**
   * For each column, the topmost row with no sand. On a map whose island is a
   * straight strip this is a constant, but deriving it keeps the factory
   * working if the coastline is ever redrawn in Tiled.
   */
  private static findShoreRows(
    map: Phaser.Tilemaps.Tilemap,
    layers: MapDecorLayers
  ): number[] {
    const rows: number[] = [];
    for (let col = 0; col < map.width; col++) {
      let row = 0;
      while (row < map.height && this.hasTile(layers.sand, col, row)) {
        row++;
      }
      rows.push(row);
    }
    return rows;
  }

  private static hasTile(
    layer: Phaser.Tilemaps.TilemapLayer,
    col: number,
    row: number
  ): boolean {
    const tile = layer.getTileAt(col, row);
    return !!tile && tile.index !== -1;
  }

  /**
   * Replaces the flat sea layer with a tiling animated water surface.
   *
   * The sea layer is a single repeated colour tile, so hiding it loses nothing
   * and one TileSprite is far cheaper than animating 800 tiles. Frames are
   * swapped on a timer because TileSprite has no animation component.
   */
  private static createWater(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: MapDecorLayers,
    objects: Phaser.GameObjects.GameObject[],
    timers: Phaser.Time.TimerEvent[],
    tweens: Phaser.Tweens.Tween[]
  ): void {
    layers.sea.setVisible(false);

    const water = scene.add
      .tileSprite(0, 0, map.widthInPixels, map.heightInPixels, this.WATER_KEY)
      .setOrigin(0, 0)
      .setDepth(this.WATER_DEPTH);
    objects.push(water);

    let frame = 0;
    timers.push(
      scene.time.addEvent({
        delay: 150, // 8 frames -> a 1.2s wave cycle
        loop: true,
        callback: () => {
          frame = (frame + 1) % this.WATER_FRAMES;
          water.setFrame(frame);
        }
      })
    );

    // A slow sideways drift on top of the frame loop, so the 32px tile does not
    // read as a repeating grid. 32px is exactly one tile, so this loops cleanly.
    tweens.push(
      scene.tweens.add({
        targets: water,
        tilePositionX: 32,
        duration: 20000,
        repeat: -1
      })
    );
  }

  /**
   * Lays animated foam along the sand/water boundary.
   *
   * Columns sharing a shore row are merged into a single TileSprite: the foam
   * art tiles seamlessly in x, so one strip per run keeps the crest continuous
   * instead of stepping at every tile edge.
   */
  private static createShoreFoam(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: MapDecorLayers,
    shoreRow: number[],
    objects: Phaser.GameObjects.GameObject[],
    timers: Phaser.Time.TimerEvent[]
  ): void {
    const strips: Phaser.GameObjects.TileSprite[] = [];

    let col = 0;
    while (col < map.width) {
      const row = shoreRow[col];
      // No foam where there is no shoreline, or where a tree already occupies
      // the boundary tile and foam would draw across its trunk.
      if (row <= 0 || row >= map.height || this.hasTile(layers.objects, col, row)) {
        col++;
        continue;
      }

      let end = col;
      while (
        end + 1 < map.width &&
        shoreRow[end + 1] === row &&
        !this.hasTile(layers.objects, end + 1, row)
      ) {
        end++;
      }

      const width = (end - col + 1) * map.tileWidth;
      const strip = scene.add
        .tileSprite(
          col * map.tileWidth,
          row * map.tileHeight - this.FOAM_HEIGHT / 2,
          width,
          this.FOAM_HEIGHT,
          this.FOAM_KEY
        )
        .setOrigin(0, 0)
        .setDepth(this.FOAM_DEPTH);
      strips.push(strip);
      objects.push(strip);

      col = end + 1;
    }

    if (strips.length === 0) {
      return;
    }

    // All strips share one timer so the whole shoreline breathes together.
    let frame = 0;
    timers.push(
      scene.time.addEvent({
        delay: 260, // 6 frames -> a ~1.6s tide cycle
        loop: true,
        callback: () => {
          frame = (frame + 1) % this.FOAM_FRAMES;
          strips.forEach(strip => strip.setFrame(frame));
        }
      })
    );
  }

  private static scatterUnderwater(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: MapDecorLayers,
    shoreRow: number[],
    reserved: ReservedArea[],
    rng: Phaser.Math.RandomDataGenerator,
    objects: Phaser.GameObjects.GameObject[],
    tweens: Phaser.Tweens.Tween[]
  ): void {
    const candidates: { col: number; row: number }[] = [];
    for (let col = 0; col < map.width; col++) {
      // Skip the row the foam covers so rocks do not sit in the surf.
      for (let row = shoreRow[col] + 1; row < map.height; row++) {
        if (this.hasTile(layers.sand, col, row) || this.hasTile(layers.objects, col, row)) {
          continue;
        }
        candidates.push({ col, row });
      }
    }

    this.place(
      scene,
      map,
      candidates,
      UNDERWATER_TABLE,
      this.UNDERWATER_KEY,
      this.UNDERWATER_DEPTH,
      this.UNDERWATER_COUNT,
      this.UNDERWATER_SPACING,
      reserved,
      rng,
      objects,
      tweens,
      0.94,
      this.SUBMERGED_TINT
    );
  }

  private static scatterIsland(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    layers: MapDecorLayers,
    shoreRow: number[],
    reserved: ReservedArea[],
    rng: Phaser.Math.RandomDataGenerator,
    objects: Phaser.GameObjects.GameObject[],
    tweens: Phaser.Tweens.Tween[]
  ): void {
    const candidates: { col: number; row: number }[] = [];
    for (let col = 0; col < map.width; col++) {
      for (let row = 0; row < shoreRow[col]; row++) {
        // Leave a one tile margin around trees and buildings on the objects
        // layer, so nothing appears to grow out of a trunk.
        if (this.nearObject(layers.objects, map, col, row)) {
          continue;
        }
        candidates.push({ col, row });
      }
    }

    this.place(
      scene,
      map,
      candidates,
      ISLAND_TABLE,
      this.ISLAND_KEY,
      this.ISLAND_DEPTH,
      this.ISLAND_COUNT,
      this.ISLAND_SPACING,
      reserved,
      rng,
      objects,
      tweens,
      1
    );
  }

  private static nearObject(
    layer: Phaser.Tilemaps.TilemapLayer,
    map: Phaser.Tilemaps.Tilemap,
    col: number,
    row: number
  ): boolean {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = col + dx;
        const ny = row + dy;
        if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) {
          continue;
        }
        if (this.hasTile(layer, nx, ny)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Greedy Poisson-ish scatter: walk a shuffled candidate list and keep tiles
   * that clear both the reserved circles and everything already placed. Gives
   * an even spread without the clumping of independent random picks.
   */
  private static place(
    scene: Phaser.Scene,
    map: Phaser.Tilemaps.Tilemap,
    candidates: { col: number; row: number }[],
    table: DecorEntry[],
    textureKey: string,
    depth: number,
    target: number,
    spacing: number,
    reserved: ReservedArea[],
    rng: Phaser.Math.RandomDataGenerator,
    objects: Phaser.GameObjects.GameObject[],
    tweens: Phaser.Tweens.Tween[],
    alpha: number,
    tint?: number
  ): void {
    const shuffled = rng.shuffle(candidates.slice());
    const taken: { x: number; y: number }[] = [];
    const spacingSq = spacing * spacing;

    for (const candidate of shuffled) {
      if (taken.length >= target) {
        break;
      }

      // Jitter inside the tile so the grid never shows through.
      const x = candidate.col * map.tileWidth + map.tileWidth / 2 + rng.integerInRange(-9, 9);
      const y = (candidate.row + 1) * map.tileHeight + rng.integerInRange(-6, 4);

      if (reserved.some(area => this.within(x, y, area))) {
        continue;
      }
      if (taken.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 < spacingSq)) {
        continue;
      }

      const entry = this.pick(table, rng);
      const sprite = scene.add
        .sprite(x, y, textureKey, entry.frame)
        .setOrigin(0.5, 1) // art is bottom-aligned in its cell, so this sits on the ground
        .setDepth(depth)
        .setAlpha(alpha);

      if (tint !== undefined) {
        sprite.setTint(tint);
      }

      // Mirror about half of them, for variety from a small atlas.
      if (rng.frac() < 0.5) {
        sprite.setFlipX(true);
      }

      this.animate(scene, sprite, entry.motion ?? Motion.STILL, rng, tweens, alpha);

      objects.push(sprite);
      taken.push({ x, y });
    }
  }

  private static pick(
    table: DecorEntry[],
    rng: Phaser.Math.RandomDataGenerator
  ): DecorEntry {
    const total = table.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng.frac() * total;
    for (const entry of table) {
      roll -= entry.weight;
      if (roll <= 0) {
        return entry;
      }
    }
    return table[table.length - 1];
  }

  private static animate(
    scene: Phaser.Scene,
    sprite: Phaser.GameObjects.Sprite,
    motion: Motion,
    rng: Phaser.Math.RandomDataGenerator,
    tweens: Phaser.Tweens.Tween[],
    alpha: number
  ): void {
    if (motion === Motion.SWAY) {
      // Origin is already at the base, so this pivots at the ground.
      tweens.push(
        scene.tweens.add({
          targets: sprite,
          angle: rng.realInRange(3, 6),
          duration: rng.integerInRange(1800, 2800),
          delay: rng.integerInRange(0, 1200),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut'
        })
      );
      return;
    }

    if (motion === Motion.RISE) {
      sprite.setAlpha(0);
      tweens.push(
        scene.tweens.add({
          targets: sprite,
          y: sprite.y - 14,
          alpha: { from: alpha, to: 0 },
          duration: rng.integerInRange(2200, 3400),
          delay: rng.integerInRange(0, 2600),
          repeat: -1,
          ease: 'Sine.easeOut'
        })
      );
    }
  }

  private static within(x: number, y: number, area: ReservedArea): boolean {
    return (x - area.x) ** 2 + (y - area.y) ** 2 < area.radius * area.radius;
  }
}

import { FishCollectionManager } from '../managers/fishCollectionManager';
import { FishType } from '../const/fishType';

/**
 * Test utility to add some sample fish to the collection
 * Run this in the browser console to test the fish collection feature
 */
export function addSampleFishToCollection(): void {
    // Add some common fish
    FishCollectionManager.addCaughtFish(FishType.bass);
    FishCollectionManager.addCaughtFish(FishType.clown_fish);
    FishCollectionManager.addCaughtFish(FishType.guppy);
    FishCollectionManager.addCaughtFish(FishType.cod);
    FishCollectionManager.addCaughtFish(FishType.catfish);

    // Add some rarer fish
    FishCollectionManager.addCaughtFish(FishType.shark_greatwhite);
    FishCollectionManager.addCaughtFish(FishType.manta_ray);
    FishCollectionManager.addCaughtFish(FishType.blobfish);
}

/**
 * Test utility to clear the fish collection
 * Run this in the browser console to reset the collection
 */
export function clearFishCollection(): void {
    FishCollectionManager.clearCollection();
}

/**
 * Test function to check if fish info data is available
 * Run this in the browser console to test fish info loading
 */
export function testFishInfo(): void {
    // Try to access the game scene
    const game = (window as any).game;
    if (!game) {
        return;
    }

    // Check if fish info is loaded in cache
    const preloadScene = game.scene.getScene('PreloadScene');
    if (preloadScene) {
        const fishInfo = preloadScene.cache.json.get('fishInfo');
        if (fishInfo) {
            // Fish info loaded successfully
        }
    }
}

// Make functions available globally for browser console testing
(window as any).addSampleFishToCollection = addSampleFishToCollection;
(window as any).clearFishCollection = clearFishCollection;
(window as any).testFishInfo = testFishInfo; 
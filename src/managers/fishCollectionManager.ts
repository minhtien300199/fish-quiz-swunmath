import { FishType } from '../const/fishType';

export class FishCollectionManager {
    private static readonly STORAGE_KEY = 'fish-quiz-collection';

    /**
     * Get all caught fish types from local storage
     * @returns Array of caught fish type strings
     */
    public static getCaughtFishTypes(): string[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading caught fish from storage:', error);
        }
        return [];
    }

    /**
     * Add a fish type to the caught collection
     * @param fishType The fish type that was caught
     * @returns true if this is a new fish, false if already caught before
     */
    public static addCaughtFish(fishType: FishType): boolean {
        const caughtFish = this.getCaughtFishTypes();
        const fishTypeString = fishType.toString();

        // Check if this fish was already caught
        if (caughtFish.includes(fishTypeString)) {
            return false; // Not a new fish
        }

        // Add to collection
        caughtFish.push(fishTypeString);

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(caughtFish));
            console.log(`New fish discovered: ${fishType}`);
            return true; // New fish discovered
        } catch (error) {
            console.error('Error saving caught fish to storage:', error);
            return false;
        }
    }

    /**
     * Check if a specific fish type has been caught
     * @param fishType The fish type to check
     * @returns true if the fish has been caught before
     */
    public static isFishCaught(fishType: FishType): boolean {
        const caughtFish = this.getCaughtFishTypes();
        return caughtFish.includes(fishType.toString());
    }

    /**
     * Get the total number of unique fish types caught
     * @returns Number of different fish types caught
     */
    public static getTotalCaughtCount(): number {
        return this.getCaughtFishTypes().length;
    }

    /**
     * Get the total number of possible fish types
     * @returns Total number of fish types in the game
     */
    public static getTotalFishCount(): number {
        return Object.keys(FishType).length;
    }

    /**
     * Get completion percentage for fish collection
     * @returns Percentage (0-100) of fish collection completion
     */
    public static getCompletionPercentage(): number {
        const caught = this.getTotalCaughtCount();
        const total = this.getTotalFishCount();
        return Math.round((caught / total) * 100);
    }

    /**
     * Clear all caught fish (for testing or reset purposes)
     */
    public static clearCollection(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            console.log('Fish collection cleared');
        } catch (error) {
            console.error('Error clearing fish collection:', error);
        }
    }

    /**
     * Import a fish collection from an array
     * @param fishTypes Array of fish type strings to import
     */
    public static importCollection(fishTypes: string[]): void {
        try {
            // Validate that all fish types are valid
            const validFishTypes = fishTypes.filter(fishType =>
                Object.values(FishType).includes(fishType as FishType)
            );

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validFishTypes));
            console.log(`Imported ${validFishTypes.length} fish types to collection`);
        } catch (error) {
            console.error('Error importing fish collection:', error);
        }
    }
} 
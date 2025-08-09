/**
 * Leaderboard Manager
 * Handles high score storage and retrieval with API integration
 */

export interface LeaderboardEntry {
    rank: number;
    name: string;
    score: number;
    fishCaught?: number;
    timestamp?: number;
    completionTitle?: string;
}

// @ts-ignore
import gameSdk from '../service/apiService.js';

export class LeaderboardManager {
    private static readonly MAX_ENTRIES = 10;
    private static leaderboardCache: LeaderboardEntry[] = [];
    private static lastFetchTime: number = 0;
    private static readonly CACHE_DURATION = 60000; // 1 minute cache

    /**
     * Save a new score to the leaderboard
     * Note: This method now only returns if the score is high enough to be on the leaderboard
     * The actual saving is handled by the API
     */
    static saveScore(playerName: string, score: number, fishCaught: number, completionTitle: string = 'Easy'): boolean {
        try {
            // Invalidate cache to ensure fresh data on next fetch
            this.lastFetchTime = 0;
            
            // Check if score is high enough to be on leaderboard
            return this.isHighScore(score);
        } catch (error) {
            console.error('Error checking high score:', error);
            return false;
        }
    }

    /**
     * Get the current leaderboard
     * Fetches from API and caches results for performance
     */
    static getLeaderboard(): LeaderboardEntry[] {
        // Check if we have a valid cached leaderboard
        const now = Date.now();
        if (this.leaderboardCache.length > 0 && now - this.lastFetchTime < this.CACHE_DURATION) {
            return this.leaderboardCache;
        }

        // Initialize with empty array
        this.leaderboardCache = [];
        
        // Fetch leaderboard data from API
        gameSdk.loadGameLeaderBoard(
            (response: any) => {
                if (response && response.leaderBoard && Array.isArray(response.leaderBoard)) {
                    this.leaderboardCache = response.leaderBoard.map((entry: any) => ({
                        rank: entry.rank || 0,
                        name: entry.name || 'Anonymous',
                        score: entry.score || 0
                    }));
                    this.lastFetchTime = now;
                }
            },
            () => {
                console.error('Failed to load leaderboard data from API');
            }
        );
        
        return this.leaderboardCache;
    }

    /**
     * Get a player's rank in the leaderboard (1-based)
     */
    static getPlayerRank(score: number): number {
        const leaderboard = this.getLeaderboard();
        const rank = leaderboard.findIndex(entry => entry.score <= score) + 1;
        return rank || leaderboard.length + 1;
    }

    /**
     * Check if a score qualifies for the leaderboard
     */
    static isHighScore(score: number): boolean {
        const leaderboard = this.getLeaderboard();
        if (leaderboard.length < this.MAX_ENTRIES) return true;

        const lowestScore = leaderboard[leaderboard.length - 1]?.score || 0;
        return score > lowestScore;
    }

    /**
     * Force refresh the leaderboard data from API
     */
    static refreshLeaderboard(): void {
        this.lastFetchTime = 0;
        this.getLeaderboard();
    }

    /**
     * Get leaderboard statistics
     */
    static getStats(): { totalEntries: number; highestScore: number; averageScore: number } {
        const leaderboard = this.getLeaderboard();

        if (leaderboard.length === 0) {
            return { totalEntries: 0, highestScore: 0, averageScore: 0 };
        }

        const totalEntries = leaderboard.length;
        const highestScore = leaderboard[0]?.score || 0;
        const averageScore = Math.round(
            leaderboard.reduce((sum, entry) => sum + entry.score, 0) / totalEntries
        );

        return { totalEntries, highestScore, averageScore };
    }

    /**
     * Format timestamp to readable date
     */
    static formatDate(timestamp: number): string {
        if (!timestamp) return 'N/A';
        
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}
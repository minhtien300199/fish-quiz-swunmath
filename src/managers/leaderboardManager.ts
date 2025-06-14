/**
 * Leaderboard Manager
 * Handles high score storage and retrieval with persistent localStorage
 */

export interface LeaderboardEntry {
    playerName: string;
    score: number;
    fishCaught: number;
    timestamp: number;
    completionTitle: string;
}

export class LeaderboardManager {
    private static readonly STORAGE_KEY = 'fish-quiz-leaderboard';
    private static readonly MAX_ENTRIES = 10;

    /**
     * Save a new score to the leaderboard
     */
    static saveScore(playerName: string, score: number, fishCaught: number, completionTitle: string = 'Easy'): boolean {
        try {
            const leaderboard = this.getLeaderboard();

            const newEntry: LeaderboardEntry = {
                playerName: playerName.trim() || 'Anonymous',
                score,
                fishCaught,
                timestamp: Date.now(),
                completionTitle
            };

            // Add the new entry
            leaderboard.push(newEntry);

            // Sort by score (highest first), then by fish caught, then by timestamp (most recent first)
            leaderboard.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                if (b.fishCaught !== a.fishCaught) return b.fishCaught - a.fishCaught;
                return b.timestamp - a.timestamp;
            });

            // Keep only top entries
            const trimmedLeaderboard = leaderboard.slice(0, this.MAX_ENTRIES);

            // Save to localStorage
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmedLeaderboard));

            // Check if this score made it to the leaderboard
            return trimmedLeaderboard.some(entry =>
                entry.timestamp === newEntry.timestamp &&
                entry.score === newEntry.score
            );
        } catch (error) {
            console.error('Error saving score to leaderboard:', error);
            return false;
        }
    }

    /**
     * Get the current leaderboard
     */
    static getLeaderboard(): LeaderboardEntry[] {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading leaderboard from localStorage:', error);
        }
        return [];
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
     * Clear the entire leaderboard
     */
    static clearLeaderboard(): void {
        try {
            localStorage.removeItem(this.STORAGE_KEY);

        } catch (error) {
            console.error('Error clearing leaderboard:', error);
        }
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
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
} 
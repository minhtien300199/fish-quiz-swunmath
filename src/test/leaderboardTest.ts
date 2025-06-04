import { LeaderboardManager } from '../managers/leaderboardManager';

/**
 * Test utilities for the leaderboard system
 * Run these functions in the browser console to test leaderboard functionality
 */

/**
 * Add sample scores to the leaderboard for testing
 */
export function addSampleScores(): void {
    console.log('Adding sample scores to leaderboard...');

    // Add various test scores
    LeaderboardManager.saveScore('Alice', 1250, 15, 'Intermediate');
    LeaderboardManager.saveScore('Bob', 980, 12, 'Easy');
    LeaderboardManager.saveScore('Charlie', 1500, 18, 'Hard');
    LeaderboardManager.saveScore('Diana', 750, 8, 'Easy');
    LeaderboardManager.saveScore('Eve', 2100, 25, 'Expert');
    LeaderboardManager.saveScore('Frank', 650, 6, 'Beginner');
    LeaderboardManager.saveScore('Grace', 1800, 22, 'Hard');
    LeaderboardManager.saveScore('Henry', 420, 4, 'Beginner');
    LeaderboardManager.saveScore('Ivy', 1350, 16, 'Intermediate');
    LeaderboardManager.saveScore('Jack', 2250, 28, 'Expert');

    console.log('Sample scores added! Check the leaderboard in the main menu.');
    displayLeaderboard();
}

/**
 * Display current leaderboard in console
 */
export function displayLeaderboard(): void {
    const leaderboard = LeaderboardManager.getLeaderboard();
    const stats = LeaderboardManager.getStats();

    console.log('=== FISH QUIZ LEADERBOARD ===');
    console.log(`Total Players: ${stats.totalEntries} | Highest Score: ${stats.highestScore} | Average: ${stats.averageScore}`);
    console.log('');

    if (leaderboard.length === 0) {
        console.log('No scores recorded yet!');
        return;
    }

    console.table(leaderboard.map((entry, index) => ({
        Rank: index + 1,
        Player: entry.playerName,
        Score: entry.score,
        Fish: entry.fishCaught,
        Difficulty: entry.completionTitle,
        Date: LeaderboardManager.formatDate(entry.timestamp)
    })));
}

/**
 * Clear all leaderboard entries
 */
export function clearLeaderboard(): void {
    LeaderboardManager.clearLeaderboard();
    console.log('Leaderboard cleared!');
}

/**
 * Test if a score qualifies for the leaderboard
 */
export function testHighScore(score: number): void {
    const isHigh = LeaderboardManager.isHighScore(score);
    const rank = LeaderboardManager.getPlayerRank(score);

    console.log(`Score ${score}:`);
    console.log(`- Qualifies for leaderboard: ${isHigh ? 'YES' : 'NO'}`);
    console.log(`- Would rank: #${rank}`);
}

/**
 * Add a custom score to test the leaderboard
 */
export function addTestScore(playerName: string, score: number, fishCaught: number = 10, difficulty: string = 'Test'): void {
    const isHighScore = LeaderboardManager.saveScore(playerName, score, fishCaught, difficulty);

    console.log(`Added score for ${playerName}: ${score} points (${fishCaught} fish)`);
    console.log(`High score: ${isHighScore ? 'YES' : 'NO'}`);

    if (isHighScore) {
        const rank = LeaderboardManager.getPlayerRank(score);
        console.log(`New rank: #${rank}`);
    }
}

// Make functions available globally for browser console testing
if (typeof window !== 'undefined') {
    (window as any).LeaderboardTest = {
        addSampleScores,
        displayLeaderboard,
        clearLeaderboard,
        testHighScore,
        addTestScore
    };

    console.log('Leaderboard test utilities loaded! Use LeaderboardTest.addSampleScores() to add test data.');
} 
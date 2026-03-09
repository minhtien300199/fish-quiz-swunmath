/**
 * StandardSetting Manager
 * Global singleton to store and manage the standard setting from the API.
 */

export interface StandardSetting {
    requiredAccuracy: number;
    minQuestions: number;
    allowSkip: boolean;
    timeLimit: number;
    minimumPlayTimes: number;
    gameType: number;
}

const DEFAULT_SETTING: StandardSetting = {
    requiredAccuracy: 65,
    minQuestions: 6,
    allowSkip: false,
    timeLimit: 0,
    minimumPlayTimes: 3,
    gameType: 0,
};

export class StandardSettingManager {
    private static setting: StandardSetting = { ...DEFAULT_SETTING };
    private static remainingPlayTimes: number = DEFAULT_SETTING.minimumPlayTimes;

    /**
     * Initialize from API response JSON (camelCase keys).
     */
    static init(data: Partial<StandardSetting> | null | undefined): void {
        if (!data) {
            this.setting = { ...DEFAULT_SETTING };
        } else {
            this.setting = {
                requiredAccuracy: data.requiredAccuracy ?? DEFAULT_SETTING.requiredAccuracy,
                minQuestions: data.minQuestions ?? DEFAULT_SETTING.minQuestions,
                allowSkip: data.allowSkip ?? DEFAULT_SETTING.allowSkip,
                timeLimit: data.timeLimit ?? DEFAULT_SETTING.timeLimit,
                minimumPlayTimes: data.minimumPlayTimes ?? DEFAULT_SETTING.minimumPlayTimes,
                gameType: data.gameType ?? DEFAULT_SETTING.gameType,
            };
        }
        this.remainingPlayTimes = this.setting.minimumPlayTimes;
        console.log('StandardSettingManager initialized:', this.setting, 'remainingPlayTimes:', this.remainingPlayTimes);
    }

    /** Get the full setting object. */
    static getSetting(): StandardSetting {
        return { ...this.setting };
    }

    /** Get remaining play times before the player can return to dashboard. */
    static getRemainingPlayTimes(): number {
        return this.remainingPlayTimes;
    }

    /** Decrement remaining play times by 1. Returns the new value. */
    static decrementPlayTimes(): number {
        if (this.remainingPlayTimes > 0) {
            this.remainingPlayTimes--;
        }
        console.log('StandardSettingManager: remainingPlayTimes =', this.remainingPlayTimes);
        return this.remainingPlayTimes;
    }

    /** Check if the player can return to dashboard (remaining play times <= 0). */
    static canReturnToDashboard(): boolean {
        return this.remainingPlayTimes <= 0;
    }
}

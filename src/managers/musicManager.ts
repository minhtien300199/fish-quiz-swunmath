/**
 * Music Manager
 * Handles background music and sound effects settings with persistent storage
 */
export class MusicManager {
    private static backgroundMusic: Phaser.Sound.BaseSound | null = null;
    private static isMusicEnabled: boolean = true;
    private static isSoundEnabled: boolean = true;
    private static currentScene: Phaser.Scene | null = null;

    /**
     * Initialize the music manager with a scene
     */
    static init(scene: Phaser.Scene): void {
        this.currentScene = scene;
        this.loadSettings();
    }

    /**
     * Start playing background music
     */
    static startBackgroundMusic(scene: Phaser.Scene): void {
        this.currentScene = scene;

        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }

        // Create background music
        this.backgroundMusic = scene.sound.add('game-background-music', {
            loop: true,
            volume: 0.1 // Set to 30% volume so it doesn't overpower sound effects
        });

        // Play music if enabled
        if (this.isMusicEnabled && this.backgroundMusic) {
            this.backgroundMusic.play();
        }
    }

    /**
     * Stop background music
     */
    static stopBackgroundMusic(): void {
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
    }

    /**
     * Toggle music on/off
     */
    static toggleMusic(): boolean {
        this.isMusicEnabled = !this.isMusicEnabled;
        this.saveSettings();

        if (this.backgroundMusic) {
            if (this.isMusicEnabled) {
                // Resume music if it was paused, or start if it wasn't playing
                if (this.backgroundMusic.isPaused) {
                    this.backgroundMusic.resume();
                } else if (!this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.play();
                }
            } else {
                // Pause music instead of stopping to preserve position
                if (this.backgroundMusic.isPlaying) {
                    this.backgroundMusic.pause();
                }
            }
        }

        return this.isMusicEnabled;
    }

    /**
     * Toggle sound effects on/off
     */
    static toggleSound(): boolean {
        this.isSoundEnabled = !this.isSoundEnabled;
        this.saveSettings();

        // Only affect sound effects, not background music
        if (this.currentScene) {
            // We need a more targeted approach since scene.sound.mute affects ALL sounds including music
            // Instead, we'll just rely on the playSound method to check isSoundEnabled
            // The scene.sound.mute approach was too broad and affected background music
        }

        return this.isSoundEnabled;
    }

    /**
     * Get current music enabled state
     */
    static isMusicOn(): boolean {
        return this.isMusicEnabled;
    }

    /**
     * Get current sound enabled state
     */
    static isSoundOn(): boolean {
        return this.isSoundEnabled;
    }

    /**
     * Play a sound effect (respects sound settings)
     */
    static playSound(scene: Phaser.Scene, key: string, config?: object): void {
        if (this.isSoundEnabled) {
            scene.sound.play(key, config);
        }
    }

    /**
     * Save settings to localStorage
     */
    private static saveSettings(): void {
        try {
            localStorage.setItem('fish-quiz-music-enabled', this.isMusicEnabled.toString());
            localStorage.setItem('fish-quiz-sound-enabled', this.isSoundEnabled.toString());
        } catch (error) {
            console.warn('Could not save music settings to localStorage:', error);
        }
    }

    /**
     * Load settings from localStorage
     */
    private static loadSettings(): void {
        try {
            const musicSetting = localStorage.getItem('fish-quiz-music-enabled');
            const soundSetting = localStorage.getItem('fish-quiz-sound-enabled');

            if (musicSetting !== null) {
                this.isMusicEnabled = musicSetting === 'true';
            }

            if (soundSetting !== null) {
                this.isSoundEnabled = soundSetting === 'true';
            }
        } catch (error) {
            console.warn('Could not load music settings from localStorage:', error);
        }
    }

    /**
     * Set music volume
     */
    static setMusicVolume(volume: number): void {
        if (this.backgroundMusic) {
            (this.backgroundMusic as any).setVolume(volume);
        }
    }
} 
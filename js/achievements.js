/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - ACHIEVEMENT SYSTEM
 * ═══════════════════════════════════════════════════════════════
 * Track and reward player accomplishments
 */

/**
 * Achievement definitions
 */
export const Achievements = {
    // Progression
    FIRST_STEPS: {
        id: 'first_steps',
        name: 'Langkah Pertama',
        description: 'Selesaikan Level 1',
        icon: '🚀',
        condition: (stats) => stats.levelsCompleted >= 1
    },
    LOOP_MASTER: {
        id: 'loop_master',
        name: 'Loop Master',
        description: 'Selesaikan Level 3 (Loop Basics)',
        icon: '🔁',
        condition: (stats) => stats.levelsCompleted >= 3
    },
    SENSOR_PRO: {
        id: 'sensor_pro',
        name: 'Sensor Pro',
        description: 'Selesaikan Level 4 (Sensing)',
        icon: '👁️',
        condition: (stats) => stats.levelsCompleted >= 4
    },
    CONDITIONAL_EXPERT: {
        id: 'conditional_expert',
        name: 'Conditional Expert',
        description: 'Selesaikan Level 5 (IF/ELSE)',
        icon: '❓',
        condition: (stats) => stats.levelsCompleted >= 5
    },
    PATHFINDER: {
        id: 'pathfinder',
        name: 'Pathfinder',
        description: 'Selesaikan Level 6 (Wall Avoidance)',
        icon: '🧭',
        condition: (stats) => stats.levelsCompleted >= 6
    },
    ENERGY_SAVER: {
        id: 'energy_saver',
        name: 'Energy Saver',
        description: 'Selesaikan Level 7 (Energy Management)',
        icon: '🔋',
        condition: (stats) => stats.levelsCompleted >= 7
    },
    WHILE_WIZARD: {
        id: 'while_wizard',
        name: 'While Wizard',
        description: 'Selesaikan Level 8 (WHILE Loops)',
        icon: '♾️',
        condition: (stats) => stats.levelsCompleted >= 8
    },
    FOG_EXPLORER: {
        id: 'fog_explorer',
        name: 'Fog Explorer',
        description: 'Selesaikan Level 9 (Fog of War)',
        icon: '🌫️',
        condition: (stats) => stats.levelsCompleted >= 9
    },
    ULTIMATE_CODER: {
        id: 'ultimate_coder',
        name: 'Ultimate Coder',
        description: 'Selesaikan semua 10 level!',
        icon: '🏆',
        condition: (stats) => stats.levelsCompleted >= 10
    },

    // Efficiency
    PERFECT_RUN: {
        id: 'perfect_run',
        name: 'Perfect Run',
        description: 'Dapatkan 5 bintang di satu level',
        icon: '⭐',
        condition: (stats) => stats.maxStars >= 5
    },
    EFFICIENCY_KING: {
        id: 'efficiency_king',
        name: 'Efficiency King',
        description: 'Dapatkan total 30 bintang',
        icon: '👑',
        condition: (stats) => stats.totalStars >= 30
    },
    SPEED_DEMON: {
        id: 'speed_demon',
        name: 'Speed Demon',
        description: 'Selesaikan level dalam < 10 langkah',
        icon: '⚡',
        condition: (stats) => stats.minSteps <= 10 && stats.minSteps > 0
    },

    // Special
    NO_HINTS: {
        id: 'no_hints',
        name: 'Independent',
        description: 'Selesaikan level tanpa melihat hint',
        icon: '🧠',
        condition: (stats) => stats.levelsWithoutHints >= 1
    },
    PERSISTENT: {
        id: 'persistent',
        name: 'Persistent',
        description: 'Coba ulang level 5 kali',
        icon: '💪',
        condition: (stats) => stats.totalRetries >= 5
    },
    CODE_WRITER: {
        id: 'code_writer',
        name: 'Code Writer',
        description: 'Tulis lebih dari 50 baris kode',
        icon: '📝',
        condition: (stats) => stats.totalLinesWritten >= 50
    },
    COLLECTOR: {
        id: 'collector',
        name: 'Collector',
        description: 'Kumpulkan 50 crystal total',
        icon: '💎',
        condition: (stats) => stats.totalCrystals >= 50
    },
    EXPLORER: {
        id: 'explorer',
        name: 'Explorer',
        description: 'Buka lebih dari 100 tile fog',
        icon: '🗺️',
        condition: (stats) => stats.tilesRevealed >= 100
    }
};

/**
 * Achievement Manager class
 */
export class AchievementManager {
    constructor() {
        this.unlockedAchievements = new Set();
        this.stats = {
            levelsCompleted: 0,
            totalStars: 0,
            maxStars: 0,
            minSteps: Infinity,
            totalRetries: 0,
            totalLinesWritten: 0,
            totalCrystals: 0,
            tilesRevealed: 0,
            levelsWithoutHints: 0,
            hintsUsedThisLevel: false
        };

        this.onAchievementUnlock = null; // Callback
        this.load();
    }

    /**
     * Update stats and check achievements
     */
    updateStats(updates) {
        Object.assign(this.stats, updates);
        this.save();
        return this.checkAchievements();
    }

    /**
     * Record level completion
     */
    recordLevelComplete(levelNum, stars, steps, crystals) {
        const updates = {
            levelsCompleted: Math.max(this.stats.levelsCompleted, levelNum),
            totalStars: this.stats.totalStars + stars,
            maxStars: Math.max(this.stats.maxStars, stars),
            minSteps: Math.min(this.stats.minSteps, steps),
            totalCrystals: this.stats.totalCrystals + crystals
        };

        if (!this.stats.hintsUsedThisLevel) {
            updates.levelsWithoutHints = this.stats.levelsWithoutHints + 1;
        }

        // Reset hint tracking for next level
        this.stats.hintsUsedThisLevel = false;

        return this.updateStats(updates);
    }

    /**
     * Record hint usage
     */
    recordHintUsed() {
        this.stats.hintsUsedThisLevel = true;
    }

    /**
     * Record retry
     */
    recordRetry() {
        this.updateStats({ totalRetries: this.stats.totalRetries + 1 });
    }

    /**
     * Record code written
     */
    recordCodeWritten(lines) {
        this.updateStats({ totalLinesWritten: this.stats.totalLinesWritten + lines });
    }

    /**
     * Record tiles revealed
     */
    recordTilesRevealed(count) {
        this.updateStats({ tilesRevealed: this.stats.tilesRevealed + count });
    }

    /**
     * Check all achievements and return newly unlocked ones
     */
    checkAchievements() {
        const newlyUnlocked = [];

        for (const [key, achievement] of Object.entries(Achievements)) {
            if (!this.unlockedAchievements.has(achievement.id)) {
                if (achievement.condition(this.stats)) {
                    this.unlockedAchievements.add(achievement.id);
                    newlyUnlocked.push(achievement);

                    if (this.onAchievementUnlock) {
                        this.onAchievementUnlock(achievement);
                    }
                }
            }
        }

        if (newlyUnlocked.length > 0) {
            this.save();
        }

        return newlyUnlocked;
    }

    /**
     * Get all achievements with unlock status
     */
    getAllAchievements() {
        return Object.values(Achievements).map(a => ({
            ...a,
            unlocked: this.unlockedAchievements.has(a.id)
        }));
    }

    /**
     * Get unlocked count
     */
    getUnlockedCount() {
        return this.unlockedAchievements.size;
    }

    /**
     * Get total count
     */
    getTotalCount() {
        return Object.keys(Achievements).length;
    }

    /**
     * Save to localStorage
     */
    save() {
        try {
            localStorage.setItem('autodrone_achievements', JSON.stringify({
                unlocked: [...this.unlockedAchievements],
                stats: this.stats
            }));
        } catch (e) {
            console.warn('Could not save achievements:', e);
        }
    }

    /**
     * Load from localStorage
     */
    load() {
        try {
            const saved = localStorage.getItem('autodrone_achievements');
            if (saved) {
                const data = JSON.parse(saved);
                this.unlockedAchievements = new Set(data.unlocked || []);
                Object.assign(this.stats, data.stats || {});
            }
        } catch (e) {
            console.warn('Could not load achievements:', e);
        }
    }

    /**
     * Reset all achievements
     */
    reset() {
        this.unlockedAchievements = new Set();
        this.stats = {
            levelsCompleted: 0,
            totalStars: 0,
            maxStars: 0,
            minSteps: Infinity,
            totalRetries: 0,
            totalLinesWritten: 0,
            totalCrystals: 0,
            tilesRevealed: 0,
            levelsWithoutHints: 0,
            hintsUsedThisLevel: false
        };
        this.save();
    }
}

export default AchievementManager;

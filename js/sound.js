/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - SOUND MANAGER
 * ═══════════════════════════════════════════════════════════════
 * Audio feedback for game actions using Web Audio API
 */

export class SoundManager {
    constructor() {
        this.enabled = true;
        this.volume = 0.3;
        this.audioContext = null;

        // Initialize on first user interaction
        this.initialized = false;
    }

    /**
     * Initialize audio context (must be called from user gesture)
     */
    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
            console.log('🔊 Sound Manager initialized');
        } catch (e) {
            console.warn('Audio not supported:', e);
            this.enabled = false;
        }
    }

    /**
     * Play a tone
     */
    playTone(frequency, duration, type = 'sine', volumeMod = 1) {
        if (!this.enabled || !this.audioContext) return;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.value = frequency;

        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(this.volume * volumeMod, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

        oscillator.start(now);
        oscillator.stop(now + duration);
    }

    /**
     * Play move sound
     */
    playMove() {
        this.playTone(200, 0.1, 'sine', 0.5);
    }

    /**
     * Play turn sound
     */
    playTurn() {
        this.playTone(300, 0.08, 'sine', 0.4);
    }

    /**
     * Play collect sound (happy melody)
     */
    playCollect() {
        this.playTone(523, 0.1, 'sine'); // C5
        setTimeout(() => this.playTone(659, 0.1, 'sine'), 100); // E5
        setTimeout(() => this.playTone(784, 0.15, 'sine'), 200); // G5
    }

    /**
     * Play error sound
     */
    playError() {
        this.playTone(200, 0.2, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(150, 0.3, 'sawtooth', 0.2), 100);
    }

    /**
     * Play level complete fanfare
     */
    playLevelComplete() {
        const notes = [523, 587, 659, 784, 880, 1047]; // C to C scale
        notes.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.5), i * 100);
        });
    }

    /**
     * Play game over sound
     */
    playGameOver() {
        this.playTone(400, 0.3, 'sawtooth', 0.4);
        setTimeout(() => this.playTone(300, 0.3, 'sawtooth', 0.3), 200);
        setTimeout(() => this.playTone(200, 0.5, 'sawtooth', 0.2), 400);
    }

    /**
     * Play scan sound
     */
    playScan() {
        this.playTone(800, 0.05, 'sine', 0.3);
        setTimeout(() => this.playTone(1200, 0.08, 'sine', 0.2), 50);
    }

    /**
     * Play energy warning
     */
    playEnergyWarning() {
        this.playTone(440, 0.1, 'square', 0.2);
        setTimeout(() => this.playTone(440, 0.1, 'square', 0.2), 150);
    }

    /**
     * Play achievement unlock
     */
    playAchievement() {
        const melody = [659, 784, 880, 1047, 1319];
        melody.forEach((freq, i) => {
            setTimeout(() => this.playTone(freq, 0.15, 'sine', 0.4), i * 80);
        });
    }

    /**
     * Play button click
     */
    playClick() {
        this.playTone(600, 0.05, 'sine', 0.2);
    }

    /**
     * Toggle sound on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    /**
     * Set volume (0-1)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
    }
}

export default SoundManager;

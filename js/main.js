/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE v3.0 - MAIN APPLICATION
 * ═══════════════════════════════════════════════════════════════
 * Enhanced with sound, achievements, syntax highlighting,
 * particles, debug panel, templates, and themes.
 */

import { Lexer, LexerError } from './lexer.js';
import { Parser, ParseError } from './parser.js';
import { CppLexer, CppLexerError } from './lexer_cpp.js';
import { CppParser } from './parser_cpp.js';
import { Compiler } from './compiler.js';
import { VirtualMachine, VMState, RuntimeError, EventType } from './vm.js';
import { GameState } from './game.js';
import { Renderer } from './renderer.js';
import { AnalysisEngine } from './analysis.js';
import { UIController } from './ui.js';
import { Levels, getLevelByNumber } from './levels.js';
import { SoundManager } from './sound.js';
import { AchievementManager } from './achievements.js';
import { SyntaxHighlighter } from './syntax.js';
import { ParticleSystem } from './particles.js';
import { TemplateManager } from './templates.js';
import { DebugPanel } from './debug.js';

/**
 * Main Application Class
 */
class AutoDroneApp {
    constructor() {
        // Core components
        this.ui = null;
        this.renderer = null;
        this.vm = null;
        this.gameState = null;
        this.analysis = new AnalysisEngine();

        // Enhancement modules
        this.sound = new SoundManager();
        this.achievements = new AchievementManager();
        this.syntax = new SyntaxHighlighter();
        this.particles = new ParticleSystem();
        this.templates = null;
        this.debug = new DebugPanel();

        // Current level
        this.currentLevel = 1;
        this.currentLevelData = null;

        // Execution state
        this.isRunning = false;
        this.animationFrame = null;
        this.executionInterval = null;

        // Debounce timer for parsing
        this.parseDebounce = null;

        // Theme
        this.currentTheme = 'dark';

        // Language mode: 'python' or 'cpp'
        this.languageMode = 'python';
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('🤖 AutoDrone v3.0 initializing...');

        // Initialize UI
        this.ui = new UIController();

        // Initialize renderer with particle system
        const canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(canvas, this.particles);

        // Initialize syntax highlighting
        this.syntax.init('code-editor');

        // Initialize templates
        this.templates = new TemplateManager(document.getElementById('code-editor'));
        this.templates.createDropdown('template-container');

        // Initialize debug panel
        this.debug.create();

        // Setup UI callbacks
        this.setupUICallbacks();

        // Setup toolbar buttons
        this.setupToolbar();

        // Setup achievement callbacks
        this.setupAchievements();

        // Load first level
        this.loadLevel(1);

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Start render loop
        this.startRenderLoop();

        // Initial messages
        this.ui.log('🤖 Selamat datang di AutoDrone v3.0!', 'success');
        this.ui.log('✨ Fitur baru: Sound, Achievements, Syntax Highlighting!', 'info');
        this.ui.log('Tekan F5 atau klik Run untuk menjalankan script.', 'info');

        // Update achievement count
        this.updateAchievementCount();

        console.log('✓ AutoDrone v3.0 ready!');
    }

    /**
     * Setup UI callbacks
     */
    setupUICallbacks() {
        // Code change handler
        this.ui.onCodeChange = () => {
            clearTimeout(this.parseDebounce);
            this.parseDebounce = setTimeout(() => {
                this.parseCode();
                this.syntax.highlight();
            }, 300);
        };

        // Control buttons
        this.ui.btnRun.addEventListener('click', () => this.run());
        this.ui.btnPause.addEventListener('click', () => this.pause());
        this.ui.btnStep.addEventListener('click', () => this.step());
        this.ui.btnStop.addEventListener('click', () => this.stop());
        this.ui.btnReset.addEventListener('click', () => this.resetLevel());
        this.ui.btnRewind.addEventListener('click', () => this.rewind());

        // Next level button
        document.getElementById('btn-next-level').addEventListener('click', () => {
            this.sound.playClick();
            this.ui.hideOverlay();
            if (this.currentLevel < Levels.length) {
                this.loadLevel(this.currentLevel + 1);
            }
        });

        // Level buttons (event delegation)
        this.setupLevelButtons();

        // Hint button - track for achievement
        if (this.ui.btnHint) {
            const originalClick = this.ui.btnHint.onclick;
            this.ui.btnHint.addEventListener('click', () => {
                this.achievements.recordHintUsed();
            });
        }
    }

    /**
     * Setup level button click handlers
     */
    setupLevelButtons() {
        const levelSelector = document.getElementById('level-selector');
        if (levelSelector) {
            levelSelector.addEventListener('click', (e) => {
                const btn = e.target.closest('.level-btn');
                if (btn) {
                    this.sound.playClick();
                    const level = parseInt(btn.dataset.level);
                    if (level) this.loadLevel(level);
                }
            });
        }
    }

    /**
     * Setup toolbar buttons
     */
    setupToolbar() {
        // Debug toggle
        document.getElementById('btn-debug')?.addEventListener('click', () => {
            this.sound.playClick();
            const enabled = this.debug.toggle();
            document.getElementById('btn-debug').classList.toggle('active', enabled);
        });

        // Sound toggle
        document.getElementById('btn-sound')?.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            const btn = document.getElementById('btn-sound');
            btn.classList.toggle('active', enabled);
            btn.classList.toggle('off', !enabled);
            btn.textContent = enabled ? '🔊' : '🔇';
            if (enabled) this.sound.playClick();
        });

        // Particles toggle
        document.getElementById('btn-particles')?.addEventListener('click', () => {
            this.sound.playClick();
            const enabled = this.particles.toggle();
            const btn = document.getElementById('btn-particles');
            btn.classList.toggle('active', enabled);
            btn.classList.toggle('off', !enabled);
        });

        // Theme toggle
        document.getElementById('btn-theme')?.addEventListener('click', () => {
            this.sound.playClick();
            this.toggleTheme();
        });

        // Achievements button
        document.getElementById('btn-achievements')?.addEventListener('click', () => {
            this.sound.playClick();
            this.showAchievementsModal();
        });

        // Achievement modal close
        document.getElementById('achievement-modal-close')?.addEventListener('click', () => {
            document.getElementById('achievement-modal').classList.add('hidden');
        });

        // Close modal on backdrop click
        document.getElementById('achievement-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'achievement-modal') {
                document.getElementById('achievement-modal').classList.add('hidden');
            }
        });

        // Language mode toggle
        document.getElementById('btn-language')?.addEventListener('click', () => {
            this.sound.playClick();
            this.toggleLanguageMode();
        });
    }

    /**
     * Toggle language mode between Python and C++
     */
    toggleLanguageMode() {
        this.languageMode = this.languageMode === 'python' ? 'cpp' : 'python';

        const btn = document.getElementById('btn-language');
        if (btn) {
            btn.textContent = this.languageMode === 'python' ? '🐍' : '⚙️';
            btn.title = this.languageMode === 'python' ? 'Python Mode' : 'C++ Mode';
        }

        // Update syntax highlighter mode
        this.syntax.setMode(this.languageMode);

        // Update templates
        if (this.templates) {
            this.templates.setMode(this.languageMode);
        }

        // Re-highlight
        this.syntax.highlight();

        // Show notification
        const modeName = this.languageMode === 'python' ? 'Python' : 'C++';
        this.ui.log(`🔄 Switched to ${modeName} syntax mode`, 'info');

        // Show example
        if (this.languageMode === 'cpp') {
            this.ui.log('💡 Contoh: move_forward(); turn_left(); for (int i = 0; i < 3; i++) { }', 'info');
        } else {
            this.ui.log('💡 Contoh: MOVE forward, TURN left, LOOP 3: ... END', 'info');
        }
    }

    /**
     * Setup achievements
     */
    setupAchievements() {
        this.achievements.onAchievementUnlock = (achievement) => {
            // Play sound
            this.sound.playAchievement();

            // Show badge
            const badge = document.getElementById('achievement-badge');
            const icon = document.getElementById('achievement-icon');
            const name = document.getElementById('achievement-name');

            if (badge && icon && name) {
                icon.textContent = achievement.icon;
                name.textContent = achievement.name;
                badge.classList.remove('hidden');

                // Emit particles at badge location
                this.particles.emitAchievement(window.innerWidth / 2, 80);

                // Hide after 3 seconds
                setTimeout(() => {
                    badge.classList.add('hidden');
                }, 3000);
            }

            // Log
            this.ui.logSuccess(`🏆 Achievement Unlocked: ${achievement.name}!`);

            // Update count
            this.updateAchievementCount();
        };
    }

    /**
     * Update achievement count display
     */
    updateAchievementCount() {
        const countEl = document.getElementById('achievement-count');
        if (countEl) {
            countEl.textContent = `🏆 ${this.achievements.getUnlockedCount()}/${this.achievements.getTotalCount()}`;
        }
    }

    /**
     * Show achievements modal
     */
    showAchievementsModal() {
        const modal = document.getElementById('achievement-modal');
        const list = document.getElementById('achievement-list');

        if (!modal || !list) return;

        // Generate achievement list
        const achievements = this.achievements.getAllAchievements();
        list.innerHTML = achievements.map(a => `
            <div class="achievement-item ${a.unlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${a.unlocked ? a.icon : '🔒'}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${a.name}</div>
                    <div class="achievement-desc">${a.description}</div>
                </div>
            </div>
        `).join('');

        modal.classList.remove('hidden');
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = this.currentTheme;

        const btn = document.getElementById('btn-theme');
        if (btn) {
            btn.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
        }

        this.ui.log(`🎨 Theme switched to ${this.currentTheme}`, 'info');
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (document.activeElement === this.ui.codeEditor && !e.ctrlKey) {
                return;
            }

            switch (e.key) {
                case 'F5':
                    e.preventDefault();
                    this.run();
                    break;
                case 'F6':
                    e.preventDefault();
                    this.pause();
                    break;
                case 'F7':
                    e.preventDefault();
                    this.step();
                    break;
                case 'F8':
                    e.preventDefault();
                    this.stop();
                    break;
            }
        });

        // Initialize sound on first interaction
        document.addEventListener('click', () => this.sound.init(), { once: true });
        document.addEventListener('keydown', () => this.sound.init(), { once: true });
    }

    /**
     * Load a level
     */
    loadLevel(levelNum) {
        this.stop();

        this.currentLevel = levelNum;
        this.currentLevelData = getLevelByNumber(levelNum);

        if (!this.currentLevelData) {
            this.ui.logError(`Level ${levelNum} tidak ditemukan!`);
            return;
        }

        // Initialize game state
        this.gameState = new GameState(this.currentLevelData);

        // Initialize renderer
        this.renderer.initCanvas(this.currentLevelData.width, this.currentLevelData.height);

        // Clear particles
        this.particles.clear();

        // Reset debug panel
        this.debug.reset();

        // Update UI
        this.ui.setActiveLevel(levelNum);
        this.ui.updateStats(this.gameState);
        this.ui.updateLessonBanner(this.currentLevelData, levelNum);
        this.ui.hideOverlay();
        this.ui.clearConsole();
        this.ui.setControlState('ready');
        this.ui.updateVMState('READY');
        this.ui.clearHighlight();

        // Log level info
        this.ui.log(`═══ ${this.currentLevelData.name} ═══`, 'info');
        this.ui.log(this.currentLevelData.description, 'info');

        if (this.currentLevelData.lesson) {
            this.ui.log(`📚 Konsep: ${this.currentLevelData.lesson}`, 'info');
        }

        // Clear editor
        this.ui.setCode('');
        this.syntax.highlight();

        console.log(`Loaded level ${levelNum}: ${this.currentLevelData.name}`);
    }

    /**
     * Reset current level
     */
    resetLevel() {
        this.stop();
        this.gameState.reset(this.currentLevelData);
        this.particles.clear();
        this.debug.reset();
        this.ui.updateStats(this.gameState);
        this.ui.hideOverlay();
        this.ui.setControlState('ready');
        this.ui.updateVMState('READY');
        this.ui.clearHighlight();
        this.ui.log('🔄 Level reset.', 'info');

        // Track retry for achievement
        this.achievements.recordRetry();
    }

    /**
     * Parse code
     */
    parseCode() {
        const code = this.ui.getCode();

        if (!code.trim()) {
            this.ui.setParseStatus(true);
            return null;
        }

        try {
            let tokens, result;

            if (this.languageMode === 'cpp') {
                // C++ mode
                const lexer = new CppLexer(code);
                tokens = lexer.tokenize();

                const parser = new CppParser(tokens);
                result = parser.parse();
            } else {
                // Python mode (default)
                const lexer = new Lexer(code);
                tokens = lexer.tokenize();

                const parser = new Parser(tokens);
                result = parser.parse();
            }

            if (result.warnings.length > 0) {
                result.warnings.forEach(w => {
                    this.ui.logWarning(`Line ${w.line}: ${w.message}`);
                });
            }

            this.ui.setParseStatus(true);
            return result.ast;

        } catch (error) {
            if (error instanceof LexerError || error instanceof ParseError ||
                error instanceof CppLexerError) {
                this.ui.setParseStatus(false, `Ln ${error.line}: ${error.message}`);
            } else {
                this.ui.setParseStatus(false, error.message);
            }
            return null;
        }
    }

    /**
     * Compile code
     */
    compileCode() {
        const ast = this.parseCode();
        if (!ast) return null;

        try {
            const compiler = new Compiler();
            return compiler.compile(ast);
        } catch (error) {
            this.ui.logError(`Compile error: ${error.message}`);
            return null;
        }
    }

    /**
     * Run script
     */
    run() {
        // Initialize sound
        this.sound.init();

        // Resume if paused
        if (this.vm && this.vm.state === VMState.PAUSED) {
            this.vm.run();
            this.isRunning = true;
            this.ui.setControlState('running');
            this.ui.updateVMState('RUNNING');
            this.startExecution();
            return;
        }

        // Reset and compile
        this.resetLevel();

        const bytecode = this.compileCode();
        if (!bytecode) {
            this.sound.playError();
            this.ui.logError('Cannot run: perbaiki syntax error dulu.');
            return;
        }

        // Track code lines for achievement
        const lines = this.ui.getCode().split('\n').length;
        this.achievements.recordCodeWritten(lines);

        // Create VM
        this.vm = new VirtualMachine(bytecode, this.gameState, {
            maxInstructions: 10000,
            maxLoopIterations: 1000
        });

        // Setup VM events
        this.vm.on(EventType.LOG, (event) => {
            this.ui.log(String(event.data.message), 'info');
        });

        this.vm.on(EventType.STATE_CHANGE, (event) => {
            this.ui.updateVMState(event.data.state);
            if (event.data.state === VMState.HALTED) {
                this.onExecutionComplete();
            }
        });

        this.vm.on(EventType.ERROR, (event) => {
            this.sound.playError();
            this.ui.logError(event.data.error.message);
            if (event.data.error.hint) {
                this.ui.log(`Hint: ${event.data.error.hint}`, 'info');
            }
        });

        // Start
        this.vm.run();
        this.isRunning = true;
        this.ui.setControlState('running');
        this.ui.log('▶ Eksekusi dimulai', 'success');

        this.startExecution();
    }

    /**
     * Start execution loop
     */
    startExecution() {
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
        }

        const speed = this.ui.getSpeed();
        const interval = Math.max(50, 500 / speed);

        this.executionInterval = setInterval(() => {
            this.executeTick();
        }, interval);
    }

    /**
     * Execute tick
     */
    executeTick() {
        if (!this.vm || this.vm.state !== VMState.RUNNING) {
            this.stopExecution();
            return;
        }

        try {
            const action = this.vm.tick();

            if (action) {
                this.processAction(action);
            }

            // Update debug
            this.debug.update(this.gameState);

            // Highlight line
            const line = this.vm.getCurrentLine();
            if (line > 0) {
                this.ui.highlightLine(line);
            }

            // Update stats
            this.ui.updateStats(this.gameState);

            // Check game status
            if (this.gameState.status !== 'playing') {
                this.vm.stop();
            }

        } catch (error) {
            this.stopExecution();
            this.sound.playError();
            this.ui.logError(error.message);
            this.ui.setControlState('error');
        }
    }

    /**
     * Process action
     */
    processAction(action) {
        let result;
        const droneX = this.gameState.drone.x;
        const droneY = this.gameState.drone.y;

        // Calculate canvas position for particles
        const tileSize = this.renderer.tileSize;
        const canvasX = droneX * tileSize + tileSize / 2;
        const canvasY = droneY * tileSize + tileSize / 2;

        switch (action.type) {
            case 'MOVE':
                result = this.gameState.executeMove(action.direction);
                if (result.success) {
                    this.sound.playMove();
                    this.ui.logAction(action);

                    // Move trail particles
                    this.particles.emitMoveTrail(canvasX, canvasY, action.direction);

                    // Animate
                    const oldX = this.renderer.dronePos.x;
                    const oldY = this.renderer.dronePos.y;
                    this.renderer.animateMove(oldX, oldY, result.newPosition.x, result.newPosition.y);

                    // Energy drain particle
                    if (this.gameState.drone.energy < 30) {
                        this.particles.emitEnergyDrain(canvasX, canvasY);
                    }
                } else {
                    this.sound.playError();
                    this.ui.logWarning(`MOVE failed: ${result.reason}`);
                    this.particles.emitError(canvasX, canvasY);
                }
                break;

            case 'TURN':
                result = this.gameState.executeTurn(action.direction);
                if (result.success) {
                    this.sound.playTurn();
                    this.ui.logAction(action);
                    this.renderer.animateTurn(result.newFacing);
                }
                break;

            case 'COLLECT':
                result = this.gameState.executeCollect();
                if (result.success) {
                    this.sound.playCollect();
                    this.ui.log(`COLLECT: Got ${result.collected}!`, 'success');

                    // Collect particles
                    const newCanvasX = this.gameState.drone.x * tileSize + tileSize / 2;
                    const newCanvasY = this.gameState.drone.y * tileSize + tileSize / 2;
                    this.particles.emitCollect(newCanvasX, newCanvasY,
                        result.collected === 'crystal' ? '#00f0ff' : '#aa66ff');
                } else {
                    this.ui.logWarning(`COLLECT failed: ${result.reason}`);
                }
                break;

            case 'WAIT':
                result = this.gameState.executeWait(action.ticks);
                this.ui.log(`WAIT ${action.ticks}: +${result.energyRestored} energy`, 'action');
                if (result.energyRestored > 0) {
                    this.particles.emitEnergyGain(canvasX, canvasY);
                }
                break;
        }
    }

    /**
     * Pause execution
     */
    pause() {
        if (this.vm) {
            this.vm.pause();
            this.isRunning = false;
            this.stopExecution();
            this.ui.setControlState('paused');
            this.ui.log('⏸ Eksekusi dijeda', 'warning');
        }
    }

    /**
     * Step execution
     */
    step() {
        if (!this.vm || this.vm.state === VMState.HALTED || this.vm.state === VMState.ERROR) {
            this.resetLevel();

            const bytecode = this.compileCode();
            if (!bytecode) return;

            this.vm = new VirtualMachine(bytecode, this.gameState);
            this.setupVMEventHandlers();
            this.vm.state = VMState.PAUSED;
            this.ui.setControlState('paused');
            this.ui.updateVMState('PAUSED');
        }

        if (this.vm.state === VMState.READY) {
            this.vm.state = VMState.PAUSED;
        }

        try {
            const action = this.vm.tick();

            if (action) {
                this.processAction(action);
            }

            this.debug.update(this.gameState);

            const line = this.vm.getCurrentLine();
            if (line > 0) {
                this.ui.highlightLine(line);
            }

            this.ui.updateStats(this.gameState);

            if (this.gameState.status !== 'playing') {
                this.vm.stop();
            }

        } catch (error) {
            this.sound.playError();
            this.ui.logError(error.message);
            this.ui.setControlState('error');
        }
    }

    /**
     * Setup VM event handlers for step mode
     */
    setupVMEventHandlers() {
        this.vm.on(EventType.LOG, (event) => {
            this.ui.log(String(event.data.message), 'info');
        });

        this.vm.on(EventType.STATE_CHANGE, (event) => {
            this.ui.updateVMState(event.data.state);
            if (event.data.state === VMState.HALTED) {
                this.onExecutionComplete();
            }
        });

        this.vm.on(EventType.ERROR, (event) => {
            this.sound.playError();
            this.ui.logError(event.data.error.message);
        });
    }

    /**
     * Stop execution
     */
    stop() {
        if (this.vm) {
            this.vm.stop();
        }
        this.isRunning = false;
        this.stopExecution();
        this.ui.setControlState('halted');
        this.ui.clearHighlight();
    }

    /**
     * Stop execution interval
     */
    stopExecution() {
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
            this.executionInterval = null;
        }
    }

    /**
     * Rewind
     */
    rewind() {
        if (this.vm && this.vm.rewind(5)) {
            this.ui.log('⏪ Rewound 5 steps', 'info');
            this.ui.updateStats(this.gameState);
            this.debug.update(this.gameState);
        }
    }

    /**
     * Execution complete
     */
    onExecutionComplete() {
        this.stopExecution();
        this.ui.clearHighlight();
        this.ui.setControlState('halted');

        // Run analysis
        const result = this.analysis.analyze(
            this.gameState,
            this.vm.eventLog,
            this.currentLevelData
        );

        // Display analysis
        this.ui.displayAnalysis(result);

        // Handle win/lose
        if (this.gameState.status === 'won') {
            this.sound.playLevelComplete();

            // Confetti!
            const canvas = document.getElementById('game-canvas');
            this.particles.emitLevelComplete(
                canvas.width / 2,
                canvas.height / 2,
                canvas.width,
                canvas.height
            );

            const lesson = this.currentLevelData.lesson || '';
            this.ui.showOverlay(
                '🎉 Level Selesai!',
                this.gameState.statusMessage,
                result.stars,
                lesson
            );
            this.ui.markLevelCompleted(this.currentLevel);
            this.ui.logSuccess('✓ Semua objective tercapai!');

            // Congratulate
            if (result.stars >= 4) {
                this.ui.log('🌟 Luar biasa! Solusi yang sangat efisien!', 'success');
            } else if (result.stars >= 2) {
                this.ui.log('👍 Bagus! Coba optimalkan untuk bintang lebih banyak.', 'info');
            }

            // Record achievement
            this.achievements.recordLevelComplete(
                this.currentLevel,
                result.stars,
                this.gameState.stats.ticks,
                this.gameState.inventory.crystal
            );

        } else if (this.gameState.status === 'lost') {
            this.sound.playGameOver();
            this.ui.showOverlay(
                '💀 Game Over',
                this.gameState.statusMessage,
                0,
                'Jangan menyerah! Coba lagi dengan strategi berbeda.'
            );
            this.ui.logError(this.gameState.statusMessage);
        } else {
            this.ui.log('Eksekusi selesai.', 'info');
        }

        this.ui.log(`Skor: ${result.score}/100 (${result.stars} bintang)`, 'info');
    }

    /**
     * Render loop
     */
    startRenderLoop() {
        const render = () => {
            if (this.gameState) {
                // Update particles
                this.particles.update();

                // Render game + particles
                this.renderer.render(this.gameState);
                this.particles.draw(this.renderer.ctx);
            }
            this.animationFrame = requestAnimationFrame(render);
        };
        render();
    }
}

// ═══════════════════════════════════════════════════════════════
// Application Entry Point
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    const app = new AutoDroneApp();
    app.init();

    // Expose for debugging
    window.AutoDrone = app;
});

/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - MAIN APPLICATION
 * ═══════════════════════════════════════════════════════════════
 * Bootstrap and game loop controller.
 */

import { Lexer, LexerError } from './lexer.js';
import { Parser, ParseError } from './parser.js';
import { Compiler } from './compiler.js';
import { VirtualMachine, VMState, RuntimeError, EventType } from './vm.js';
import { GameState } from './game.js';
import { Renderer } from './renderer.js';
import { AnalysisEngine } from './analysis.js';
import { UIController } from './ui.js';
import { Levels, getLevelByNumber } from './levels.js';

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

        // Current level
        this.currentLevel = 1;
        this.currentLevelData = null;

        // Execution state
        this.isRunning = false;
        this.animationFrame = null;
        this.executionInterval = null;

        // Debounce timer for parsing
        this.parseDebounce = null;
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('🤖 AutoDrone v2.0 initializing...');

        // Initialize UI
        this.ui = new UIController();

        // Initialize renderer
        const canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(canvas);

        // Setup UI callbacks
        this.setupUICallbacks();

        // Load first level
        this.loadLevel(1);

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Start render loop
        this.startRenderLoop();

        // Initial console message
        this.ui.log('🤖 Selamat datang di AutoDrone!', 'success');
        this.ui.log('Tekan F5 atau klik Run untuk menjalankan script.', 'info');

        console.log('✓ AutoDrone v2.0 ready!');
    }

    /**
     * Setup UI callbacks
     */
    setupUICallbacks() {
        // Code change handler (with debounce)
        this.ui.onCodeChange = () => {
            clearTimeout(this.parseDebounce);
            this.parseDebounce = setTimeout(() => this.parseCode(), 300);
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
            this.ui.hideOverlay();
            if (this.currentLevel < Levels.length) {
                this.loadLevel(this.currentLevel + 1);
            }
        });

        // Level buttons (use event delegation for dynamic buttons)
        this.setupLevelButtons();
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
                    const level = parseInt(btn.dataset.level);
                    if (level) this.loadLevel(level);
                }
            });
        }
    }

    /**
     * Setup keyboard shortcuts
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger if typing in editor
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
    }

    /**
     * Load a level
     */
    loadLevel(levelNum) {
        this.stop();

        this.currentLevel = levelNum;
        this.currentLevelData = getLevelByNumber(levelNum);

        if (!this.currentLevelData) {
            this.ui.logError(`Level ${levelNum} not found!`);
            return;
        }

        // Initialize game state
        this.gameState = new GameState(this.currentLevelData);

        // Initialize renderer
        this.renderer.initCanvas(this.currentLevelData.width, this.currentLevelData.height);

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

        // Log lesson
        if (this.currentLevelData.lesson) {
            this.ui.log(`📚 Konsep: ${this.currentLevelData.lesson}`, 'info');
        }

        // Clear editor for new level to encourage writing own code
        this.ui.setCode('');

        console.log(`Loaded level ${levelNum}: ${this.currentLevelData.name}`);
    }

    /**
     * Reset current level
     */
    resetLevel() {
        this.stop();
        this.gameState.reset(this.currentLevelData);
        this.ui.updateStats(this.gameState);
        this.ui.hideOverlay();
        this.ui.setControlState('ready');
        this.ui.updateVMState('READY');
        this.ui.clearHighlight();
        this.ui.log('Level reset.', 'info');
    }

    /**
     * Parse code and show errors
     */
    parseCode() {
        const code = this.ui.getCode();

        if (!code.trim()) {
            this.ui.setParseStatus(true);
            return null;
        }

        try {
            // Tokenize
            const lexer = new Lexer(code);
            const tokens = lexer.tokenize();

            // Parse
            const parser = new Parser(tokens);
            const result = parser.parse();

            // Show warnings
            if (result.warnings.length > 0) {
                result.warnings.forEach(w => {
                    this.ui.logWarning(`Line ${w.line}: ${w.message}`);
                });
            }

            this.ui.setParseStatus(true);
            return result.ast;

        } catch (error) {
            if (error instanceof LexerError || error instanceof ParseError) {
                this.ui.setParseStatus(false, `Ln ${error.line}: ${error.message}`);
            } else {
                this.ui.setParseStatus(false, error.message);
            }
            return null;
        }
    }

    /**
     * Compile code to bytecode
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
     * Run the script
     */
    run() {
        // If paused, just resume
        if (this.vm && this.vm.state === VMState.PAUSED) {
            this.vm.run();
            this.isRunning = true;
            this.ui.setControlState('running');
            this.ui.updateVMState('RUNNING');
            this.startExecution();
            return;
        }

        // Reset level first
        this.resetLevel();

        // Compile code
        const bytecode = this.compileCode();
        if (!bytecode) {
            this.ui.logError('Cannot run: fix syntax errors first.');
            return;
        }

        // Create VM
        this.vm = new VirtualMachine(bytecode, this.gameState, {
            maxInstructions: 10000,
            maxLoopIterations: 1000
        });

        // Setup VM event handlers
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
            this.ui.logError(event.data.error.message);
            if (event.data.error.hint) {
                this.ui.log(`Hint: ${event.data.error.hint}`, 'info');
            }
        });

        // Start execution
        this.vm.run();
        this.isRunning = true;
        this.ui.setControlState('running');
        this.ui.log('▶ Execution started', 'success');

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
     * Execute single tick
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

            // Highlight current line
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
            this.ui.logError(error.message);
            if (error.hint) {
                this.ui.log(`Hint: ${error.hint}`, 'info');
            }
            this.ui.setControlState('error');
        }
    }

    /**
     * Process game action from VM
     */
    processAction(action) {
        let result;

        switch (action.type) {
            case 'MOVE':
                result = this.gameState.executeMove(action.direction);
                if (result.success) {
                    this.ui.logAction(action);
                    // Animate
                    const oldX = this.renderer.dronePos.x;
                    const oldY = this.renderer.dronePos.y;
                    this.renderer.animateMove(oldX, oldY, result.newPosition.x, result.newPosition.y);
                } else {
                    this.ui.logWarning(`MOVE failed: ${result.reason}`);
                }
                break;

            case 'TURN':
                result = this.gameState.executeTurn(action.direction);
                if (result.success) {
                    this.ui.logAction(action);
                    this.renderer.animateTurn(result.newFacing);
                } else {
                    this.ui.logWarning(`TURN failed: ${result.reason}`);
                }
                break;

            case 'COLLECT':
                result = this.gameState.executeCollect();
                if (result.success) {
                    this.ui.log(`COLLECT: Got ${result.collected}!`, 'success');
                } else {
                    this.ui.logWarning(`COLLECT failed: ${result.reason}`);
                    if (result.hint) {
                        this.ui.log(`Hint: ${result.hint}`, 'info');
                    }
                }
                break;

            case 'WAIT':
                result = this.gameState.executeWait(action.ticks);
                this.ui.log(`WAIT ${action.ticks}: +${result.energyRestored} energy`, 'action');
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
            this.ui.log('⏸ Execution paused', 'warning');
        }
    }

    /**
     * Single step execution
     */
    step() {
        // If not started, compile and create VM first
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

        // Execute single tick
        try {
            const action = this.vm.tick();

            if (action) {
                this.processAction(action);
            }

            const line = this.vm.getCurrentLine();
            if (line > 0) {
                this.ui.highlightLine(line);
            }

            this.ui.updateStats(this.gameState);

            if (this.gameState.status !== 'playing') {
                this.vm.stop();
            }

        } catch (error) {
            this.ui.logError(error.message);
            this.ui.setControlState('error');
        }
    }

    /**
     * Setup VM event handlers (used for step mode)
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
     * Rewind execution
     */
    rewind() {
        if (this.vm && this.vm.rewind(5)) {
            this.ui.log('⏪ Rewound 5 steps', 'info');
            this.ui.updateStats(this.gameState);
        }
    }

    /**
     * Called when execution completes
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

        // Show overlay
        if (this.gameState.status === 'won') {
            const lesson = this.currentLevelData.lesson || '';
            this.ui.showOverlay(
                '🎉 Level Selesai!',
                this.gameState.statusMessage,
                result.stars,
                lesson
            );
            this.ui.markLevelCompleted(this.currentLevel);
            this.ui.logSuccess('✓ Semua objective tercapai!');

            // Congratulate based on stars
            if (result.stars >= 4) {
                this.ui.log('🌟 Luar biasa! Solusi yang sangat efisien!', 'success');
            } else if (result.stars >= 2) {
                this.ui.log('👍 Bagus! Coba optimalkan untuk bintang lebih banyak.', 'info');
            }
        } else if (this.gameState.status === 'lost') {
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

        // Log analysis summary
        this.ui.log(`Skor: ${result.score}/100 (${result.stars} bintang)`, 'info');
    }

    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = () => {
            if (this.gameState) {
                this.renderer.render(this.gameState);
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

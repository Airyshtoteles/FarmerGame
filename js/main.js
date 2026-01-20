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

class AutoDroneApp {
    constructor() {
        this.ui = null;
        this.renderer = null;
        this.vm = null;
        this.gameState = null;
        this.analysis = new AnalysisEngine();

        this.sound = new SoundManager();
        this.achievements = new AchievementManager();
        this.syntax = new SyntaxHighlighter();
        this.particles = new ParticleSystem();
        this.templates = null;
        this.debug = new DebugPanel();

        this.currentLevel = 1;
        this.currentLevelData = null;

        this.isRunning = false;
        this.animationFrame = null;
        this.executionInterval = null;

        this.parseDebounce = null;

        this.currentTheme = 'dark';

        this.languageMode = 'python';
    }

    init() {
        console.log('🤖 AutoDrone v3.0 initializing...');

        this.ui = new UIController();

        const canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(canvas, this.particles);

        this.syntax.init('code-editor');

        this.templates = new TemplateManager(document.getElementById('code-editor'));
        this.templates.createDropdown('template-container');

        this.debug.create();

        this.setupUICallbacks();

        this.setupToolbar();

        this.setupAchievements();

        this.loadLevel(1);

        this.setupKeyboardShortcuts();

        this.startRenderLoop();

        this.ui.log('🤖 Selamat datang di AutoDrone v3.0!', 'success');
        this.ui.log('✨ Fitur baru: Sound, Achievements, Syntax Highlighting!', 'info');
        this.ui.log('Tekan F5 atau klik Run untuk menjalankan script.', 'info');

        this.updateAchievementCount();

        console.log('✓ AutoDrone v3.0 ready!');
    }

    setupUICallbacks() {
        this.ui.onCodeChange = () => {
            clearTimeout(this.parseDebounce);
            this.parseDebounce = setTimeout(() => {
                this.parseCode();
                this.syntax.highlight();
            }, 300);
        };

        this.ui.btnRun.addEventListener('click', () => this.run());
        this.ui.btnPause.addEventListener('click', () => this.pause());
        this.ui.btnStep.addEventListener('click', () => this.step());
        this.ui.btnStop.addEventListener('click', () => this.stop());
        this.ui.btnReset.addEventListener('click', () => this.resetLevel());
        this.ui.btnRewind.addEventListener('click', () => this.rewind());

        document.getElementById('btn-next-level').addEventListener('click', () => {
            this.sound.playClick();
            this.ui.hideOverlay();
            if (this.currentLevel < Levels.length) {
                this.loadLevel(this.currentLevel + 1);
            }
        });

        this.setupLevelButtons();

        if (this.ui.btnHint) {
            const originalClick = this.ui.btnHint.onclick;
            this.ui.btnHint.addEventListener('click', () => {
                this.achievements.recordHintUsed();
            });
        }
    }

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

    setupToolbar() {
        document.getElementById('btn-debug')?.addEventListener('click', () => {
            this.sound.playClick();
            const enabled = this.debug.toggle();
            document.getElementById('btn-debug').classList.toggle('active', enabled);
        });

        document.getElementById('btn-sound')?.addEventListener('click', () => {
            const enabled = this.sound.toggle();
            const btn = document.getElementById('btn-sound');
            btn.classList.toggle('active', enabled);
            btn.classList.toggle('off', !enabled);
            btn.textContent = enabled ? '🔊' : '🔇';
            if (enabled) this.sound.playClick();
        });

        document.getElementById('btn-particles')?.addEventListener('click', () => {
            this.sound.playClick();
            const enabled = this.particles.toggle();
            const btn = document.getElementById('btn-particles');
            btn.classList.toggle('active', enabled);
            btn.classList.toggle('off', !enabled);
        });

        document.getElementById('btn-theme')?.addEventListener('click', () => {
            this.sound.playClick();
            this.toggleTheme();
        });

        document.getElementById('btn-achievements')?.addEventListener('click', () => {
            this.sound.playClick();
            this.showAchievementsModal();
        });

        document.getElementById('achievement-modal-close')?.addEventListener('click', () => {
            document.getElementById('achievement-modal').classList.add('hidden');
        });

        document.getElementById('achievement-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'achievement-modal') {
                document.getElementById('achievement-modal').classList.add('hidden');
            }
        });

        document.getElementById('btn-language')?.addEventListener('click', () => {
            this.sound.playClick();
            this.toggleLanguageMode();
        });
    }

    toggleLanguageMode() {
        this.languageMode = this.languageMode === 'python' ? 'cpp' : 'python';

        const btn = document.getElementById('btn-language');
        if (btn) {
            btn.textContent = this.languageMode === 'python' ? '🐍' : '⚙️';
            btn.title = this.languageMode === 'python' ? 'Python Mode' : 'C++ Mode';
        }

        this.syntax.setMode(this.languageMode);

        if (this.templates) {
            this.templates.setMode(this.languageMode);
        }

        this.syntax.highlight();

        const modeName = this.languageMode === 'python' ? 'Python' : 'C++';
        this.ui.log(`🔄 Switched to ${modeName} syntax mode`, 'info');

        if (this.languageMode === 'cpp') {
            this.ui.log('💡 Contoh: move_forward(); turn_left(); for (int i = 0; i < 3; i++) { }', 'info');
        } else {
            this.ui.log('💡 Contoh: MOVE forward, TURN left, LOOP 3: ... END', 'info');
        }
    }

    setupAchievements() {
        this.achievements.onAchievementUnlock = (achievement) => {
            this.sound.playAchievement();

            const badge = document.getElementById('achievement-badge');
            const icon = document.getElementById('achievement-icon');
            const name = document.getElementById('achievement-name');

            if (badge && icon && name) {
                icon.textContent = achievement.icon;
                name.textContent = achievement.name;
                badge.classList.remove('hidden');

                this.particles.emitAchievement(window.innerWidth / 2, 80);

                setTimeout(() => {
                    badge.classList.add('hidden');
                }, 3000);
            }

            this.ui.logSuccess(`🏆 Achievement Unlocked: ${achievement.name}!`);

            this.updateAchievementCount();
        };
    }

    updateAchievementCount() {
        const countEl = document.getElementById('achievement-count');
        if (countEl) {
            countEl.textContent = `🏆 ${this.achievements.getUnlockedCount()}/${this.achievements.getTotalCount()}`;
        }
    }

    showAchievementsModal() {
        const modal = document.getElementById('achievement-modal');
        const list = document.getElementById('achievement-list');

        if (!modal || !list) return;

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

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        document.body.dataset.theme = this.currentTheme;

        const btn = document.getElementById('btn-theme');
        if (btn) {
            btn.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
        }

        this.ui.log(`🎨 Theme switched to ${this.currentTheme}`, 'info');
    }

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

        document.addEventListener('click', () => this.sound.init(), { once: true });
        document.addEventListener('keydown', () => this.sound.init(), { once: true });
    }

    loadLevel(levelNum) {
        this.stop();

        this.currentLevel = levelNum;
        this.currentLevelData = getLevelByNumber(levelNum);

        if (!this.currentLevelData) {
            this.ui.logError(`Level ${levelNum} tidak ditemukan!`);
            return;
        }

        this.gameState = new GameState(this.currentLevelData);

        this.renderer.initCanvas(this.currentLevelData.width, this.currentLevelData.height);

        this.particles.clear();

        this.debug.reset();

        this.ui.setActiveLevel(levelNum);
        this.ui.updateStats(this.gameState);
        this.ui.updateLessonBanner(this.currentLevelData, levelNum);
        this.ui.hideOverlay();
        this.ui.clearConsole();
        this.ui.setControlState('ready');
        this.ui.updateVMState('READY');
        this.ui.clearHighlight();

        this.ui.log(`═══ ${this.currentLevelData.name} ═══`, 'info');
        this.ui.log(this.currentLevelData.description, 'info');

        if (this.currentLevelData.lesson) {
            this.ui.log(`📚 Konsep: ${this.currentLevelData.lesson}`, 'info');
        }

        this.ui.setCode('');
        this.syntax.highlight();

        console.log(`Loaded level ${levelNum}: ${this.currentLevelData.name}`);
    }

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

        this.achievements.recordRetry();
    }

    parseCode() {
        const code = this.ui.getCode();

        if (!code.trim()) {
            this.ui.setParseStatus(true);
            return null;
        }

        try {
            let tokens, result;

            if (this.languageMode === 'cpp') {
                const lexer = new CppLexer(code);
                tokens = lexer.tokenize();

                const parser = new CppParser(tokens);
                result = parser.parse();
            } else {
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

    run() {
        this.sound.init();

        if (this.vm && this.vm.state === VMState.PAUSED) {
            this.vm.run();
            this.isRunning = true;
            this.ui.setControlState('running');
            this.ui.updateVMState('RUNNING');
            this.startExecution();
            return;
        }

        this.resetLevel();

        const bytecode = this.compileCode();
        if (!bytecode) {
            this.sound.playError();
            this.ui.logError('Cannot run: perbaiki syntax error dulu.');
            return;
        }

        const lines = this.ui.getCode().split('\n').length;
        this.achievements.recordCodeWritten(lines);

        this.vm = new VirtualMachine(bytecode, this.gameState, {
            maxInstructions: 10000,
            maxLoopIterations: 1000
        });

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

        this.vm.run();
        this.isRunning = true;
        this.ui.setControlState('running');
        this.ui.log('▶ Eksekusi dimulai', 'success');

        this.startExecution();
    }

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
            this.stopExecution();
            this.sound.playError();
            this.ui.logError(error.message);
            this.ui.setControlState('error');
        }
    }

    processAction(action) {
        let result;
        const droneX = this.gameState.drone.x;
        const droneY = this.gameState.drone.y;

        const tileSize = this.renderer.tileSize;
        const canvasX = droneX * tileSize + tileSize / 2;
        const canvasY = droneY * tileSize + tileSize / 2;

        switch (action.type) {
            case 'MOVE':
                result = this.gameState.executeMove(action.direction);
                if (result.success) {
                    this.sound.playMove();
                    this.ui.logAction(action);

                    this.particles.emitMoveTrail(canvasX, canvasY, action.direction);

                    const oldX = this.renderer.dronePos.x;
                    const oldY = this.renderer.dronePos.y;
                    this.renderer.animateMove(oldX, oldY, result.newPosition.x, result.newPosition.y);

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

    pause() {
        if (this.vm) {
            this.vm.pause();
            this.isRunning = false;
            this.stopExecution();
            this.ui.setControlState('paused');
            this.ui.log('⏸ Eksekusi dijeda', 'warning');
        }
    }

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

    stop() {
        if (this.vm) {
            this.vm.stop();
        }
        this.isRunning = false;
        this.stopExecution();
        this.ui.setControlState('halted');
        this.ui.clearHighlight();
    }

    stopExecution() {
        if (this.executionInterval) {
            clearInterval(this.executionInterval);
            this.executionInterval = null;
        }
    }

    rewind() {
        if (this.vm && this.vm.rewind(5)) {
            this.ui.log('⏪ Rewound 5 steps', 'info');
            this.ui.updateStats(this.gameState);
            this.debug.update(this.gameState);
        }
    }

    onExecutionComplete() {
        this.stopExecution();
        this.ui.clearHighlight();
        this.ui.setControlState('halted');

        const result = this.analysis.analyze(
            this.gameState,
            this.vm.eventLog,
            this.currentLevelData
        );

        this.ui.displayAnalysis(result);

        if (this.gameState.status === 'won') {
            this.sound.playLevelComplete();

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

            if (result.stars >= 4) {
                this.ui.log('🌟 Luar biasa! Solusi yang sangat efisien!', 'success');
            } else if (result.stars >= 2) {
                this.ui.log('👍 Bagus! Coba optimalkan untuk bintang lebih banyak.', 'info');
            }

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

    startRenderLoop() {
        const render = () => {
            if (this.gameState) {
                this.particles.update();

                this.renderer.render(this.gameState);
                this.particles.draw(this.renderer.ctx);
            }
            this.animationFrame = requestAnimationFrame(render);
        };
        render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new AutoDroneApp();
    app.init();

    window.AutoDrone = app;
});

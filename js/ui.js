import { Levels, LevelProgression } from './levels.js';

export class UIController {
    constructor() {
        this.codeEditor = document.getElementById('code-editor');
        this.lineNumbers = document.getElementById('line-numbers');
        this.cursorPosition = document.getElementById('cursor-position');
        this.parseStatus = document.getElementById('parse-status');

        this.consoleOutput = document.getElementById('console-output');

        this.scoreValue = document.getElementById('score-value');
        this.scoreStars = document.getElementById('score-stars');
        this.analysisDetails = document.getElementById('analysis-details');
        this.suggestionsList = document.getElementById('suggestions-list');

        this.statEnergy = document.getElementById('stat-energy');
        this.statCrystals = document.getElementById('stat-crystals');
        this.statCrystalsTotal = document.getElementById('stat-crystals-total');
        this.statData = document.getElementById('stat-data');
        this.statDataTotal = document.getElementById('stat-data-total');
        this.statTicks = document.getElementById('stat-ticks');

        this.gameOverlay = document.getElementById('game-overlay');
        this.overlayTitle = document.getElementById('overlay-title');
        this.overlayMessage = document.getElementById('overlay-message');
        this.overlayStars = document.getElementById('overlay-stars');
        this.overlayLesson = document.getElementById('overlay-lesson');

        this.btnRun = document.getElementById('btn-run');
        this.btnPause = document.getElementById('btn-pause');
        this.btnStep = document.getElementById('btn-step');
        this.btnStop = document.getElementById('btn-stop');
        this.btnReset = document.getElementById('btn-reset');
        this.btnRewind = document.getElementById('btn-rewind');
        this.btnClear = document.getElementById('btn-clear');
        this.btnHint = document.getElementById('btn-hint');
        this.btnSolution = document.getElementById('btn-solution');
        this.speedSlider = document.getElementById('speed-slider');
        this.speedValue = document.getElementById('speed-value');

        this.vmStateDisplay = document.getElementById('vm-state');

        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');

        this.levelSelector = document.getElementById('level-selector');

        this.lessonBanner = document.getElementById('lesson-banner');
        this.lessonIcon = document.getElementById('lesson-icon');
        this.lessonTitle = document.getElementById('lesson-title');
        this.lessonDescription = document.getElementById('lesson-description');

        this.lessonPanelTitle = document.getElementById('lesson-panel-title');
        this.lessonPanelContent = document.getElementById('lesson-panel-content');
        this.objectiveList = document.getElementById('objective-list');
        this.hintsList = document.getElementById('hints-list');

        this.progressText = document.getElementById('progress-text');

        this.currentLine = 0;
        this.currentLevelData = null;
        this.hintIndex = 0;
        this.completedLevels = new Set();

        this.generateLevelButtons();
        this.setupEventListeners();
        this.updateLineNumbers();
        this.loadProgress();
    }

    generateLevelButtons() {
        if (!this.levelSelector) return;

        this.levelSelector.innerHTML = '';

        for (let i = 1; i <= 10; i++) {
            const btn = document.createElement('button');
            btn.className = 'level-btn';
            btn.dataset.level = i;
            btn.textContent = i;
            btn.title = LevelProgression[i - 1]?.concept || `Level ${i}`;

            if (this.completedLevels.has(i)) {
                btn.classList.add('completed');
            }

            this.levelSelector.appendChild(btn);
        }

        this.levelBtns = this.levelSelector.querySelectorAll('.level-btn');
    }

    setupEventListeners() {
        this.codeEditor.addEventListener('input', () => {
            this.updateLineNumbers();
            this.onCodeChange();
        });

        this.codeEditor.addEventListener('scroll', () => {
            this.lineNumbers.scrollTop = this.codeEditor.scrollTop;
        });

        this.codeEditor.addEventListener('keydown', (e) => {
            this.handleEditorKeydown(e);
        });

        this.codeEditor.addEventListener('click', () => this.updateCursorPosition());
        this.codeEditor.addEventListener('keyup', () => this.updateCursorPosition());

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        if (this.btnClear) {
            this.btnClear.addEventListener('click', () => {
                this.codeEditor.value = '';
                this.updateLineNumbers();
                this.clearConsole();
            });
        }

        if (this.btnHint) {
            this.btnHint.addEventListener('click', () => {
                this.showNextHint();
            });
        }

        if (this.btnSolution) {
            this.btnSolution.addEventListener('click', () => {
                this.showSolution();
            });
        }

        if (this.speedSlider) {
            this.speedSlider.addEventListener('input', () => {
                this.speedValue.textContent = `${this.speedSlider.value}x`;
            });
        }
    }

    handleEditorKeydown(e) {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = this.codeEditor.selectionStart;
            const end = this.codeEditor.selectionEnd;
            const value = this.codeEditor.value;

            this.codeEditor.value = value.substring(0, start) + '    ' + value.substring(end);
            this.codeEditor.selectionStart = this.codeEditor.selectionEnd = start + 4;

            this.updateLineNumbers();
        }
    }

    updateLineNumbers() {
        const lines = this.codeEditor.value.split('\n');
        const lineCount = lines.length;

        let html = '';
        for (let i = 1; i <= lineCount; i++) {
            const isActive = i === this.currentLine;
            html += `<div class="${isActive ? 'active-line' : ''}">${i}</div>`;
        }

        this.lineNumbers.innerHTML = html;
    }

    updateCursorPosition() {
        const value = this.codeEditor.value;
        const pos = this.codeEditor.selectionStart;

        const lines = value.substring(0, pos).split('\n');
        const line = lines.length;
        const col = lines[lines.length - 1].length + 1;

        this.cursorPosition.textContent = `Ln ${line}, Col ${col}`;
    }

    highlightLine(lineNumber) {
        this.currentLine = lineNumber;
        this.updateLineNumbers();
    }

    clearHighlight() {
        this.currentLine = 0;
        this.updateLineNumbers();
    }

    getCode() {
        return this.codeEditor.value;
    }

    setCode(code) {
        this.codeEditor.value = code;
        this.updateLineNumbers();
    }

    getSpeed() {
        return parseInt(this.speedSlider.value);
    }

    setParseStatus(success, message = '') {
        if (success) {
            this.parseStatus.className = 'status-ok';
            this.parseStatus.textContent = '✓ Ready';
        } else {
            this.parseStatus.className = 'status-error';
            this.parseStatus.textContent = `✗ ${message}`;
        }
    }

    onCodeChange() {
    }

    updateLessonBanner(levelData, levelNum) {
        this.currentLevelData = levelData;
        this.hintIndex = 0;

        const progression = LevelProgression[levelNum - 1];

        if (this.lessonIcon) {
            this.lessonIcon.textContent = progression?.icon || '🤖';
        }
        if (this.lessonTitle) {
            this.lessonTitle.textContent = levelData.name;
        }
        if (this.lessonDescription) {
            this.lessonDescription.textContent = levelData.description;
        }

        const conceptValue = document.querySelector('.concept-value');
        if (conceptValue) {
            conceptValue.textContent = progression?.concept || 'Programming';
        }

        if (this.progressText) {
            this.progressText.textContent = `Level ${levelNum}/10`;
        }

        this.updateLessonPanel(levelData);
    }

    updateLessonPanel(levelData) {
        if (this.lessonPanelTitle) {
            this.lessonPanelTitle.textContent = `📚 ${levelData.name}`;
        }

        if (this.lessonPanelContent) {
            this.lessonPanelContent.innerHTML = `<p>${levelData.lesson || levelData.description}</p>`;
        }

        if (this.objectiveList && levelData.objectives) {
            this.objectiveList.innerHTML = levelData.objectives.map(obj => {
                if (obj.type === 'collect') {
                    return `<li>Kumpulkan ${obj.count} ${obj.resource}</li>`;
                }
                return `<li>${JSON.stringify(obj)}</li>`;
            }).join('');
        }

        if (this.hintsList && levelData.hints) {
            this.hintsList.innerHTML = levelData.hints.map(hint =>
                `<li>${hint.replace('💡 ', '')}</li>`
            ).join('');
        }
    }

    showNextHint() {
        if (!this.currentLevelData?.hints) return;

        const hints = this.currentLevelData.hints;
        if (hints.length === 0) return;

        const hint = hints[this.hintIndex % hints.length];
        this.log(hint, 'warning');
        this.hintIndex++;

        if (this.hintIndex >= hints.length) {
            this.log('💡 Tidak ada hint lagi. Coba lihat tab Pelajaran!', 'info');
        }
    }

    showSolution() {
        if (!this.currentLevelData?.sampleSolution) {
            this.log('⚠️ Solusi tidak tersedia untuk level ini', 'warning');
            return;
        }

        const confirmed = confirm('Yakin ingin melihat solusi? Coba selesaikan sendiri dulu!');
        if (confirmed) {
            this.setCode(this.currentLevelData.sampleSolution);
            this.log('📖 Solusi dimuat. Pelajari dan pahami alurnya!', 'info');
        }
    }

    log(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;

        const time = new Date().toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        entry.innerHTML = `<span class="log-time">[${time}]</span> ${this.escapeHtml(message)}`;
        this.consoleOutput.appendChild(entry);
        this.consoleOutput.scrollTop = this.consoleOutput.scrollHeight;
    }

    logAction(action) {
        this.log(`${action.type} ${action.direction || ''}`, 'action');
    }

    logSuccess(message) {
        this.log(message, 'success');
    }

    logWarning(message) {
        this.log(`⚠ ${message}`, 'warning');
    }

    logError(message) {
        this.log(`✗ ${message}`, 'error');
    }

    clearConsole() {
        this.consoleOutput.innerHTML = '';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    switchTab(tabName) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    updateStats(gameState) {
        this.statEnergy.textContent = gameState.drone.energy;
        this.statCrystals.textContent = gameState.inventory.crystal;
        this.statTicks.textContent = gameState.stats.ticks;

        if (this.statData) {
            this.statData.textContent = gameState.inventory.data || 0;
        }

        const crystalObj = gameState.objectives.find(o => o.resource === 'crystal');
        if (crystalObj && this.statCrystalsTotal) {
            this.statCrystalsTotal.textContent = crystalObj.count;
        }

        const dataObj = gameState.objectives.find(o => o.resource === 'data');
        if (dataObj && this.statDataTotal) {
            this.statDataTotal.textContent = dataObj.count;
        } else if (this.statDataTotal) {
            this.statDataTotal.textContent = '0';
        }
    }

    updateVMState(state) {
        this.vmStateDisplay.textContent = `VM: ${state}`;
        this.vmStateDisplay.className = `vm-state ${state.toLowerCase()}`;
    }

    setControlState(state) {
        switch (state) {
            case 'ready':
                this.btnRun.disabled = false;
                this.btnPause.disabled = true;
                this.btnStep.disabled = false;
                this.btnStop.disabled = true;
                this.btnRewind.disabled = true;
                break;
            case 'running':
                this.btnRun.disabled = true;
                this.btnPause.disabled = false;
                this.btnStep.disabled = true;
                this.btnStop.disabled = false;
                this.btnRewind.disabled = true;
                break;
            case 'paused':
                this.btnRun.disabled = false;
                this.btnPause.disabled = true;
                this.btnStep.disabled = false;
                this.btnStop.disabled = false;
                this.btnRewind.disabled = false;
                break;
            case 'halted':
            case 'error':
                this.btnRun.disabled = false;
                this.btnPause.disabled = true;
                this.btnStep.disabled = true;
                this.btnStop.disabled = true;
                this.btnRewind.disabled = false;
                break;
        }
    }

    setActiveLevel(levelNum) {
        if (!this.levelBtns) {
            this.levelBtns = document.querySelectorAll('.level-btn');
        }

        this.levelBtns.forEach(btn => {
            const btnLevel = parseInt(btn.dataset.level);
            btn.classList.toggle('active', btnLevel === levelNum);
        });
    }

    markLevelCompleted(levelNum) {
        this.completedLevels.add(levelNum);
        this.saveProgress();

        const btn = document.querySelector(`.level-btn[data-level="${levelNum}"]`);
        if (btn) {
            btn.classList.add('completed');
        }
    }

    saveProgress() {
        try {
            localStorage.setItem('autodrone_completed', JSON.stringify([...this.completedLevels]));
        } catch (e) {
            console.warn('Could not save progress:', e);
        }
    }

    loadProgress() {
        try {
            const saved = localStorage.getItem('autodrone_completed');
            if (saved) {
                this.completedLevels = new Set(JSON.parse(saved));
                this.generateLevelButtons();
            }
        } catch (e) {
            console.warn('Could not load progress:', e);
        }
    }

    showOverlay(title, message, stars = 0, lesson = '') {
        this.overlayTitle.textContent = title;
        this.overlayMessage.textContent = message;
        this.overlayStars.textContent = '⭐'.repeat(stars) + '☆'.repeat(5 - stars);

        if (this.overlayLesson && lesson) {
            this.overlayLesson.innerHTML = `<strong>📚 Yang Dipelajari:</strong> ${lesson}`;
            this.overlayLesson.style.display = 'block';
        } else if (this.overlayLesson) {
            this.overlayLesson.style.display = 'none';
        }

        this.gameOverlay.classList.remove('hidden');
    }

    hideOverlay() {
        this.gameOverlay.classList.add('hidden');
    }

    displayAnalysis(result) {
        this.scoreValue.textContent = result.score;
        this.scoreStars.textContent = '⭐'.repeat(result.stars) + '☆'.repeat(5 - result.stars);

        let detailsHtml = '';
        for (const [key, data] of Object.entries(result.breakdown)) {
            detailsHtml += `
                <div class="analysis-row">
                    <span>${key.charAt(0).toUpperCase() + key.slice(1)}</span>
                    <span>${data.score}/${data.max}</span>
                </div>
            `;
        }
        this.analysisDetails.innerHTML = detailsHtml;

        if (result.suggestions.length > 0) {
            this.suggestionsList.innerHTML = result.suggestions
                .map(s => `<li>${s}</li>`)
                .join('');
        } else {
            this.suggestionsList.innerHTML = '<li class="muted">Tidak ada saran</li>';
        }

        this.switchTab('analysis');
    }
}

export default UIController;

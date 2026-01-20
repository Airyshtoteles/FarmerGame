/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - DEBUG PANEL
 * ═══════════════════════════════════════════════════════════════
 * Real-time variable display during execution
 */

/**
 * Debug Panel class
 */
export class DebugPanel {
    constructor() {
        this.panel = null;
        this.enabled = false;
        this.variables = {};
    }

    /**
     * Create debug panel UI
     */
    create() {
        this.panel = document.createElement('div');
        this.panel.className = 'debug-panel hidden';
        this.panel.id = 'debug-panel';
        this.panel.innerHTML = `
            <div class="debug-header">
                <span>🔍 Debug Mode</span>
                <button class="debug-close" id="debug-close">×</button>
            </div>
            <div class="debug-content" id="debug-content">
                <div class="debug-section">
                    <div class="debug-label">📍 Position</div>
                    <div class="debug-value" id="debug-pos">x: 0, y: 0</div>
                </div>
                <div class="debug-section">
                    <div class="debug-label">🧭 Facing</div>
                    <div class="debug-value" id="debug-facing">north</div>
                </div>
                <div class="debug-section">
                    <div class="debug-label">🔋 Energy</div>
                    <div class="debug-bar">
                        <div class="debug-bar-fill" id="debug-energy-bar"></div>
                    </div>
                    <div class="debug-value" id="debug-energy">100/100</div>
                </div>
                <div class="debug-section">
                    <div class="debug-label">💎 Inventory</div>
                    <div class="debug-value" id="debug-inventory">crystal: 0, data: 0</div>
                </div>
                <div class="debug-section">
                    <div class="debug-label">📊 Stats</div>
                    <div class="debug-value" id="debug-stats">moves: 0, turns: 0</div>
                </div>
                <div class="debug-section">
                    <div class="debug-label">👁️ Scan Result</div>
                    <div class="debug-value" id="debug-scan">-</div>
                </div>
                <div class="debug-section">
                    <div class="debug-label">⏱️ Cooldown</div>
                    <div class="debug-value" id="debug-cooldown">0</div>
                </div>
            </div>
        `;

        // Add close button handler
        document.body.appendChild(this.panel);

        document.getElementById('debug-close').addEventListener('click', () => {
            this.hide();
        });
    }

    /**
     * Show debug panel
     */
    show() {
        if (!this.panel) this.create();
        this.panel.classList.remove('hidden');
        this.enabled = true;
    }

    /**
     * Hide debug panel
     */
    hide() {
        if (this.panel) {
            this.panel.classList.add('hidden');
        }
        this.enabled = false;
    }

    /**
     * Toggle debug panel
     */
    toggle() {
        if (this.enabled) {
            this.hide();
        } else {
            this.show();
        }
        return this.enabled;
    }

    /**
     * Update with game state
     */
    update(gameState) {
        if (!this.enabled || !this.panel) return;

        // Position
        document.getElementById('debug-pos').textContent =
            `x: ${gameState.drone.x}, y: ${gameState.drone.y}`;

        // Facing
        const facingDisplay = {
            north: '↑ north',
            east: '→ east',
            south: '↓ south',
            west: '← west'
        };
        document.getElementById('debug-facing').textContent =
            facingDisplay[gameState.drone.facing] || gameState.drone.facing;

        // Energy
        const energyPct = (gameState.drone.energy / gameState.drone.maxEnergy) * 100;
        const energyBar = document.getElementById('debug-energy-bar');
        energyBar.style.width = `${energyPct}%`;
        energyBar.className = 'debug-bar-fill';
        if (energyPct < 30) {
            energyBar.classList.add('low');
        } else if (energyPct < 60) {
            energyBar.classList.add('medium');
        }
        document.getElementById('debug-energy').textContent =
            `${gameState.drone.energy}/${gameState.drone.maxEnergy}`;

        // Inventory
        document.getElementById('debug-inventory').textContent =
            `crystal: ${gameState.inventory.crystal}, data: ${gameState.inventory.data || 0}`;

        // Stats
        document.getElementById('debug-stats').textContent =
            `moves: ${gameState.stats.moves}, turns: ${gameState.stats.turns}, ticks: ${gameState.stats.ticks}`;

        // Cooldown
        document.getElementById('debug-cooldown').textContent =
            gameState.scanCooldown > 0 ? `${gameState.scanCooldown} ticks` : 'Ready';
    }

    /**
     * Update scan result
     */
    updateScanResult(result) {
        if (!this.enabled) return;

        const tileEmojis = {
            empty: '⬜ empty',
            wall: '⬛ wall',
            crystal: '💎 crystal',
            data: '📀 data',
            energy: '🔋 energy',
            hazard: '⚠️ hazard',
            charger: '⚡ charger'
        };

        document.getElementById('debug-scan').textContent =
            tileEmojis[result] || result;
    }

    /**
     * Reset display
     */
    reset() {
        if (!this.panel) return;

        document.getElementById('debug-pos').textContent = 'x: 0, y: 0';
        document.getElementById('debug-facing').textContent = '↑ north';
        document.getElementById('debug-energy-bar').style.width = '100%';
        document.getElementById('debug-energy').textContent = '100/100';
        document.getElementById('debug-inventory').textContent = 'crystal: 0, data: 0';
        document.getElementById('debug-stats').textContent = 'moves: 0, turns: 0, ticks: 0';
        document.getElementById('debug-scan').textContent = '-';
        document.getElementById('debug-cooldown').textContent = 'Ready';
    }
}

export default DebugPanel;

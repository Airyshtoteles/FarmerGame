import { TileType, Directions } from './game.js';

const TileVisuals = {
    [TileType.EMPTY]: { color: '#1a1a2e', emoji: '' },
    [TileType.WALL]: { color: '#2d2d44', emoji: '' },
    [TileType.CRYSTAL]: { color: '#1a1a2e', emoji: '💎' },
    [TileType.DATA]: { color: '#1a1a2e', emoji: '📀' },
    [TileType.ENERGY_CELL]: { color: '#1a1a2e', emoji: '🔋' },
    [TileType.HAZARD]: { color: '#3d1a1a', emoji: '⚠️' },
    [TileType.CHARGER]: { color: '#1a3d1a', emoji: '⚡' }
};

const DroneArrows = {
    north: '↑',
    east: '→',
    south: '↓',
    west: '←'
};

export class Renderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.options = {
            cellSize: options.cellSize || 48,
            padding: options.padding || 2,
            animationSpeed: options.animationSpeed || 150,
            showGrid: options.showGrid !== false,
            showScanCone: options.showScanCone !== false,
            ...options
        };

        this.animating = false;
        this.animationQueue = [];
        this.dronePos = { x: 0, y: 0 };
        this.droneFacing = 'north';

        this.scanConeActive = false;
        this.scanConeDirection = 'forward';
        this.scanConeTimer = null;

        this.ghostPos = null;

        this.colors = {
            background: '#0a0a0f',
            grid: 'rgba(0, 240, 255, 0.05)',
            gridBorder: 'rgba(0, 240, 255, 0.2)',
            fog: '#0a0a0f',
            drone: '#00f0ff',
            droneGlow: 'rgba(0, 240, 255, 0.3)',
            ghost: 'rgba(0, 240, 255, 0.2)',
            scanCone: 'rgba(0, 240, 255, 0.15)',
            highlight: 'rgba(0, 240, 255, 0.3)'
        };
    }

    initCanvas(width, height) {
        const totalWidth = width * this.options.cellSize;
        const totalHeight = height * this.options.cellSize;

        this.canvas.width = totalWidth;
        this.canvas.height = totalHeight;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = totalWidth * dpr;
        this.canvas.height = totalHeight * dpr;
        this.canvas.style.width = totalWidth + 'px';
        this.canvas.style.height = totalHeight + 'px';
        this.ctx.scale(dpr, dpr);

        this.gridWidth = width;
        this.gridHeight = height;
    }

    render(gameState) {
        const ctx = this.ctx;
        const cellSize = this.options.cellSize;

        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (!this.animating) {
            this.dronePos = { x: gameState.drone.x, y: gameState.drone.y };
            this.droneFacing = gameState.drone.facing;
        }

        this.drawGrid(gameState);

        this.drawTiles(gameState);

        if (this.scanConeActive) {
            this.drawScanCone(gameState);
        }

        if (this.ghostPos) {
            this.drawGhost();
        }

        this.drawDrone();

        if (gameState.fogEnabled) {
            this.drawFog(gameState);
        }
    }

    drawGrid(gameState) {
        if (!this.options.showGrid) return;

        const ctx = this.ctx;
        const cellSize = this.options.cellSize;

        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;

        for (let x = 0; x <= this.gridWidth; x++) {
            ctx.beginPath();
            ctx.moveTo(x * cellSize, 0);
            ctx.lineTo(x * cellSize, this.gridHeight * cellSize);
            ctx.stroke();
        }

        for (let y = 0; y <= this.gridHeight; y++) {
            ctx.beginPath();
            ctx.moveTo(0, y * cellSize);
            ctx.lineTo(this.gridWidth * cellSize, y * cellSize);
            ctx.stroke();
        }
    }

    drawTiles(gameState) {
        const ctx = this.ctx;
        const cellSize = this.options.cellSize;
        const padding = this.options.padding;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                const tile = gameState.getTile(x, y);
                const visual = TileVisuals[tile] || TileVisuals[TileType.EMPTY];

                ctx.fillStyle = visual.color;
                ctx.fillRect(
                    x * cellSize + padding,
                    y * cellSize + padding,
                    cellSize - padding * 2,
                    cellSize - padding * 2
                );

                if (tile === TileType.WALL) {
                    ctx.fillStyle = '#3a3a5a';
                    for (let by = 0; by < 3; by++) {
                        for (let bx = 0; bx < 3; bx++) {
                            const offset = by % 2 === 0 ? 0 : cellSize / 6;
                            ctx.fillRect(
                                x * cellSize + bx * (cellSize / 3) + offset + 2,
                                y * cellSize + by * (cellSize / 3) + 2,
                                cellSize / 3 - 4,
                                cellSize / 3 - 4
                            );
                        }
                    }
                }

                if (visual.emoji) {
                    ctx.font = `${cellSize * 0.5}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        visual.emoji,
                        x * cellSize + cellSize / 2,
                        y * cellSize + cellSize / 2
                    );
                }

                if (x === Math.round(this.dronePos.x) && y === Math.round(this.dronePos.y)) {
                    ctx.strokeStyle = this.colors.highlight;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(
                        x * cellSize + padding,
                        y * cellSize + padding,
                        cellSize - padding * 2,
                        cellSize - padding * 2
                    );
                }
            }
        }
    }

    drawDrone() {
        const ctx = this.ctx;
        const cellSize = this.options.cellSize;
        const x = this.dronePos.x;
        const y = this.dronePos.y;

        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;
        const radius = cellSize * 0.35;

        const gradient = ctx.createRadialGradient(
            centerX, centerY, radius * 0.5,
            centerX, centerY, radius * 2
        );
        gradient.addColorStop(0, this.colors.droneGlow);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius * 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.colors.drone;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0a0a0f';
        ctx.font = `bold ${cellSize * 0.4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(DroneArrows[this.droneFacing], centerX, centerY);
    }

    drawFog(gameState) {
        const ctx = this.ctx;
        const cellSize = this.options.cellSize;

        for (let y = 0; y < this.gridHeight; y++) {
            for (let x = 0; x < this.gridWidth; x++) {
                if (!gameState.isRevealed(x, y)) {
                    ctx.fillStyle = this.colors.fog;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

                    ctx.fillStyle = 'rgba(30, 30, 50, 0.5)';
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                }
            }
        }
    }

    drawScanCone(gameState) {
        const ctx = this.ctx;
        const cellSize = this.options.cellSize;
        const x = gameState.drone.x;
        const y = gameState.drone.y;

        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;

        let facing = gameState.drone.facing;
        if (this.scanConeDirection === 'left') {
            facing = { north: 'west', west: 'south', south: 'east', east: 'north' }[facing];
        } else if (this.scanConeDirection === 'right') {
            facing = { north: 'east', east: 'south', south: 'west', west: 'north' }[facing];
        }

        const vec = Directions[facing];

        ctx.fillStyle = this.colors.scanCone;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);

        const coneLength = cellSize * 3;
        const coneWidth = Math.PI / 4;

        const angle = Math.atan2(vec.dy, vec.dx);

        ctx.arc(centerX, centerY, coneLength, angle - coneWidth / 2, angle + coneWidth / 2);
        ctx.closePath();
        ctx.fill();

        const targetX = x + vec.dx;
        const targetY = y + vec.dy;

        if (gameState.isInBounds(targetX, targetY)) {
            ctx.strokeStyle = this.colors.drone;
            ctx.lineWidth = 3;
            ctx.strokeRect(
                targetX * cellSize + 2,
                targetY * cellSize + 2,
                cellSize - 4,
                cellSize - 4
            );
        }
    }

    drawGhost() {
        if (!this.ghostPos) return;

        const ctx = this.ctx;
        const cellSize = this.options.cellSize;
        const x = this.ghostPos.x;
        const y = this.ghostPos.y;

        const centerX = x * cellSize + cellSize / 2;
        const centerY = y * cellSize + cellSize / 2;
        const radius = cellSize * 0.3;

        ctx.fillStyle = this.colors.ghost;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = this.colors.drone;
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
    }

    animateMove(fromX, fromY, toX, toY, callback) {
        this.animating = true;
        const startTime = performance.now();
        const duration = this.options.animationSpeed;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(1, elapsed / duration);

            const eased = 1 - Math.pow(1 - progress, 3);

            this.dronePos.x = fromX + (toX - fromX) * eased;
            this.dronePos.y = fromY + (toY - fromY) * eased;

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.dronePos.x = toX;
                this.dronePos.y = toY;
                this.animating = false;
                if (callback) callback();
            }
        };

        requestAnimationFrame(animate);
    }

    animateTurn(newFacing, callback) {
        this.droneFacing = newFacing;
        if (callback) setTimeout(callback, 50);
    }

    showScanCone(direction = 'forward', duration = 500) {
        this.scanConeActive = true;
        this.scanConeDirection = direction;

        if (this.scanConeTimer) {
            clearTimeout(this.scanConeTimer);
        }

        this.scanConeTimer = setTimeout(() => {
            this.scanConeActive = false;
            this.scanConeTimer = null;
        }, duration);
    }

    setGhostPreview(x, y) {
        this.ghostPos = { x, y };
    }

    clearGhostPreview() {
        this.ghostPos = null;
    }
}

export default Renderer;

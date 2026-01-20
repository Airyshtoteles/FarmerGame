/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - GAME STATE (Immutable State Management)
 * ═══════════════════════════════════════════════════════════════
 * Grid-based world with fog of war, multi-resource system,
 * and immutable state updates for replay.
 */

/**
 * Tile Types
 */
export const TileType = {
    EMPTY: 'empty',
    WALL: 'wall',
    CRYSTAL: 'crystal',
    DATA: 'data',
    ENERGY_CELL: 'energy',
    HAZARD: 'hazard',
    CHARGER: 'charger'
};

/**
 * Direction Vectors
 */
export const Directions = {
    north: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 }
};

/**
 * Turn mappings
 */
const TurnLeft = {
    north: 'west',
    west: 'south',
    south: 'east',
    east: 'north'
};

const TurnRight = {
    north: 'east',
    east: 'south',
    south: 'west',
    west: 'north'
};

/**
 * Action Energy Costs
 */
export const EnergyCosts = {
    MOVE: 2,
    TURN: 1,
    COLLECT: 3,
    SCAN: 1,
    WAIT: 0  // Restores energy instead
};

/**
 * Game State class with immutable updates
 */
export class GameState {
    constructor(level) {
        // Level info
        this.levelId = level.id;
        this.gridWidth = level.width;
        this.gridHeight = level.height;

        // Grid data (2D array of tiles)
        this.grid = this.cloneGrid(level.grid);
        this.originalGrid = this.cloneGrid(level.grid);

        // Fog of war (what tiles have been revealed)
        this.revealed = this.createRevealedGrid(level.width, level.height);
        this.fogEnabled = level.fogOfWar !== false;
        this.scanRadius = level.scanRadius || 2;

        // Drone state
        this.drone = {
            x: level.startX || 0,
            y: level.startY || 0,
            facing: level.startFacing || 'north',
            energy: level.startEnergy || 100,
            maxEnergy: level.maxEnergy || 100
        };

        // Inventory
        this.inventory = {
            crystal: 0,
            data: 0,
            energyCell: 0
        };

        // Objectives
        this.objectives = level.objectives || [];
        this.objectivesCompleted = {};

        // Game stats
        this.stats = {
            ticks: 0,
            moves: 0,
            turns: 0,
            collects: 0,
            scans: 0,
            energyUsed: 0,
            energyWasted: 0
        };

        // Sensor cooldowns
        this.scanCooldown = 0;
        this.scanCooldownMax = 3;

        // Game status
        this.status = 'playing'; // playing, won, lost
        this.statusMessage = '';

        // Reveal starting area
        this.revealAround(this.drone.x, this.drone.y, this.scanRadius);
    }

    /**
     * Clone grid for immutability
     */
    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    /**
     * Create revealed grid (all false initially, except edges visible)
     */
    createRevealedGrid(width, height) {
        const revealed = [];
        for (let y = 0; y < height; y++) {
            revealed.push(new Array(width).fill(false));
        }
        return revealed;
    }

    /**
     * Reveal tiles around a point
     */
    revealAround(cx, cy, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const x = cx + dx;
                const y = cy + dy;
                if (this.isInBounds(x, y)) {
                    this.revealed[y][x] = true;
                }
            }
        }
    }

    /**
     * Check if coordinates are in bounds
     */
    isInBounds(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    }

    /**
     * Get tile at position
     */
    getTile(x, y) {
        if (!this.isInBounds(x, y)) return TileType.WALL;
        return this.grid[y][x];
    }

    /**
     * Set tile at position
     */
    setTile(x, y, type) {
        if (this.isInBounds(x, y)) {
            this.grid[y][x] = type;
        }
    }

    /**
     * Check if tile is revealed
     */
    isRevealed(x, y) {
        if (!this.fogEnabled) return true;
        if (!this.isInBounds(x, y)) return false;
        return this.revealed[y][x];
    }

    /**
     * Get position in direction from drone
     */
    getPositionInDirection(direction) {
        let facing = this.drone.facing;

        // Adjust for relative directions
        if (direction === 'forward') {
            // Use current facing
        } else if (direction === 'back') {
            facing = TurnRight[TurnRight[facing]]; // Turn 180
        } else if (direction === 'left') {
            facing = TurnLeft[facing];
        } else if (direction === 'right') {
            facing = TurnRight[facing];
        }

        const vec = Directions[facing];
        return {
            x: this.drone.x + vec.dx,
            y: this.drone.y + vec.dy
        };
    }

    /**
     * Scan in direction (returns tile type)
     */
    scan(direction = 'forward') {
        if (this.scanCooldown > 0) {
            return 'cooldown';
        }

        // Apply energy cost
        if (this.drone.energy < EnergyCosts.SCAN) {
            return 'no_energy';
        }

        this.drone.energy -= EnergyCosts.SCAN;
        this.stats.energyUsed += EnergyCosts.SCAN;
        this.stats.scans++;
        this.scanCooldown = this.scanCooldownMax;

        const pos = this.getPositionInDirection(direction);

        // Reveal the scanned tile
        if (this.isInBounds(pos.x, pos.y)) {
            this.revealed[pos.y][pos.x] = true;
        }

        return this.getTile(pos.x, pos.y);
    }

    /**
     * Execute MOVE action
     */
    executeMove(direction) {
        const cost = EnergyCosts.MOVE;

        if (this.drone.energy < cost) {
            return {
                success: false,
                reason: 'Not enough energy',
                energyRequired: cost,
                energyAvailable: this.drone.energy
            };
        }

        const pos = this.getPositionInDirection(direction);
        const targetTile = this.getTile(pos.x, pos.y);

        // Check for wall
        if (targetTile === TileType.WALL) {
            return {
                success: false,
                reason: 'Cannot move into wall'
            };
        }

        // Execute move
        this.drone.x = pos.x;
        this.drone.y = pos.y;
        this.drone.energy -= cost;
        this.stats.energyUsed += cost;
        this.stats.moves++;
        this.stats.ticks++;

        // Update cooldown
        if (this.scanCooldown > 0) this.scanCooldown--;

        // Reveal around new position
        this.revealAround(pos.x, pos.y, this.scanRadius);

        // Check for hazard
        if (targetTile === TileType.HAZARD) {
            const hazardDamage = 10;
            this.drone.energy = Math.max(0, this.drone.energy - hazardDamage);
            this.stats.energyUsed += hazardDamage;
        }

        // Check for charger
        if (targetTile === TileType.CHARGER) {
            const chargeAmount = 20;
            this.drone.energy = Math.min(this.drone.maxEnergy, this.drone.energy + chargeAmount);
            this.setTile(pos.x, pos.y, TileType.EMPTY); // Charger is consumed
        }

        // Check energy death
        if (this.drone.energy <= 0) {
            this.status = 'lost';
            this.statusMessage = 'Out of energy!';
        }

        return {
            success: true,
            newPosition: { x: pos.x, y: pos.y },
            tileType: targetTile,
            energyRemaining: this.drone.energy
        };
    }

    /**
     * Execute TURN action
     */
    executeTurn(direction) {
        const cost = EnergyCosts.TURN;

        if (this.drone.energy < cost) {
            return {
                success: false,
                reason: 'Not enough energy'
            };
        }

        if (direction === 'left') {
            this.drone.facing = TurnLeft[this.drone.facing];
        } else if (direction === 'right') {
            this.drone.facing = TurnRight[this.drone.facing];
        }

        this.drone.energy -= cost;
        this.stats.energyUsed += cost;
        this.stats.turns++;
        this.stats.ticks++;

        // Update cooldown
        if (this.scanCooldown > 0) this.scanCooldown--;

        return {
            success: true,
            newFacing: this.drone.facing,
            energyRemaining: this.drone.energy
        };
    }

    /**
     * Execute COLLECT action
     */
    executeCollect() {
        const cost = EnergyCosts.COLLECT;

        if (this.drone.energy < cost) {
            return {
                success: false,
                reason: 'Not enough energy'
            };
        }

        const currentTile = this.getTile(this.drone.x, this.drone.y);

        // Check if there's something to collect
        if (currentTile === TileType.CRYSTAL) {
            this.inventory.crystal++;
            this.setTile(this.drone.x, this.drone.y, TileType.EMPTY);
        } else if (currentTile === TileType.DATA) {
            this.inventory.data++;
            this.setTile(this.drone.x, this.drone.y, TileType.EMPTY);
        } else if (currentTile === TileType.ENERGY_CELL) {
            this.inventory.energyCell++;
            this.drone.energy = Math.min(this.drone.maxEnergy, this.drone.energy + 10);
            this.setTile(this.drone.x, this.drone.y, TileType.EMPTY);
        } else {
            return {
                success: false,
                reason: 'Nothing to collect here',
                hint: 'Use scan() to find resources before COLLECT'
            };
        }

        this.drone.energy -= cost;
        this.stats.energyUsed += cost;
        this.stats.collects++;
        this.stats.ticks++;

        // Update cooldown
        if (this.scanCooldown > 0) this.scanCooldown--;

        // Check objectives
        this.checkObjectives();

        return {
            success: true,
            collected: currentTile,
            inventory: { ...this.inventory },
            energyRemaining: this.drone.energy
        };
    }

    /**
     * Execute WAIT action
     */
    executeWait(ticks = 1) {
        const energyRestore = 1 * ticks;
        this.drone.energy = Math.min(this.drone.maxEnergy, this.drone.energy + energyRestore);
        this.stats.ticks += ticks;

        // Update cooldown
        this.scanCooldown = Math.max(0, this.scanCooldown - ticks);

        return {
            success: true,
            energyRestored: energyRestore,
            energyRemaining: this.drone.energy
        };
    }

    /**
     * Check if objectives are completed
     */
    checkObjectives() {
        let allCompleted = true;

        for (const obj of this.objectives) {
            const key = `${obj.type}_${obj.resource || ''}`;

            if (obj.type === 'collect') {
                const count = this.inventory[obj.resource] || 0;
                this.objectivesCompleted[key] = count >= obj.count;
            }

            if (!this.objectivesCompleted[key]) {
                allCompleted = false;
            }
        }

        if (allCompleted && this.objectives.length > 0) {
            this.status = 'won';
            this.statusMessage = 'All objectives completed!';
        }
    }

    /**
     * Get current objective progress
     */
    getObjectiveProgress() {
        return this.objectives.map(obj => {
            if (obj.type === 'collect') {
                return {
                    ...obj,
                    current: this.inventory[obj.resource] || 0,
                    completed: (this.inventory[obj.resource] || 0) >= obj.count
                };
            }
            return obj;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // State Access Methods (for VM)
    // ═══════════════════════════════════════════════════════════════

    getEnergy() { return this.drone.energy; }
    getDroneX() { return this.drone.x; }
    getDroneY() { return this.drone.y; }
    getDroneFacing() { return this.drone.facing; }
    getInventory() { return { ...this.inventory }; }

    // ═══════════════════════════════════════════════════════════════
    // Snapshot & Restore (for rewind)
    // ═══════════════════════════════════════════════════════════════

    snapshot() {
        return {
            grid: this.cloneGrid(this.grid),
            revealed: this.revealed.map(row => [...row]),
            drone: { ...this.drone },
            inventory: { ...this.inventory },
            stats: { ...this.stats },
            scanCooldown: this.scanCooldown,
            status: this.status,
            statusMessage: this.statusMessage,
            objectivesCompleted: { ...this.objectivesCompleted }
        };
    }

    restore(snapshot) {
        this.grid = this.cloneGrid(snapshot.grid);
        this.revealed = snapshot.revealed.map(row => [...row]);
        this.drone = { ...snapshot.drone };
        this.inventory = { ...snapshot.inventory };
        this.stats = { ...snapshot.stats };
        this.scanCooldown = snapshot.scanCooldown;
        this.status = snapshot.status;
        this.statusMessage = snapshot.statusMessage;
        this.objectivesCompleted = { ...snapshot.objectivesCompleted };
    }

    /**
     * Reset to initial state
     */
    reset(level) {
        this.grid = this.cloneGrid(level.grid);
        this.revealed = this.createRevealedGrid(level.width, level.height);
        this.drone = {
            x: level.startX || 0,
            y: level.startY || 0,
            facing: level.startFacing || 'north',
            energy: level.startEnergy || 100,
            maxEnergy: level.maxEnergy || 100
        };
        this.inventory = { crystal: 0, data: 0, energyCell: 0 };
        this.stats = { ticks: 0, moves: 0, turns: 0, collects: 0, scans: 0, energyUsed: 0, energyWasted: 0 };
        this.scanCooldown = 0;
        this.status = 'playing';
        this.statusMessage = '';
        this.objectivesCompleted = {};
        this.revealAround(this.drone.x, this.drone.y, this.scanRadius);
    }
}

export default GameState;

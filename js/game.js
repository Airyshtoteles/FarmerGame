export const TileType = {
    EMPTY: 'empty',
    WALL: 'wall',
    CRYSTAL: 'crystal',
    DATA: 'data',
    ENERGY_CELL: 'energy',
    HAZARD: 'hazard',
    CHARGER: 'charger'
};

export const Directions = {
    north: { dx: 0, dy: -1 },
    east: { dx: 1, dy: 0 },
    south: { dx: 0, dy: 1 },
    west: { dx: -1, dy: 0 }
};

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

export const EnergyCosts = {
    MOVE: 2,
    TURN: 1,
    COLLECT: 3,
    SCAN: 1,
    WAIT: 0
};

export class GameState {
    constructor(level) {
        this.levelId = level.id;
        this.gridWidth = level.width;
        this.gridHeight = level.height;

        this.grid = this.cloneGrid(level.grid);
        this.originalGrid = this.cloneGrid(level.grid);

        this.revealed = this.createRevealedGrid(level.width, level.height);
        this.fogEnabled = level.fogOfWar !== false;
        this.scanRadius = level.scanRadius || 2;

        this.drone = {
            x: level.startX || 0,
            y: level.startY || 0,
            facing: level.startFacing || 'north',
            energy: level.startEnergy || 100,
            maxEnergy: level.maxEnergy || 100
        };

        this.inventory = {
            crystal: 0,
            data: 0,
            energyCell: 0
        };

        this.objectives = level.objectives || [];
        this.objectivesCompleted = {};

        this.stats = {
            ticks: 0,
            moves: 0,
            turns: 0,
            collects: 0,
            scans: 0,
            energyUsed: 0,
            energyWasted: 0
        };

        this.scanCooldown = 0;
        this.scanCooldownMax = 3;

        this.status = 'playing';
        this.statusMessage = '';

        this.revealAround(this.drone.x, this.drone.y, this.scanRadius);
    }

    cloneGrid(grid) {
        return grid.map(row => [...row]);
    }

    createRevealedGrid(width, height) {
        const revealed = [];
        for (let y = 0; y < height; y++) {
            revealed.push(new Array(width).fill(false));
        }
        return revealed;
    }

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

    isInBounds(x, y) {
        return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
    }

    getTile(x, y) {
        if (!this.isInBounds(x, y)) return TileType.WALL;
        return this.grid[y][x];
    }

    setTile(x, y, type) {
        if (this.isInBounds(x, y)) {
            this.grid[y][x] = type;
        }
    }

    isRevealed(x, y) {
        if (!this.fogEnabled) return true;
        if (!this.isInBounds(x, y)) return false;
        return this.revealed[y][x];
    }

    getPositionInDirection(direction) {
        let facing = this.drone.facing;

        if (direction === 'forward') {
        } else if (direction === 'back') {
            facing = TurnRight[TurnRight[facing]];
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

    scan(direction = 'forward') {
        if (this.scanCooldown > 0) {
            return 'cooldown';
        }

        if (this.drone.energy < EnergyCosts.SCAN) {
            return 'no_energy';
        }

        this.drone.energy -= EnergyCosts.SCAN;
        this.stats.energyUsed += EnergyCosts.SCAN;
        this.stats.scans++;
        this.scanCooldown = this.scanCooldownMax;

        const pos = this.getPositionInDirection(direction);

        if (this.isInBounds(pos.x, pos.y)) {
            this.revealed[pos.y][pos.x] = true;
        }

        return this.getTile(pos.x, pos.y);
    }

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

        if (targetTile === TileType.WALL) {
            return {
                success: false,
                reason: 'Cannot move into wall'
            };
        }

        this.drone.x = pos.x;
        this.drone.y = pos.y;
        this.drone.energy -= cost;
        this.stats.energyUsed += cost;
        this.stats.moves++;
        this.stats.ticks++;

        if (this.scanCooldown > 0) this.scanCooldown--;

        this.revealAround(pos.x, pos.y, this.scanRadius);

        if (targetTile === TileType.HAZARD) {
            const hazardDamage = 10;
            this.drone.energy = Math.max(0, this.drone.energy - hazardDamage);
            this.stats.energyUsed += hazardDamage;
        }

        if (targetTile === TileType.CHARGER) {
            const chargeAmount = 20;
            this.drone.energy = Math.min(this.drone.maxEnergy, this.drone.energy + chargeAmount);
            this.setTile(pos.x, pos.y, TileType.EMPTY);
        }

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

        if (this.scanCooldown > 0) this.scanCooldown--;

        return {
            success: true,
            newFacing: this.drone.facing,
            energyRemaining: this.drone.energy
        };
    }

    executeCollect() {
        const cost = EnergyCosts.COLLECT;

        if (this.drone.energy < cost) {
            return {
                success: false,
                reason: 'Not enough energy'
            };
        }

        const currentTile = this.getTile(this.drone.x, this.drone.y);

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

        if (this.scanCooldown > 0) this.scanCooldown--;

        this.checkObjectives();

        return {
            success: true,
            collected: currentTile,
            inventory: { ...this.inventory },
            energyRemaining: this.drone.energy
        };
    }

    executeWait(ticks = 1) {
        const energyRestore = 1 * ticks;
        this.drone.energy = Math.min(this.drone.maxEnergy, this.drone.energy + energyRestore);
        this.stats.ticks += ticks;

        this.scanCooldown = Math.max(0, this.scanCooldown - ticks);

        return {
            success: true,
            energyRestored: energyRestore,
            energyRemaining: this.drone.energy
        };
    }

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

    getEnergy() { return this.drone.energy; }
    getDroneX() { return this.drone.x; }
    getDroneY() { return this.drone.y; }
    getDroneFacing() { return this.drone.facing; }
    getInventory() { return { ...this.inventory }; }

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

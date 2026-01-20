/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - PARTICLE SYSTEM
 * ═══════════════════════════════════════════════════════════════
 * Visual effects for collection, energy, and achievements
 */

/**
 * Particle class
 */
class Particle {
    constructor(x, y, options = {}) {
        this.x = x;
        this.y = y;
        this.vx = options.vx || (Math.random() - 0.5) * 4;
        this.vy = options.vy || (Math.random() - 0.5) * 4;
        this.life = options.life || 1;
        this.maxLife = this.life;
        this.size = options.size || 4;
        this.color = options.color || '#00f0ff';
        this.gravity = options.gravity || 0;
        this.friction = options.friction || 0.98;
        this.shape = options.shape || 'circle'; // circle, square, star
    }

    update(dt) {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.life -= dt;
        return this.life > 0;
    }

    draw(ctx) {
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;

        switch (this.shape) {
            case 'square':
                ctx.fillRect(
                    this.x - this.size / 2,
                    this.y - this.size / 2,
                    this.size,
                    this.size
                );
                break;
            case 'star':
                this.drawStar(ctx);
                break;
            default:
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
        }

        ctx.globalAlpha = 1;
    }

    drawStar(ctx) {
        const spikes = 5;
        const outerRadius = this.size;
        const innerRadius = this.size / 2;

        ctx.beginPath();
        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const x = this.x + Math.cos(angle) * radius;
            const y = this.y + Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    }
}

/**
 * Particle System class
 */
export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.enabled = true;
    }

    /**
     * Update all particles
     */
    update(dt = 0.016) {
        this.particles = this.particles.filter(p => p.update(dt));
    }

    /**
     * Draw all particles
     */
    draw(ctx) {
        if (!this.enabled) return;
        this.particles.forEach(p => p.draw(ctx));
    }

    /**
     * Create collect effect (crystal sparkle)
     */
    emitCollect(x, y, color = '#00f0ff') {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 3;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8 + Math.random() * 0.4,
                size: 3 + Math.random() * 3,
                color: color,
                shape: 'star',
                friction: 0.95
            }));
        }
    }

    /**
     * Create energy drain effect (red particles falling)
     */
    emitEnergyDrain(x, y) {
        for (let i = 0; i < 10; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 2,
                vy: -1 - Math.random() * 2,
                life: 0.6 + Math.random() * 0.3,
                size: 2 + Math.random() * 2,
                color: '#ff3366',
                gravity: 0.15,
                shape: 'circle'
            }));
        }
    }

    /**
     * Create energy gain effect (green particles rising)
     */
    emitEnergyGain(x, y) {
        for (let i = 0; i < 15; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 2,
                vy: -2 - Math.random() * 3,
                life: 0.8 + Math.random() * 0.4,
                size: 3 + Math.random() * 2,
                color: '#00ff88',
                gravity: -0.02,
                shape: 'circle'
            }));
        }
    }

    /**
     * Create move trail effect
     */
    emitMoveTrail(x, y, facing) {
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 1,
                vy: (Math.random() - 0.5) * 1,
                life: 0.3 + Math.random() * 0.2,
                size: 2 + Math.random() * 2,
                color: 'rgba(0, 240, 255, 0.5)',
                shape: 'circle'
            }));
        }
    }

    /**
     * Create error effect (red flash)
     */
    emitError(x, y) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4,
                life: 0.4,
                size: 5,
                color: '#ff3366',
                shape: 'square',
                friction: 0.9
            }));
        }
    }

    /**
     * Create level complete effect (confetti)
     */
    emitLevelComplete(centerX, centerY, width, height) {
        const colors = ['#00f0ff', '#ff00aa', '#00ff88', '#ffdd00', '#aa66ff'];

        for (let i = 0; i < 50; i++) {
            const x = centerX + (Math.random() - 0.5) * width;
            const y = centerY - height / 2;

            this.particles.push(new Particle(x, y, {
                vx: (Math.random() - 0.5) * 6,
                vy: Math.random() * 3 + 1,
                life: 2 + Math.random(),
                size: 4 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                gravity: 0.1,
                shape: Math.random() > 0.5 ? 'square' : 'circle',
                friction: 0.99
            }));
        }
    }

    /**
     * Create achievement unlock effect
     */
    emitAchievement(x, y) {
        const colors = ['#ffd700', '#ffaa00', '#ffff00'];

        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 * i) / 30;
            const speed = 3 + Math.random() * 4;
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1 + Math.random() * 0.5,
                size: 4 + Math.random() * 3,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: 'star',
                friction: 0.96
            }));
        }
    }

    /**
     * Create scan pulse effect
     */
    emitScanPulse(x, y, direction) {
        for (let i = 0; i < 5; i++) {
            this.particles.push(new Particle(x, y, {
                vx: direction.dx * (2 + i * 0.5),
                vy: direction.dy * (2 + i * 0.5),
                life: 0.3 + i * 0.05,
                size: 3 - i * 0.3,
                color: 'rgba(0, 240, 255, 0.7)',
                shape: 'circle'
            }));
        }
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }

    /**
     * Toggle particles on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (!this.enabled) this.clear();
        return this.enabled;
    }
}

export default ParticleSystem;

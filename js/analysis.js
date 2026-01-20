export class AnalysisResult {
    constructor() {
        this.score = 0;
        this.stars = 0;
        this.breakdown = {};
        this.suggestions = [];
        this.metrics = {};
    }
}

export class AnalysisEngine {
    constructor() {
        this.weights = {
            energyEfficiency: 40,
            stepEfficiency: 30,
            timeBonus: 20,
            completionBonus: 10
        };

        this.patterns = [
            {
                check: (stats) => stats.turns > stats.moves * 0.5,
                suggestion: 'Too many TURNs relative to MOVEs. Try planning a more direct path.'
            },
            {
                check: (stats) => stats.energyWasted > 10,
                suggestion: 'Energy was wasted on failed actions. Use scan() to check before acting.'
            },
            {
                check: (stats) => stats.scans > stats.moves * 2,
                suggestion: 'Excessive scanning. Remember scan() has a cooldown and costs energy.'
            },
            {
                check: (stats, eventLog) => this.hasConsecutiveTurns(eventLog),
                suggestion: 'Consecutive TURN commands detected. Consider combining into a single rotation.'
            },
            {
                check: (stats) => stats.ticks > 100 && stats.moves < stats.ticks * 0.3,
                suggestion: 'Low movement ratio. Too much waiting or processing. Optimize your loop structure.'
            }
        ];
    }

    hasConsecutiveTurns(eventLog) {
        let lastWasTurn = false;
        for (const event of eventLog) {
            if (event.type === 'ACTION' && event.data?.type === 'TURN') {
                if (lastWasTurn) return true;
                lastWasTurn = true;
            } else {
                lastWasTurn = false;
            }
        }
        return false;
    }

    analyze(gameState, eventLog, levelData) {
        const result = new AnalysisResult();
        const stats = gameState.stats;

        const optimalEnergy = levelData.optimalEnergy || stats.energyUsed;
        const optimalSteps = levelData.optimalSteps || stats.ticks;
        const timeLimit = levelData.timeLimit || 100;

        result.metrics = {
            energyUsed: stats.energyUsed,
            energyOptimal: optimalEnergy,
            energyEfficiencyPct: Math.min(100, (optimalEnergy / Math.max(1, stats.energyUsed)) * 100),

            stepsUsed: stats.ticks,
            stepsOptimal: optimalSteps,
            stepEfficiencyPct: Math.min(100, (optimalSteps / Math.max(1, stats.ticks)) * 100),

            movesCount: stats.moves,
            turnsCount: stats.turns,
            collectsCount: stats.collects,
            scansCount: stats.scans,

            turnToMoveRatio: stats.moves > 0 ? (stats.turns / stats.moves).toFixed(2) : 0,

            completed: gameState.status === 'won',
            timeTaken: stats.ticks
        };

        const energyScore = Math.round(
            (optimalEnergy / Math.max(1, stats.energyUsed)) * this.weights.energyEfficiency
        );
        result.breakdown.energy = {
            score: Math.min(this.weights.energyEfficiency, energyScore),
            max: this.weights.energyEfficiency,
            detail: `Used ${stats.energyUsed} energy (optimal: ${optimalEnergy})`
        };

        const stepScore = Math.round(
            (optimalSteps / Math.max(1, stats.ticks)) * this.weights.stepEfficiency
        );
        result.breakdown.steps = {
            score: Math.min(this.weights.stepEfficiency, stepScore),
            max: this.weights.stepEfficiency,
            detail: `Completed in ${stats.ticks} steps (optimal: ${optimalSteps})`
        };

        const timeScore = Math.max(0, this.weights.timeBonus - Math.floor(stats.ticks / 10));
        result.breakdown.time = {
            score: timeScore,
            max: this.weights.timeBonus,
            detail: `Speed bonus: ${timeScore} points`
        };

        const completionScore = gameState.status === 'won' ? this.weights.completionBonus : 0;
        result.breakdown.completion = {
            score: completionScore,
            max: this.weights.completionBonus,
            detail: gameState.status === 'won' ? 'Level completed!' : 'Level not completed'
        };

        result.score = Math.round(
            result.breakdown.energy.score +
            result.breakdown.steps.score +
            result.breakdown.time.score +
            result.breakdown.completion.score
        );

        if (result.score >= 90) result.stars = 5;
        else if (result.score >= 75) result.stars = 4;
        else if (result.score >= 60) result.stars = 3;
        else if (result.score >= 40) result.stars = 2;
        else if (result.score >= 20) result.stars = 1;
        else result.stars = 0;

        for (const pattern of this.patterns) {
            if (pattern.check(stats, eventLog)) {
                result.suggestions.push(pattern.suggestion);
            }
        }

        if (gameState.status !== 'won') {
            if (gameState.drone.energy <= 0) {
                result.suggestions.unshift('💡 You ran out of energy. Try using WAIT to restore energy or find chargers.');
            } else {
                const progress = gameState.getObjectiveProgress();
                const remaining = progress.filter(o => !o.completed);
                if (remaining.length > 0) {
                    result.suggestions.unshift(`💡 Objective not met: Collect ${remaining[0].count} ${remaining[0].resource}(s)`);
                }
            }
        }

        if (result.stars >= 4 && result.suggestions.length === 0) {
            result.suggestions.push('🌟 Excellent efficiency! Your solution is near-optimal.');
        }

        if (result.score === 100) {
            result.suggestions = ['🏆 Perfect score! Optimal solution achieved!'];
        }

        return result;
    }

    formatAnalysis(result) {
        const starIcons = '⭐'.repeat(result.stars) + '☆'.repeat(5 - result.stars);

        let output = `
═══════════════════════════════════════
📊 EXECUTION ANALYSIS
═══════════════════════════════════════

Efficiency Score: ${starIcons} (${result.score}/100)

🔋 Energy Usage:
   Used: ${result.metrics.energyUsed}
   Optimal: ${result.metrics.energyOptimal}
   Efficiency: ${result.metrics.energyEfficiencyPct.toFixed(0)}%

📍 Movement:
   Total Steps: ${result.metrics.stepsUsed}
   Optimal: ${result.metrics.stepsOptimal}
   Moves: ${result.metrics.movesCount}
   Turns: ${result.metrics.turnsCount}
   Turn/Move Ratio: ${result.metrics.turnToMoveRatio}

📊 Breakdown:
   Energy: ${result.breakdown.energy.score}/${result.breakdown.energy.max}
   Steps: ${result.breakdown.steps.score}/${result.breakdown.steps.max}
   Speed: ${result.breakdown.time.score}/${result.breakdown.time.max}
   Completion: ${result.breakdown.completion.score}/${result.breakdown.completion.max}
`;

        if (result.suggestions.length > 0) {
            output += `
💡 Suggestions:
${result.suggestions.map(s => `   • ${s}`).join('\n')}
`;
        }

        return output;
    }
}

export default AnalysisEngine;

import { OpCode } from './compiler.js';

export const VMState = {
    READY: 'READY',
    RUNNING: 'RUNNING',
    PAUSED: 'PAUSED',
    HALTED: 'HALTED',
    ERROR: 'ERROR'
};

export class RuntimeError extends Error {
    constructor(message, line = 0, hint = '') {
        super(message);
        this.name = 'RuntimeError';
        this.line = line;
        this.hint = hint;
    }

    format() {
        let result = `\n${this.name}`;
        if (this.line > 0) {
            result += ` at line ${this.line}`;
        }
        result += `:\n  ${this.message}\n`;
        if (this.hint) {
            result += `\nHint: ${this.hint}\n`;
        }
        return result;
    }
}

export const EventType = {
    LOG: 'LOG',
    ACTION: 'ACTION',
    STATE_CHANGE: 'STATE_CHANGE',
    ERROR: 'ERROR',
    WARNING: 'WARNING'
};

export class VirtualMachine {
    constructor(bytecode, gameState, options = {}) {
        this.bytecode = bytecode.instructions;
        this.sourceMap = bytecode.sourceMap || {};
        this.gameState = gameState;
        this.options = {
            maxInstructions: options.maxInstructions || 10000,
            maxLoopIterations: options.maxLoopIterations || 1000,
            tickDelay: options.tickDelay || 100,
            ...options
        };
        this.ip = 0;
        this.stack = [];
        this.state = VMState.READY;
        this.instructionCount = 0;
        this.loopCounters = new Map();
        this.eventHandlers = new Map();
        this.eventLog = [];
        this.history = [];
        this.maxHistorySize = 1000;
    }

    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    emit(eventType, data) {
        const event = {
            type: eventType,
            data: data,
            tick: this.instructionCount,
            timestamp: Date.now()
        };
        this.eventLog.push(event);
        const handlers = this.eventHandlers.get(eventType) || [];
        handlers.forEach(handler => handler(event));
    }

    getCurrentLine() {
        return this.sourceMap[this.ip] || 0;
    }

    saveSnapshot() {
        const snapshot = {
            ip: this.ip,
            stack: [...this.stack],
            instructionCount: this.instructionCount,
            gameState: this.gameState.snapshot(),
            loopCounters: new Map(this.loopCounters)
        };
        this.history.push(snapshot);
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        }
    }

    restoreSnapshot(snapshot) {
        this.ip = snapshot.ip;
        this.stack = [...snapshot.stack];
        this.instructionCount = snapshot.instructionCount;
        this.gameState.restore(snapshot.gameState);
        this.loopCounters = new Map(snapshot.loopCounters);
    }

    rewind(steps = 1) {
        const targetIndex = Math.max(0, this.history.length - steps - 1);
        if (this.history[targetIndex]) {
            this.restoreSnapshot(this.history[targetIndex]);
            this.history = this.history.slice(0, targetIndex + 1);
            this.state = VMState.PAUSED;
            this.emit(EventType.STATE_CHANGE, { state: this.state });
            return true;
        }
        return false;
    }

    push(value) {
        this.stack.push(value);
    }

    pop() {
        if (this.stack.length === 0) {
            throw new RuntimeError('Stack underflow', this.getCurrentLine());
        }
        return this.stack.pop();
    }

    peek() {
        return this.stack[this.stack.length - 1];
    }

    run() {
        if (this.state === VMState.HALTED || this.state === VMState.ERROR) {
            this.reset();
        }
        this.state = VMState.RUNNING;
        this.emit(EventType.STATE_CHANGE, { state: this.state });
    }

    pause() {
        if (this.state === VMState.RUNNING) {
            this.state = VMState.PAUSED;
            this.emit(EventType.STATE_CHANGE, { state: this.state });
        }
    }

    stop() {
        this.state = VMState.HALTED;
        this.emit(EventType.STATE_CHANGE, { state: this.state });
    }

    reset() {
        this.ip = 0;
        this.stack = [];
        this.state = VMState.READY;
        this.instructionCount = 0;
        this.loopCounters = new Map();
        this.history = [];
        this.eventLog = [];
    }

    tick() {
        if (this.state !== VMState.RUNNING && this.state !== VMState.PAUSED) {
            return null;
        }
        if (this.instructionCount >= this.options.maxInstructions) {
            this.state = VMState.ERROR;
            throw new RuntimeError(
                `Execution stopped: Maximum instruction limit reached (${this.options.maxInstructions})`,
                this.getCurrentLine(),
                'Possible infinite loop detected. Check your WHILE conditions.'
            );
        }
        if (this.ip >= this.bytecode.length) {
            this.state = VMState.HALTED;
            this.emit(EventType.STATE_CHANGE, { state: this.state });
            return null;
        }
        this.saveSnapshot();
        const instr = this.bytecode[this.ip];
        const line = this.getCurrentLine();
        this.instructionCount++;
        try {
            const result = this.executeInstruction(instr, line);
            return result;
        } catch (error) {
            this.state = VMState.ERROR;
            this.emit(EventType.ERROR, { error: error, line: line });
            throw error;
        }
    }

    executeInstruction(instr, line) {
        let action = null;
        switch (instr.op) {
            case OpCode.MOVE:
                action = { type: 'MOVE', direction: instr.arg, line: line };
                this.ip++;
                break;
            case OpCode.TURN:
                action = { type: 'TURN', direction: instr.arg, line: line };
                this.ip++;
                break;
            case OpCode.COLLECT:
                action = { type: 'COLLECT', line: line };
                this.ip++;
                break;
            case OpCode.WAIT:
                action = { type: 'WAIT', ticks: instr.arg || 1, line: line };
                this.ip++;
                break;
            case OpCode.LOG:
                const logValue = this.pop();
                this.emit(EventType.LOG, { message: logValue, line: line });
                this.ip++;
                break;
            case OpCode.PUSH:
                this.push(instr.arg);
                this.ip++;
                break;
            case OpCode.POP:
                this.pop();
                this.ip++;
                break;
            case OpCode.LOAD:
                const varValue = this.loadVariable(instr.arg, line);
                this.push(varValue);
                this.ip++;
                break;
            case OpCode.CALL:
                const callResult = this.callFunction(instr.arg, line);
                this.push(callResult);
                this.ip++;
                break;
            case OpCode.MEMBER:
                const obj = this.pop();
                const prop = instr.arg;
                if (obj && typeof obj === 'object' && prop in obj) {
                    this.push(obj[prop]);
                } else {
                    throw new RuntimeError(`Cannot access property "${prop}" of ${typeof obj}`, line);
                }
                this.ip++;
                break;
            case OpCode.ADD:
                const addB = this.pop();
                const addA = this.pop();
                this.push(addA + addB);
                this.ip++;
                break;
            case OpCode.SUB:
                const subB = this.pop();
                const subA = this.pop();
                this.push(subA - subB);
                this.ip++;
                break;
            case OpCode.EQ:
                const eqB = this.pop();
                const eqA = this.pop();
                this.push(eqA === eqB);
                this.ip++;
                break;
            case OpCode.NEQ:
                const neqB = this.pop();
                const neqA = this.pop();
                this.push(neqA !== neqB);
                this.ip++;
                break;
            case OpCode.LT:
                const ltB = this.pop();
                const ltA = this.pop();
                this.push(ltA < ltB);
                this.ip++;
                break;
            case OpCode.GT:
                const gtB = this.pop();
                const gtA = this.pop();
                this.push(gtA > gtB);
                this.ip++;
                break;
            case OpCode.LTE:
                const lteB = this.pop();
                const lteA = this.pop();
                this.push(lteA <= lteB);
                this.ip++;
                break;
            case OpCode.GTE:
                const gteB = this.pop();
                const gteA = this.pop();
                this.push(gteA >= gteB);
                this.ip++;
                break;
            case OpCode.AND:
                const andB = this.pop();
                const andA = this.pop();
                this.push(andA && andB);
                this.ip++;
                break;
            case OpCode.OR:
                const orB = this.pop();
                const orA = this.pop();
                this.push(orA || orB);
                this.ip++;
                break;
            case OpCode.NOT:
                const notVal = this.pop();
                this.push(!notVal);
                this.ip++;
                break;
            case OpCode.JUMP:
                this.ip = instr.arg;
                break;
            case OpCode.JUMP_IF_FALSE:
                const jifValue = this.pop();
                if (!jifValue) {
                    this.ip = instr.arg;
                } else {
                    this.ip++;
                }
                break;
            case OpCode.JUMP_IF_TRUE:
                const jitValue = this.pop();
                if (jitValue) {
                    this.ip = instr.arg;
                } else {
                    this.ip++;
                }
                break;
            case OpCode.HALT:
                this.state = VMState.HALTED;
                this.emit(EventType.STATE_CHANGE, { state: this.state });
                break;
            case OpCode.NOP:
                this.ip++;
                break;
            case OpCode.LOOP_CHECK:
            case 'LOOP_CHECK':
                const counter = this.peek() || 0;
                const maxCount = instr.arg;
                this.push(counter < maxCount);
                this.ip++;
                break;
            case OpCode.LOOP_INC:
            case 'LOOP_INC':
                const currentCount = this.pop();
                this.push((currentCount || 0) + 1);
                this.ip++;
                break;
            default:
                throw new RuntimeError(`Unknown opcode: ${instr.op}`, line);
        }
        return action;
    }

    loadVariable(name, line) {
        const lowerName = name.toLowerCase();
        switch (lowerName) {
            case 'energy':
                return this.gameState.getEnergy();
            case 'x':
                return this.gameState.getDroneX();
            case 'y':
                return this.gameState.getDroneY();
            case 'facing':
                return this.gameState.getDroneFacing();
            case 'inventory':
                return this.gameState.getInventory();
            case 'true':
                return true;
            case 'false':
                return false;
            case '__counter__':
                return this.peek() || 0;
            default:
                throw new RuntimeError(`Unknown variable: "${name}"`, line, 'Valid variables: energy, x, y, facing, inventory');
        }
    }

    callFunction(callInfo, line) {
        const { name, argCount } = callInfo;
        const lowerName = name.toLowerCase();
        const args = [];
        for (let i = 0; i < argCount; i++) {
            args.unshift(this.pop());
        }
        switch (lowerName) {
            case 'scan':
                return this.gameState.scan('forward');
            case 'scan_left':
                return this.gameState.scan('left');
            case 'scan_right':
                return this.gameState.scan('right');
            default:
                throw new RuntimeError(`Unknown function: "${name}"`, line, 'Valid functions: scan(), scan_left(), scan_right()');
        }
    }

    getStats() {
        return {
            instructionCount: this.instructionCount,
            state: this.state,
            ip: this.ip,
            stackSize: this.stack.length,
            historySize: this.history.length,
            eventCount: this.eventLog.length
        };
    }
}

export default VirtualMachine;

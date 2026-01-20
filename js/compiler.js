/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - COMPILER (AST → Bytecode)
 * ═══════════════════════════════════════════════════════════════
 * Compiles AST to bytecode instructions for the VM.
 */

import { NodeType } from './parser.js';

/**
 * Bytecode Operation Types
 */
export const OpCode = {
    // Actions
    MOVE: 'MOVE',
    TURN: 'TURN',
    COLLECT: 'COLLECT',
    WAIT: 'WAIT',
    LOG: 'LOG',

    // Control Flow
    JUMP: 'JUMP',           // Unconditional jump
    JUMP_IF_FALSE: 'JIF',   // Jump if top of stack is false
    JUMP_IF_TRUE: 'JIT',    // Jump if top of stack is true

    // Stack Operations
    PUSH: 'PUSH',           // Push value onto stack
    POP: 'POP',             // Pop value from stack
    LOAD: 'LOAD',           // Load variable
    CALL: 'CALL',           // Call function
    MEMBER: 'MEMBER',       // Access object property

    // Operators
    ADD: 'ADD',
    SUB: 'SUB',
    EQ: 'EQ',
    NEQ: 'NEQ',
    LT: 'LT',
    GT: 'GT',
    LTE: 'LTE',
    GTE: 'GTE',
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',

    // Special
    HALT: 'HALT',
    NOP: 'NOP'
};

/**
 * Bytecode Instruction
 */
export class Instruction {
    constructor(op, arg = null, line = 0) {
        this.op = op;
        this.arg = arg;
        this.line = line;
    }

    toString() {
        return this.arg !== null
            ? `${this.op} ${JSON.stringify(this.arg)}`
            : this.op;
    }
}

/**
 * Compiler class - Converts AST to bytecode
 */
export class Compiler {
    constructor() {
        this.instructions = [];
        this.labelCount = 0;
    }

    /**
     * Generate unique label
     */
    newLabel() {
        return `L${this.labelCount++}`;
    }

    /**
     * Emit an instruction
     */
    emit(op, arg = null, line = 0) {
        const instr = new Instruction(op, arg, line);
        this.instructions.push(instr);
        return this.instructions.length - 1;
    }

    /**
     * Patch a jump instruction with target address
     */
    patchJump(instrIndex, targetAddr) {
        this.instructions[instrIndex].arg = targetAddr;
    }

    /**
     * Get current instruction address
     */
    currentAddr() {
        return this.instructions.length;
    }

    /**
     * Main compile method
     */
    compile(ast) {
        this.instructions = [];
        this.labelCount = 0;

        if (ast.type === NodeType.PROGRAM) {
            this.compileBlock(ast.body);
        } else {
            throw new Error('Expected Program node');
        }

        this.emit(OpCode.HALT);

        return {
            instructions: this.instructions,
            sourceMap: this.buildSourceMap()
        };
    }

    /**
     * Build source map (instruction index → line number)
     */
    buildSourceMap() {
        const sourceMap = {};
        this.instructions.forEach((instr, i) => {
            if (instr.line > 0) {
                sourceMap[i] = instr.line;
            }
        });
        return sourceMap;
    }

    /**
     * Compile a block of statements
     */
    compileBlock(statements) {
        for (const stmt of statements) {
            this.compileStatement(stmt);
        }
    }

    /**
     * Compile a single statement
     */
    compileStatement(stmt) {
        switch (stmt.type) {
            case NodeType.MOVE_STMT:
                this.emit(OpCode.MOVE, stmt.direction, stmt.line);
                break;

            case NodeType.TURN_STMT:
                this.emit(OpCode.TURN, stmt.direction, stmt.line);
                break;

            case NodeType.COLLECT_STMT:
                this.emit(OpCode.COLLECT, null, stmt.line);
                break;

            case NodeType.WAIT_STMT:
                this.emit(OpCode.WAIT, stmt.ticks, stmt.line);
                break;

            case NodeType.LOG_STMT:
                this.compileExpression(stmt.expression);
                this.emit(OpCode.LOG, null, stmt.line);
                break;

            case NodeType.IF_STMT:
                this.compileIfStatement(stmt);
                break;

            case NodeType.LOOP_STMT:
                this.compileLoopStatement(stmt);
                break;

            case NodeType.WHILE_STMT:
                this.compileWhileStatement(stmt);
                break;

            default:
                throw new Error(`Unknown statement type: ${stmt.type}`);
        }
    }

    /**
     * Compile IF statement
     */
    compileIfStatement(stmt) {
        // Compile condition
        this.compileExpression(stmt.condition);

        // Jump to else/end if false
        const jumpIfFalse = this.emit(OpCode.JUMP_IF_FALSE, 0, stmt.line);

        // Compile consequent block
        this.compileBlock(stmt.consequent.statements);

        if (stmt.alternate) {
            // Jump over alternate block
            const jumpToEnd = this.emit(OpCode.JUMP, 0);

            // Patch the conditional jump to here
            this.patchJump(jumpIfFalse, this.currentAddr());

            // Compile alternate (else/elif)
            if (stmt.alternate.type === NodeType.IF_STMT) {
                this.compileIfStatement(stmt.alternate);
            } else {
                this.compileBlock(stmt.alternate.statements);
            }

            // Patch jump to end
            this.patchJump(jumpToEnd, this.currentAddr());
        } else {
            // No else, just patch to current position
            this.patchJump(jumpIfFalse, this.currentAddr());
        }
    }

    /**
     * Compile LOOP statement
     */
    compileLoopStatement(stmt) {
        // Push loop counter
        const count = stmt.count;

        // We'll unroll simple loops or use counter
        const loopStart = this.currentAddr();

        // Push iteration counter
        this.emit(OpCode.PUSH, 0, stmt.line); // Initial counter = 0

        // Loop condition: counter < count
        const conditionAddr = this.currentAddr();
        this.emit(OpCode.PUSH, count);
        this.emit(OpCode.LOAD, '__counter__'); // Load counter (we'll handle this specially in VM)
        this.emit(OpCode.LT);

        const jumpIfDone = this.emit(OpCode.JUMP_IF_FALSE, 0);

        // Compile body
        this.compileBlock(stmt.body.statements);

        // Increment counter (handled in VM via special instruction)
        this.emit(OpCode.PUSH, 1);
        this.emit(OpCode.ADD);

        // Jump back to condition
        this.emit(OpCode.JUMP, conditionAddr);

        // End of loop
        this.patchJump(jumpIfDone, this.currentAddr());
        this.emit(OpCode.POP); // Clean up counter
    }

    /**
     * Compile WHILE statement
     */
    compileWhileStatement(stmt) {
        const loopStart = this.currentAddr();

        // Compile condition
        this.compileExpression(stmt.condition);

        // Jump past body if false
        const jumpIfFalse = this.emit(OpCode.JUMP_IF_FALSE, 0, stmt.line);

        // Compile body
        this.compileBlock(stmt.body.statements);

        // Jump back to condition
        this.emit(OpCode.JUMP, loopStart);

        // End of loop
        this.patchJump(jumpIfFalse, this.currentAddr());
    }

    /**
     * Compile expression
     */
    compileExpression(expr) {
        switch (expr.type) {
            case NodeType.LITERAL:
                this.emit(OpCode.PUSH, expr.value, expr.line);
                break;

            case NodeType.IDENTIFIER:
                this.emit(OpCode.LOAD, expr.name, expr.line);
                break;

            case NodeType.CALL_EXPR:
                // Compile arguments
                for (const arg of expr.arguments) {
                    this.compileExpression(arg);
                }
                // Compile callee
                if (expr.callee.type === NodeType.IDENTIFIER) {
                    this.emit(OpCode.CALL, {
                        name: expr.callee.name,
                        argCount: expr.arguments.length
                    }, expr.line);
                } else {
                    throw new Error('Only direct function calls supported');
                }
                break;

            case NodeType.MEMBER_EXPR:
                this.compileExpression(expr.object);
                this.emit(OpCode.MEMBER, expr.property, expr.line);
                break;

            case NodeType.BINARY_EXPR:
                this.compileExpression(expr.left);
                this.compileExpression(expr.right);

                const opMap = {
                    '+': OpCode.ADD,
                    '-': OpCode.SUB,
                    '==': OpCode.EQ,
                    '!=': OpCode.NEQ,
                    '<': OpCode.LT,
                    '>': OpCode.GT,
                    '<=': OpCode.LTE,
                    '>=': OpCode.GTE,
                    'and': OpCode.AND,
                    'or': OpCode.OR
                };

                this.emit(opMap[expr.operator], null, expr.line);
                break;

            case NodeType.UNARY_EXPR:
                this.compileExpression(expr.operand);
                if (expr.operator === 'not') {
                    this.emit(OpCode.NOT, null, expr.line);
                }
                break;

            default:
                throw new Error(`Unknown expression type: ${expr.type}`);
        }
    }
}

/**
 * Helper function to compile source code
 */
export function compileSource(ast) {
    const compiler = new Compiler();
    return compiler.compile(ast);
}

export default Compiler;

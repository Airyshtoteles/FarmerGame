import { NodeType } from './parser.js';

export const OpCode = {
    MOVE: 'MOVE',
    TURN: 'TURN',
    COLLECT: 'COLLECT',
    WAIT: 'WAIT',
    LOG: 'LOG',
    JUMP: 'JUMP',
    JUMP_IF_FALSE: 'JIF',
    JUMP_IF_TRUE: 'JIT',
    PUSH: 'PUSH',
    POP: 'POP',
    LOAD: 'LOAD',
    CALL: 'CALL',
    MEMBER: 'MEMBER',
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
    HALT: 'HALT',
    NOP: 'NOP',
    LOOP_CHECK: 'LOOP_CHECK',
    LOOP_INC: 'LOOP_INC'
};

export class Instruction {
    constructor(op, arg = null, line = 0) {
        this.op = op;
        this.arg = arg;
        this.line = line;
    }

    toString() {
        return this.arg !== null ? `${this.op} ${JSON.stringify(this.arg)}` : this.op;
    }
}

export class Compiler {
    constructor() {
        this.instructions = [];
        this.labelCount = 0;
    }

    newLabel() {
        return `L${this.labelCount++}`;
    }

    emit(op, arg = null, line = 0) {
        const instr = new Instruction(op, arg, line);
        this.instructions.push(instr);
        return this.instructions.length - 1;
    }

    patchJump(instrIndex, targetAddr) {
        this.instructions[instrIndex].arg = targetAddr;
    }

    currentAddr() {
        return this.instructions.length;
    }

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

    buildSourceMap() {
        const sourceMap = {};
        this.instructions.forEach((instr, i) => {
            if (instr.line > 0) {
                sourceMap[i] = instr.line;
            }
        });
        return sourceMap;
    }

    compileBlock(statements) {
        for (const stmt of statements) {
            this.compileStatement(stmt);
        }
    }

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

    compileIfStatement(stmt) {
        this.compileExpression(stmt.condition);
        const jumpIfFalse = this.emit(OpCode.JUMP_IF_FALSE, 0, stmt.line);
        this.compileBlock(stmt.consequent.statements);
        if (stmt.alternate) {
            const jumpToEnd = this.emit(OpCode.JUMP, 0);
            this.patchJump(jumpIfFalse, this.currentAddr());
            if (stmt.alternate.type === NodeType.IF_STMT) {
                this.compileIfStatement(stmt.alternate);
            } else {
                this.compileBlock(stmt.alternate.statements);
            }
            this.patchJump(jumpToEnd, this.currentAddr());
        } else {
            this.patchJump(jumpIfFalse, this.currentAddr());
        }
    }

    compileLoopStatement(stmt) {
        const count = stmt.count;
        if (count <= 10) {
            for (let i = 0; i < count; i++) {
                this.compileBlock(stmt.body.statements);
            }
        } else {
            this.emit(OpCode.PUSH, 0, stmt.line);
            const loopStart = this.currentAddr();
            this.emit(OpCode.PUSH, count);
            this.emit(OpCode.LOOP_CHECK, count);
            const jumpIfDone = this.emit(OpCode.JUMP_IF_FALSE, 0);
            this.compileBlock(stmt.body.statements);
            this.emit(OpCode.LOOP_INC);
            this.emit(OpCode.JUMP, loopStart);
            this.patchJump(jumpIfDone, this.currentAddr());
            this.emit(OpCode.POP);
        }
    }

    compileWhileStatement(stmt) {
        const loopStart = this.currentAddr();
        this.compileExpression(stmt.condition);
        const jumpIfFalse = this.emit(OpCode.JUMP_IF_FALSE, 0, stmt.line);
        this.compileBlock(stmt.body.statements);
        this.emit(OpCode.JUMP, loopStart);
        this.patchJump(jumpIfFalse, this.currentAddr());
    }

    compileExpression(expr) {
        switch (expr.type) {
            case NodeType.LITERAL:
                this.emit(OpCode.PUSH, expr.value, expr.line);
                break;
            case NodeType.IDENTIFIER:
                this.emit(OpCode.LOAD, expr.name, expr.line);
                break;
            case NodeType.CALL_EXPR:
                for (const arg of expr.arguments) {
                    this.compileExpression(arg);
                }
                if (expr.callee.type === NodeType.IDENTIFIER) {
                    this.emit(OpCode.CALL, { name: expr.callee.name, argCount: expr.arguments.length }, expr.line);
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

export function compileSource(ast) {
    const compiler = new Compiler();
    return compiler.compile(ast);
}

export default Compiler;

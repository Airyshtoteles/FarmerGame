import { TokenType, Token } from './lexer.js';

export const NodeType = {
    PROGRAM: 'Program',
    BLOCK: 'Block',

    MOVE_STMT: 'MoveStatement',
    TURN_STMT: 'TurnStatement',
    COLLECT_STMT: 'CollectStatement',
    WAIT_STMT: 'WaitStatement',
    LOG_STMT: 'LogStatement',

    IF_STMT: 'IfStatement',
    LOOP_STMT: 'LoopStatement',
    WHILE_STMT: 'WhileStatement',

    BINARY_EXPR: 'BinaryExpression',
    UNARY_EXPR: 'UnaryExpression',
    CALL_EXPR: 'CallExpression',
    MEMBER_EXPR: 'MemberExpression',
    LITERAL: 'Literal',
    IDENTIFIER: 'Identifier'
};

export class ParseError extends Error {
    constructor(message, token, hint = '') {
        super(message);
        this.name = 'ParseError';
        this.token = token;
        this.line = token?.line || 0;
        this.column = token?.column || 0;
        this.hint = hint;
    }

    format() {
        let result = `\n${this.name} at line ${this.line}, column ${this.column}:\n`;
        result += `  ${this.message}\n`;
        if (this.hint) {
            result += `\nHint: ${this.hint}\n`;
        }
        return result;
    }
}

export class SemanticError extends Error {
    constructor(message, node, hint = '') {
        super(message);
        this.name = 'SemanticError';
        this.node = node;
        this.line = node?.line || 0;
        this.column = node?.column || 0;
        this.hint = hint;
    }

    format() {
        let result = `\n${this.name} at line ${this.line}:\n`;
        result += `  ${this.message}\n`;
        if (this.hint) {
            result += `\nHint: ${this.hint}\n`;
        }
        return result;
    }
}

export class ASTNode {
    constructor(type, props = {}) {
        this.type = type;
        this.line = props.line || 0;
        this.column = props.column || 0;
        Object.assign(this, props);
    }
}

export class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.warnings = [];
    }

    current() {
        return this.tokens[this.pos] || new Token(TokenType.EOF, null, 0, 0);
    }

    peek(offset = 1) {
        return this.tokens[this.pos + offset] || new Token(TokenType.EOF, null, 0, 0);
    }

    check(type) {
        return this.current().type === type;
    }

    checkAny(...types) {
        return types.includes(this.current().type);
    }

    expect(type, errorMsg) {
        if (!this.check(type)) {
            throw new ParseError(
                errorMsg || `Expected ${type}, got ${this.current().type}`,
                this.current()
            );
        }
        return this.advance();
    }

    advance() {
        const token = this.current();
        this.pos++;
        return token;
    }

    skipNewlines() {
        while (this.check(TokenType.NEWLINE)) {
            this.advance();
        }
    }

    consumeStatementEnd() {
        if (this.check(TokenType.NEWLINE)) {
            this.advance();
        }
        this.skipNewlines();
    }

    parse() {
        this.skipNewlines();

        const statements = [];

        while (!this.check(TokenType.EOF)) {
            statements.push(this.parseStatement());
            this.consumeStatementEnd();
        }

        const program = new ASTNode(NodeType.PROGRAM, {
            body: statements,
            line: 1,
            column: 1
        });

        this.semanticCheck(program);

        return {
            ast: program,
            warnings: this.warnings
        };
    }

    parseStatement() {
        const token = this.current();

        switch (token.type) {
            case TokenType.MOVE:
                return this.parseMoveStatement();
            case TokenType.TURN:
                return this.parseTurnStatement();
            case TokenType.COLLECT:
                return this.parseCollectStatement();
            case TokenType.WAIT:
                return this.parseWaitStatement();
            case TokenType.LOG:
                return this.parseLogStatement();
            case TokenType.IF:
                return this.parseIfStatement();
            case TokenType.LOOP:
                return this.parseLoopStatement();
            case TokenType.WHILE:
                return this.parseWhileStatement();
            case TokenType.END:
                throw new ParseError(
                    'Unexpected END without matching IF/LOOP/WHILE',
                    token,
                    'Check your block structure - every END needs a matching opening statement'
                );
            default:
                throw new ParseError(
                    `Unexpected token: ${token.type} (${token.value})`,
                    token,
                    'Valid statements are: MOVE, TURN, COLLECT, WAIT, LOG, IF, LOOP, WHILE'
                );
        }
    }

    parseMoveStatement() {
        const token = this.advance();

        if (!this.checkAny(TokenType.FORWARD, TokenType.BACK)) {
            throw new ParseError(
                'MOVE requires a direction: forward or back',
                this.current(),
                'Example: MOVE forward'
            );
        }

        const direction = this.advance();

        return new ASTNode(NodeType.MOVE_STMT, {
            direction: direction.type === TokenType.FORWARD ? 'forward' : 'back',
            line: token.line,
            column: token.column
        });
    }

    parseTurnStatement() {
        const token = this.advance();

        if (!this.checkAny(TokenType.LEFT, TokenType.RIGHT)) {
            throw new ParseError(
                'TURN requires a direction: left or right',
                this.current(),
                'Example: TURN left'
            );
        }

        const direction = this.advance();

        return new ASTNode(NodeType.TURN_STMT, {
            direction: direction.type === TokenType.LEFT ? 'left' : 'right',
            line: token.line,
            column: token.column
        });
    }

    parseCollectStatement() {
        const token = this.advance();

        return new ASTNode(NodeType.COLLECT_STMT, {
            line: token.line,
            column: token.column
        });
    }

    parseWaitStatement() {
        const token = this.advance();

        let ticks = 1;
        if (this.check(TokenType.NUMBER)) {
            ticks = this.advance().value;
        }

        return new ASTNode(NodeType.WAIT_STMT, {
            ticks: ticks,
            line: token.line,
            column: token.column
        });
    }

    parseLogStatement() {
        const token = this.advance();

        const expression = this.parseExpression();

        return new ASTNode(NodeType.LOG_STMT, {
            expression: expression,
            line: token.line,
            column: token.column
        });
    }

    parseIfStatement() {
        const token = this.advance();

        const condition = this.parseExpression();

        this.expect(TokenType.COLON, 'Expected ":" after IF condition');
        this.consumeStatementEnd();

        const consequent = this.parseBlock();

        let alternate = null;

        if (this.check(TokenType.ELIF)) {
            alternate = this.parseIfStatement();
        } else if (this.check(TokenType.ELSE)) {
            this.advance();
            this.expect(TokenType.COLON, 'Expected ":" after ELSE');
            this.consumeStatementEnd();
            alternate = this.parseBlock();
            this.expect(TokenType.END, 'Expected END to close ELSE block');
        } else {
            this.expect(TokenType.END, 'Expected END to close IF block');
        }

        return new ASTNode(NodeType.IF_STMT, {
            condition: condition,
            consequent: consequent,
            alternate: alternate,
            line: token.line,
            column: token.column
        });
    }

    parseLoopStatement() {
        const token = this.advance();

        if (!this.check(TokenType.NUMBER)) {
            throw new ParseError(
                'LOOP requires a number of iterations',
                this.current(),
                'Example: LOOP 5:'
            );
        }

        const count = this.advance().value;

        if (count <= 0) {
            this.warnings.push({
                message: `LOOP with ${count} iterations will never execute`,
                line: token.line,
                column: token.column
            });
        }

        if (count > 1000) {
            this.warnings.push({
                message: `Large loop count (${count}) may impact performance`,
                line: token.line,
                column: token.column
            });
        }

        this.expect(TokenType.COLON, 'Expected ":" after LOOP count');
        this.consumeStatementEnd();

        const body = this.parseBlock();

        this.expect(TokenType.END, 'Expected END to close LOOP block');

        return new ASTNode(NodeType.LOOP_STMT, {
            count: count,
            body: body,
            line: token.line,
            column: token.column
        });
    }

    parseWhileStatement() {
        const token = this.advance();

        const condition = this.parseExpression();

        this.expect(TokenType.COLON, 'Expected ":" after WHILE condition');
        this.consumeStatementEnd();

        const body = this.parseBlock();

        this.expect(TokenType.END, 'Expected END to close WHILE block');

        return new ASTNode(NodeType.WHILE_STMT, {
            condition: condition,
            body: body,
            line: token.line,
            column: token.column
        });
    }

    parseBlock() {
        const statements = [];

        while (!this.checkAny(TokenType.END, TokenType.ELSE, TokenType.ELIF, TokenType.EOF)) {
            statements.push(this.parseStatement());
            this.consumeStatementEnd();
        }

        return new ASTNode(NodeType.BLOCK, {
            statements: statements
        });
    }

    parseExpression() {
        return this.parseOr();
    }

    parseOr() {
        let left = this.parseAnd();

        while (this.check(TokenType.OR)) {
            const op = this.advance();
            const right = this.parseAnd();
            left = new ASTNode(NodeType.BINARY_EXPR, {
                operator: 'or',
                left: left,
                right: right,
                line: op.line,
                column: op.column
            });
        }

        return left;
    }

    parseAnd() {
        let left = this.parseComparison();

        while (this.check(TokenType.AND)) {
            const op = this.advance();
            const right = this.parseComparison();
            left = new ASTNode(NodeType.BINARY_EXPR, {
                operator: 'and',
                left: left,
                right: right,
                line: op.line,
                column: op.column
            });
        }

        return left;
    }

    parseComparison() {
        let left = this.parseAdditive();

        const comparisonOps = [
            TokenType.EQUALS,
            TokenType.NOT_EQUALS,
            TokenType.LESS_THAN,
            TokenType.GREATER_THAN,
            TokenType.LESS_EQ,
            TokenType.GREATER_EQ
        ];

        while (this.checkAny(...comparisonOps)) {
            const op = this.advance();
            const right = this.parseAdditive();

            const opMap = {
                [TokenType.EQUALS]: '==',
                [TokenType.NOT_EQUALS]: '!=',
                [TokenType.LESS_THAN]: '<',
                [TokenType.GREATER_THAN]: '>',
                [TokenType.LESS_EQ]: '<=',
                [TokenType.GREATER_EQ]: '>='
            };

            left = new ASTNode(NodeType.BINARY_EXPR, {
                operator: opMap[op.type],
                left: left,
                right: right,
                line: op.line,
                column: op.column
            });
        }

        return left;
    }

    parseAdditive() {
        let left = this.parseUnary();

        while (this.checkAny(TokenType.PLUS, TokenType.MINUS)) {
            const op = this.advance();
            const right = this.parseUnary();
            left = new ASTNode(NodeType.BINARY_EXPR, {
                operator: op.type === TokenType.PLUS ? '+' : '-',
                left: left,
                right: right,
                line: op.line,
                column: op.column
            });
        }

        return left;
    }

    parseUnary() {
        if (this.check(TokenType.NOT)) {
            const op = this.advance();
            const operand = this.parseUnary();
            return new ASTNode(NodeType.UNARY_EXPR, {
                operator: 'not',
                operand: operand,
                line: op.line,
                column: op.column
            });
        }

        return this.parseCall();
    }

    parseCall() {
        let expr = this.parsePrimary();

        while (true) {
            if (this.check(TokenType.LPAREN)) {
                this.advance();

                const args = [];

                if (!this.check(TokenType.RPAREN)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.check(TokenType.COMMA) && this.advance());
                }

                this.expect(TokenType.RPAREN, 'Expected ")" after function arguments');

                expr = new ASTNode(NodeType.CALL_EXPR, {
                    callee: expr,
                    arguments: args,
                    line: expr.line,
                    column: expr.column
                });
            } else if (this.check(TokenType.DOT)) {
                this.advance();

                if (!this.check(TokenType.IDENTIFIER)) {
                    throw new ParseError(
                        'Expected property name after "."',
                        this.current()
                    );
                }

                const property = this.advance();

                expr = new ASTNode(NodeType.MEMBER_EXPR, {
                    object: expr,
                    property: property.value,
                    line: expr.line,
                    column: expr.column
                });
            } else {
                break;
            }
        }

        return expr;
    }

    parsePrimary() {
        const token = this.current();

        if (this.check(TokenType.NUMBER)) {
            this.advance();
            return new ASTNode(NodeType.LITERAL, {
                value: token.value,
                valueType: 'number',
                line: token.line,
                column: token.column
            });
        }

        if (this.check(TokenType.STRING)) {
            this.advance();
            return new ASTNode(NodeType.LITERAL, {
                value: token.value,
                valueType: 'string',
                line: token.line,
                column: token.column
            });
        }

        if (this.checkAny(TokenType.FORWARD, TokenType.BACK, TokenType.LEFT, TokenType.RIGHT)) {
            this.advance();
            return new ASTNode(NodeType.LITERAL, {
                value: token.value.toLowerCase(),
                valueType: 'string',
                line: token.line,
                column: token.column
            });
        }

        if (this.check(TokenType.IDENTIFIER)) {
            this.advance();
            return new ASTNode(NodeType.IDENTIFIER, {
                name: token.value,
                line: token.line,
                column: token.column
            });
        }

        if (this.check(TokenType.LPAREN)) {
            this.advance();
            const expr = this.parseExpression();
            this.expect(TokenType.RPAREN, 'Expected ")" to close expression');
            return expr;
        }

        throw new ParseError(
            `Unexpected token in expression: ${token.type}`,
            token,
            'Expected a value, variable, or function call'
        );
    }

    semanticCheck(program) {
        this.checkUnreachableCode(program.body);
        this.checkVariableUsage(program.body);
    }

    checkUnreachableCode(statements) {
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            if (stmt.type === NodeType.WHILE_STMT) {
                if (this.isAlwaysTrue(stmt.condition)) {
                    if (i < statements.length - 1) {
                        this.warnings.push({
                            message: 'Code after "WHILE true" is unreachable',
                            line: statements[i + 1].line,
                            column: statements[i + 1].column
                        });
                    }
                }
            }

            if (stmt.body?.statements) {
                this.checkUnreachableCode(stmt.body.statements);
            }
            if (stmt.consequent?.statements) {
                this.checkUnreachableCode(stmt.consequent.statements);
            }
            if (stmt.alternate?.statements) {
                this.checkUnreachableCode(stmt.alternate.statements);
            }
        }
    }

    isAlwaysTrue(condition) {
        if (condition.type === NodeType.LITERAL && condition.value === true) {
            return true;
        }
        if (condition.type === NodeType.IDENTIFIER &&
            condition.name.toLowerCase() === 'true') {
            return true;
        }
        return false;
    }

    checkVariableUsage(statements) {
        const validVariables = new Set([
            'energy', 'x', 'y', 'facing', 'inventory',
            'scan', 'scan_left', 'scan_right', 'true', 'false'
        ]);

        const checkNode = (node) => {
            if (!node) return;

            if (node.type === NodeType.IDENTIFIER) {
                const name = node.name.toLowerCase();
                if (!validVariables.has(name)) {
                    this.warnings.push({
                        message: `Unknown variable or function: "${node.name}"`,
                        line: node.line,
                        column: node.column
                    });
                }
            }

            if (node.condition) checkNode(node.condition);
            if (node.left) checkNode(node.left);
            if (node.right) checkNode(node.right);
            if (node.operand) checkNode(node.operand);
            if (node.callee) checkNode(node.callee);
            if (node.object) checkNode(node.object);
            if (node.expression) checkNode(node.expression);
            if (node.arguments) node.arguments.forEach(checkNode);
            if (node.body?.statements) node.body.statements.forEach(s => this.checkVariableUsageInStmt(s, checkNode));
            if (node.consequent?.statements) node.consequent.statements.forEach(s => this.checkVariableUsageInStmt(s, checkNode));
            if (node.alternate?.statements) node.alternate.statements.forEach(s => this.checkVariableUsageInStmt(s, checkNode));
        };

        statements.forEach(stmt => this.checkVariableUsageInStmt(stmt, checkNode));
    }

    checkVariableUsageInStmt(stmt, checkNode) {
        if (stmt.condition) checkNode(stmt.condition);
        if (stmt.expression) checkNode(stmt.expression);
        if (stmt.body?.statements) stmt.body.statements.forEach(s => this.checkVariableUsageInStmt(s, checkNode));
        if (stmt.consequent?.statements) stmt.consequent.statements.forEach(s => this.checkVariableUsageInStmt(s, checkNode));
        if (stmt.alternate?.statements) stmt.alternate.statements.forEach(s => this.checkVariableUsageInStmt(s, checkNode));
    }
}

export default Parser;

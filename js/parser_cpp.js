/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - C++ STYLE PARSER
 * ═══════════════════════════════════════════════════════════════
 * Parses C++ style tokens into the same AST format as the Python-style parser.
 * This allows the same compiler and VM to be used.
 */

import { CppTokenType, CppToken } from './lexer_cpp.js';
import { NodeType, ASTNode, ParseError } from './parser.js';

/**
 * C++ Style Parser
 */
export class CppParser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
        this.warnings = [];
    }

    current() {
        return this.tokens[this.pos] || new CppToken(CppTokenType.EOF, null, 0, 0);
    }

    peek(offset = 1) {
        return this.tokens[this.pos + offset] || new CppToken(CppTokenType.EOF, null, 0, 0);
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
        while (this.check(CppTokenType.NEWLINE)) {
            this.advance();
        }
    }

    /**
     * Main parse method
     */
    parse() {
        this.skipNewlines();

        const statements = [];

        while (!this.check(CppTokenType.EOF)) {
            statements.push(this.parseStatement());
            this.skipNewlines();
        }

        return {
            ast: new ASTNode(NodeType.PROGRAM, {
                body: statements,
                line: 1,
                column: 1
            }),
            warnings: this.warnings
        };
    }

    /**
     * Parse statement
     */
    parseStatement() {
        this.skipNewlines();
        const token = this.current();

        switch (token.type) {
            case CppTokenType.MOVE_FORWARD:
            case CppTokenType.MOVE_BACK:
                return this.parseMoveStatement();

            case CppTokenType.TURN_LEFT:
            case CppTokenType.TURN_RIGHT:
                return this.parseTurnStatement();

            case CppTokenType.COLLECT:
                return this.parseCollectStatement();

            case CppTokenType.WAIT:
                return this.parseWaitStatement();

            case CppTokenType.LOG:
                return this.parseLogStatement();

            case CppTokenType.IF:
                return this.parseIfStatement();

            case CppTokenType.FOR:
                return this.parseForStatement();

            case CppTokenType.WHILE:
                return this.parseWhileStatement();

            default:
                throw new ParseError(
                    `Unexpected token: ${token.type} (${token.value})`,
                    token,
                    'Valid: move_forward(), turn_left(), collect(), if, for, while'
                );
        }
    }

    /**
     * Parse move statement: move_forward(); or move_back();
     */
    parseMoveStatement() {
        const token = this.advance();
        const direction = token.type === CppTokenType.MOVE_FORWARD ? 'forward' : 'back';

        this.expect(CppTokenType.LPAREN, 'Expected "(" after move function');
        this.expect(CppTokenType.RPAREN, 'Expected ")"');
        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after statement');

        return new ASTNode(NodeType.MOVE_STMT, {
            direction: direction,
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse turn statement: turn_left(); or turn_right();
     */
    parseTurnStatement() {
        const token = this.advance();
        const direction = token.type === CppTokenType.TURN_LEFT ? 'left' : 'right';

        this.expect(CppTokenType.LPAREN, 'Expected "(" after turn function');
        this.expect(CppTokenType.RPAREN, 'Expected ")"');
        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after statement');

        return new ASTNode(NodeType.TURN_STMT, {
            direction: direction,
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse collect statement: collect();
     */
    parseCollectStatement() {
        const token = this.advance();

        this.expect(CppTokenType.LPAREN, 'Expected "(" after collect');
        this.expect(CppTokenType.RPAREN, 'Expected ")"');
        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after statement');

        return new ASTNode(NodeType.COLLECT_STMT, {
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse wait statement: wait(n);
     */
    parseWaitStatement() {
        const token = this.advance();

        this.expect(CppTokenType.LPAREN, 'Expected "(" after wait');

        let ticks = 1;
        if (this.check(CppTokenType.NUMBER)) {
            ticks = this.advance().value;
        }

        this.expect(CppTokenType.RPAREN, 'Expected ")"');
        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after statement');

        return new ASTNode(NodeType.WAIT_STMT, {
            ticks: ticks,
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse log statement: log("message");
     */
    parseLogStatement() {
        const token = this.advance();

        this.expect(CppTokenType.LPAREN, 'Expected "(" after log');
        const expression = this.parseExpression();
        this.expect(CppTokenType.RPAREN, 'Expected ")"');
        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after statement');

        return new ASTNode(NodeType.LOG_STMT, {
            expression: expression,
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse if statement: if (condition) { ... } else { ... }
     */
    parseIfStatement() {
        const token = this.advance();

        this.expect(CppTokenType.LPAREN, 'Expected "(" after if');
        const condition = this.parseExpression();
        this.expect(CppTokenType.RPAREN, 'Expected ")" after condition');

        this.skipNewlines();
        this.expect(CppTokenType.LBRACE, 'Expected "{" to open if block');
        this.skipNewlines();

        const consequent = this.parseBlock();

        this.expect(CppTokenType.RBRACE, 'Expected "}" to close if block');
        this.skipNewlines();

        let alternate = null;
        if (this.check(CppTokenType.ELSE)) {
            this.advance();
            this.skipNewlines();

            if (this.check(CppTokenType.IF)) {
                // else if
                alternate = this.parseIfStatement();
            } else {
                this.expect(CppTokenType.LBRACE, 'Expected "{" after else');
                this.skipNewlines();
                alternate = this.parseBlock();
                this.expect(CppTokenType.RBRACE, 'Expected "}" to close else block');
            }
        }

        return new ASTNode(NodeType.IF_STMT, {
            condition: condition,
            consequent: new ASTNode(NodeType.BLOCK, { statements: consequent }),
            alternate: alternate ? (alternate.type === NodeType.IF_STMT ? alternate : new ASTNode(NodeType.BLOCK, { statements: alternate })) : null,
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse for statement: for (int i = 0; i < n; i++) { ... }
     * Converts to LOOP statement
     */
    parseForStatement() {
        const token = this.advance();

        this.expect(CppTokenType.LPAREN, 'Expected "(" after for');

        // Parse: int i = 0
        if (this.check(CppTokenType.INT)) {
            this.advance(); // skip 'int'
        }

        if (!this.check(CppTokenType.IDENTIFIER)) {
            throw new ParseError('Expected loop variable', this.current());
        }
        const varName = this.advance().value;

        this.expect(CppTokenType.ASSIGN, 'Expected "=" in for init');

        if (!this.check(CppTokenType.NUMBER)) {
            throw new ParseError('Expected number for loop start', this.current());
        }
        const startVal = this.advance().value;

        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after for init');

        // Parse: i < n
        this.advance(); // skip variable name

        if (!this.check(CppTokenType.LESS_THAN)) {
            throw new ParseError('Expected "<" in for condition', this.current());
        }
        this.advance();

        if (!this.check(CppTokenType.NUMBER)) {
            throw new ParseError('Expected number for loop end', this.current());
        }
        const endVal = this.advance().value;

        this.expect(CppTokenType.SEMICOLON, 'Expected ";" after for condition');

        // Parse: i++
        this.advance(); // skip variable
        if (this.check(CppTokenType.PLUS_PLUS)) {
            this.advance();
        }

        this.expect(CppTokenType.RPAREN, 'Expected ")" after for header');

        this.skipNewlines();
        this.expect(CppTokenType.LBRACE, 'Expected "{" to open for block');
        this.skipNewlines();

        const body = this.parseBlock();

        this.expect(CppTokenType.RBRACE, 'Expected "}" to close for block');

        // Convert to LOOP statement
        const count = endVal - startVal;

        return new ASTNode(NodeType.LOOP_STMT, {
            count: count,
            body: new ASTNode(NodeType.BLOCK, { statements: body }),
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse while statement: while (condition) { ... }
     */
    parseWhileStatement() {
        const token = this.advance();

        this.expect(CppTokenType.LPAREN, 'Expected "(" after while');
        const condition = this.parseExpression();
        this.expect(CppTokenType.RPAREN, 'Expected ")" after condition');

        this.skipNewlines();
        this.expect(CppTokenType.LBRACE, 'Expected "{" to open while block');
        this.skipNewlines();

        const body = this.parseBlock();

        this.expect(CppTokenType.RBRACE, 'Expected "}" to close while block');

        return new ASTNode(NodeType.WHILE_STMT, {
            condition: condition,
            body: new ASTNode(NodeType.BLOCK, { statements: body }),
            line: token.line,
            column: token.column
        });
    }

    /**
     * Parse block (statements until })
     */
    parseBlock() {
        const statements = [];

        while (!this.checkAny(CppTokenType.RBRACE, CppTokenType.EOF)) {
            statements.push(this.parseStatement());
            this.skipNewlines();
        }

        return statements;
    }

    /**
     * Parse expression
     */
    parseExpression() {
        return this.parseOr();
    }

    parseOr() {
        let left = this.parseAnd();

        while (this.check(CppTokenType.OR)) {
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

        while (this.check(CppTokenType.AND)) {
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

        const compOps = [
            CppTokenType.EQUALS,
            CppTokenType.NOT_EQUALS,
            CppTokenType.LESS_THAN,
            CppTokenType.GREATER_THAN,
            CppTokenType.LESS_EQ,
            CppTokenType.GREATER_EQ
        ];

        while (this.checkAny(...compOps)) {
            const op = this.advance();
            const right = this.parseAdditive();

            const opMap = {
                [CppTokenType.EQUALS]: '==',
                [CppTokenType.NOT_EQUALS]: '!=',
                [CppTokenType.LESS_THAN]: '<',
                [CppTokenType.GREATER_THAN]: '>',
                [CppTokenType.LESS_EQ]: '<=',
                [CppTokenType.GREATER_EQ]: '>='
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

        while (this.checkAny(CppTokenType.PLUS, CppTokenType.MINUS)) {
            const op = this.advance();
            const right = this.parseUnary();
            left = new ASTNode(NodeType.BINARY_EXPR, {
                operator: op.type === CppTokenType.PLUS ? '+' : '-',
                left: left,
                right: right,
                line: op.line,
                column: op.column
            });
        }

        return left;
    }

    parseUnary() {
        if (this.check(CppTokenType.NOT)) {
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
            if (this.check(CppTokenType.LPAREN)) {
                this.advance();

                const args = [];
                if (!this.check(CppTokenType.RPAREN)) {
                    do {
                        args.push(this.parseExpression());
                    } while (this.check(CppTokenType.COMMA) && this.advance());
                }

                this.expect(CppTokenType.RPAREN, 'Expected ")" after arguments');

                expr = new ASTNode(NodeType.CALL_EXPR, {
                    callee: expr,
                    arguments: args,
                    line: expr.line,
                    column: expr.column
                });
            } else if (this.check(CppTokenType.DOT)) {
                this.advance();

                if (!this.check(CppTokenType.IDENTIFIER)) {
                    throw new ParseError('Expected property name after "."', this.current());
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

        // Number
        if (this.check(CppTokenType.NUMBER)) {
            this.advance();
            return new ASTNode(NodeType.LITERAL, {
                value: token.value,
                valueType: 'number',
                line: token.line,
                column: token.column
            });
        }

        // String
        if (this.check(CppTokenType.STRING)) {
            this.advance();
            return new ASTNode(NodeType.LITERAL, {
                value: token.value,
                valueType: 'string',
                line: token.line,
                column: token.column
            });
        }

        // Scan functions as identifiers
        if (this.checkAny(CppTokenType.SCAN, CppTokenType.SCAN_LEFT, CppTokenType.SCAN_RIGHT)) {
            this.advance();
            return new ASTNode(NodeType.IDENTIFIER, {
                name: token.value,
                line: token.line,
                column: token.column
            });
        }

        // Identifier
        if (this.check(CppTokenType.IDENTIFIER)) {
            this.advance();
            return new ASTNode(NodeType.IDENTIFIER, {
                name: token.value,
                line: token.line,
                column: token.column
            });
        }

        // Parenthesized expression
        if (this.check(CppTokenType.LPAREN)) {
            this.advance();
            const expr = this.parseExpression();
            this.expect(CppTokenType.RPAREN, 'Expected ")"');
            return expr;
        }

        throw new ParseError(
            `Unexpected token: ${token.type}`,
            token,
            'Expected value, variable, or function call'
        );
    }
}

export default CppParser;

/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - C++ STYLE LEXER
 * ═══════════════════════════════════════════════════════════════
 * Converts C++ style source code into tokens.
 * 
 * Syntax:
 *   move_forward();
 *   move_back();
 *   turn_left();
 *   turn_right();
 *   collect();
 *   wait(n);
 *   
 *   for (int i = 0; i < n; i++) { ... }
 *   if (condition) { ... } else { ... }
 *   while (condition) { ... }
 *   
 *   scan()
 *   energy
 *   inventory.crystal
 */

// Token Types for C++ mode
export const CppTokenType = {
    // Keywords
    IF: 'IF',
    ELSE: 'ELSE',
    FOR: 'FOR',
    WHILE: 'WHILE',
    INT: 'INT',

    // Actions (as function names)
    MOVE_FORWARD: 'MOVE_FORWARD',
    MOVE_BACK: 'MOVE_BACK',
    TURN_LEFT: 'TURN_LEFT',
    TURN_RIGHT: 'TURN_RIGHT',
    COLLECT: 'COLLECT',
    WAIT: 'WAIT',
    LOG: 'LOG',

    // Scan functions
    SCAN: 'SCAN',
    SCAN_LEFT: 'SCAN_LEFT',
    SCAN_RIGHT: 'SCAN_RIGHT',

    // Literals
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',

    // Operators
    EQUALS: 'EQUALS',         // ==
    NOT_EQUALS: 'NOT_EQUALS', // !=
    LESS_THAN: 'LESS_THAN',   // <
    GREATER_THAN: 'GREATER_THAN', // >
    LESS_EQ: 'LESS_EQ',       // <=
    GREATER_EQ: 'GREATER_EQ', // >=
    ASSIGN: 'ASSIGN',         // =
    AND: 'AND',               // &&
    OR: 'OR',                 // ||
    NOT: 'NOT',               // !
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    PLUS_PLUS: 'PLUS_PLUS',   // ++
    MINUS_MINUS: 'MINUS_MINUS', // --

    // Punctuation
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    LBRACE: 'LBRACE',
    RBRACE: 'RBRACE',
    SEMICOLON: 'SEMICOLON',
    DOT: 'DOT',
    COMMA: 'COMMA',

    // Special
    NEWLINE: 'NEWLINE',
    EOF: 'EOF'
};

// Keywords map
const CPP_KEYWORDS = {
    'if': CppTokenType.IF,
    'else': CppTokenType.ELSE,
    'for': CppTokenType.FOR,
    'while': CppTokenType.WHILE,
    'int': CppTokenType.INT,
    'move_forward': CppTokenType.MOVE_FORWARD,
    'move_back': CppTokenType.MOVE_BACK,
    'turn_left': CppTokenType.TURN_LEFT,
    'turn_right': CppTokenType.TURN_RIGHT,
    'collect': CppTokenType.COLLECT,
    'wait': CppTokenType.WAIT,
    'log': CppTokenType.LOG,
    'scan': CppTokenType.SCAN,
    'scan_left': CppTokenType.SCAN_LEFT,
    'scan_right': CppTokenType.SCAN_RIGHT
};

/**
 * Token class
 */
export class CppToken {
    constructor(type, value, line, column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }
}

/**
 * Lexer Error
 */
export class CppLexerError extends Error {
    constructor(message, line, column) {
        super(message);
        this.name = 'CppLexerError';
        this.line = line;
        this.column = column;
    }
}

/**
 * C++ Style Lexer
 */
export class CppLexer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
    }

    peek(offset = 0) {
        const pos = this.pos + offset;
        return pos < this.source.length ? this.source[pos] : '\0';
    }

    advance() {
        const char = this.source[this.pos];
        this.pos++;

        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }

        return char;
    }

    skipWhitespace() {
        while (' \t\r'.includes(this.peek())) {
            this.advance();
        }
    }

    skipComment() {
        // Single line comment //
        if (this.peek() === '/' && this.peek(1) === '/') {
            while (this.peek() !== '\n' && this.peek() !== '\0') {
                this.advance();
            }
        }
        // Multi-line comment /* */
        if (this.peek() === '/' && this.peek(1) === '*') {
            this.advance(); this.advance();
            while (!(this.peek() === '*' && this.peek(1) === '/') && this.peek() !== '\0') {
                this.advance();
            }
            if (this.peek() !== '\0') {
                this.advance(); this.advance();
            }
        }
    }

    readNumber() {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (/[0-9]/.test(this.peek())) {
            value += this.advance();
        }

        if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
            value += this.advance();
            while (/[0-9]/.test(this.peek())) {
                value += this.advance();
            }
        }

        return new CppToken(CppTokenType.NUMBER, parseFloat(value), startLine, startColumn);
    }

    readIdentifier() {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (/[a-zA-Z0-9_]/.test(this.peek())) {
            value += this.advance();
        }

        const lower = value.toLowerCase();
        const type = CPP_KEYWORDS[lower] || CppTokenType.IDENTIFIER;

        return new CppToken(type, value, startLine, startColumn);
    }

    readString() {
        const startLine = this.line;
        const startColumn = this.column;
        const quote = this.advance();
        let value = '';

        while (this.peek() !== quote && this.peek() !== '\0' && this.peek() !== '\n') {
            if (this.peek() === '\\') {
                this.advance();
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    default: value += escaped;
                }
            } else {
                value += this.advance();
            }
        }

        if (this.peek() !== quote) {
            throw new CppLexerError('Unterminated string', startLine, startColumn);
        }

        this.advance();
        return new CppToken(CppTokenType.STRING, value, startLine, startColumn);
    }

    tokenize() {
        this.tokens = [];

        while (this.pos < this.source.length) {
            this.skipWhitespace();
            this.skipComment();

            if (this.pos >= this.source.length) break;

            const char = this.peek();
            const startLine = this.line;
            const startColumn = this.column;

            // Newline
            if (char === '\n') {
                this.tokens.push(new CppToken(CppTokenType.NEWLINE, '\n', startLine, startColumn));
                this.advance();
                continue;
            }

            // Number
            if (/[0-9]/.test(char)) {
                this.tokens.push(this.readNumber());
                continue;
            }

            // Identifier or keyword
            if (/[a-zA-Z_]/.test(char)) {
                this.tokens.push(this.readIdentifier());
                continue;
            }

            // String
            if (char === '"' || char === "'") {
                this.tokens.push(this.readString());
                continue;
            }

            // Two-character operators
            if (char === '=' && this.peek(1) === '=') {
                this.tokens.push(new CppToken(CppTokenType.EQUALS, '==', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '!' && this.peek(1) === '=') {
                this.tokens.push(new CppToken(CppTokenType.NOT_EQUALS, '!=', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '<' && this.peek(1) === '=') {
                this.tokens.push(new CppToken(CppTokenType.LESS_EQ, '<=', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '>' && this.peek(1) === '=') {
                this.tokens.push(new CppToken(CppTokenType.GREATER_EQ, '>=', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '&' && this.peek(1) === '&') {
                this.tokens.push(new CppToken(CppTokenType.AND, '&&', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '|' && this.peek(1) === '|') {
                this.tokens.push(new CppToken(CppTokenType.OR, '||', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '+' && this.peek(1) === '+') {
                this.tokens.push(new CppToken(CppTokenType.PLUS_PLUS, '++', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '-' && this.peek(1) === '-') {
                this.tokens.push(new CppToken(CppTokenType.MINUS_MINUS, '--', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }

            // Single-character tokens
            switch (char) {
                case ';':
                    this.tokens.push(new CppToken(CppTokenType.SEMICOLON, ';', startLine, startColumn));
                    this.advance();
                    break;
                case '(':
                    this.tokens.push(new CppToken(CppTokenType.LPAREN, '(', startLine, startColumn));
                    this.advance();
                    break;
                case ')':
                    this.tokens.push(new CppToken(CppTokenType.RPAREN, ')', startLine, startColumn));
                    this.advance();
                    break;
                case '{':
                    this.tokens.push(new CppToken(CppTokenType.LBRACE, '{', startLine, startColumn));
                    this.advance();
                    break;
                case '}':
                    this.tokens.push(new CppToken(CppTokenType.RBRACE, '}', startLine, startColumn));
                    this.advance();
                    break;
                case '.':
                    this.tokens.push(new CppToken(CppTokenType.DOT, '.', startLine, startColumn));
                    this.advance();
                    break;
                case ',':
                    this.tokens.push(new CppToken(CppTokenType.COMMA, ',', startLine, startColumn));
                    this.advance();
                    break;
                case '<':
                    this.tokens.push(new CppToken(CppTokenType.LESS_THAN, '<', startLine, startColumn));
                    this.advance();
                    break;
                case '>':
                    this.tokens.push(new CppToken(CppTokenType.GREATER_THAN, '>', startLine, startColumn));
                    this.advance();
                    break;
                case '=':
                    this.tokens.push(new CppToken(CppTokenType.ASSIGN, '=', startLine, startColumn));
                    this.advance();
                    break;
                case '!':
                    this.tokens.push(new CppToken(CppTokenType.NOT, '!', startLine, startColumn));
                    this.advance();
                    break;
                case '+':
                    this.tokens.push(new CppToken(CppTokenType.PLUS, '+', startLine, startColumn));
                    this.advance();
                    break;
                case '-':
                    this.tokens.push(new CppToken(CppTokenType.MINUS, '-', startLine, startColumn));
                    this.advance();
                    break;
                default:
                    throw new CppLexerError(`Unexpected character: '${char}'`, startLine, startColumn);
            }
        }

        this.tokens.push(new CppToken(CppTokenType.EOF, null, this.line, this.column));

        // Filter consecutive newlines
        return this.tokens.filter((token, i, arr) => {
            if (token.type === CppTokenType.NEWLINE) {
                return i === 0 || arr[i - 1].type !== CppTokenType.NEWLINE;
            }
            return true;
        });
    }
}

export default CppLexer;

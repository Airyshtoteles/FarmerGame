/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - LEXER (Tokenizer)
 * ═══════════════════════════════════════════════════════════════
 * Converts source code into tokens with line/column tracking
 * for precise error reporting.
 */

// Token Types
export const TokenType = {
    // Keywords
    IF: 'IF',
    ELIF: 'ELIF',
    ELSE: 'ELSE',
    END: 'END',
    LOOP: 'LOOP',
    WHILE: 'WHILE',

    // Actions
    MOVE: 'MOVE',
    TURN: 'TURN',
    COLLECT: 'COLLECT',
    WAIT: 'WAIT',
    LOG: 'LOG',

    // Directions
    FORWARD: 'FORWARD',
    BACK: 'BACK',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',

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
    AND: 'AND',
    OR: 'OR',
    NOT: 'NOT',
    PLUS: 'PLUS',
    MINUS: 'MINUS',

    // Punctuation
    COLON: 'COLON',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    DOT: 'DOT',
    COMMA: 'COMMA',

    // Special
    NEWLINE: 'NEWLINE',
    EOF: 'EOF',
    INDENT: 'INDENT',
    DEDENT: 'DEDENT'
};

// Keywords map
const KEYWORDS = {
    'if': TokenType.IF,
    'elif': TokenType.ELIF,
    'else': TokenType.ELSE,
    'end': TokenType.END,
    'loop': TokenType.LOOP,
    'while': TokenType.WHILE,
    'move': TokenType.MOVE,
    'turn': TokenType.TURN,
    'collect': TokenType.COLLECT,
    'wait': TokenType.WAIT,
    'log': TokenType.LOG,
    'forward': TokenType.FORWARD,
    'back': TokenType.BACK,
    'left': TokenType.LEFT,
    'right': TokenType.RIGHT,
    'and': TokenType.AND,
    'or': TokenType.OR,
    'not': TokenType.NOT
};

/**
 * Token class with position tracking
 */
export class Token {
    constructor(type, value, line, column) {
        this.type = type;
        this.value = value;
        this.line = line;
        this.column = column;
    }

    toString() {
        return `Token(${this.type}, ${JSON.stringify(this.value)}, Ln ${this.line}, Col ${this.column})`;
    }
}

/**
 * Lexer Error with precise location
 */
export class LexerError extends Error {
    constructor(message, line, column, sourceSnippet = '') {
        super(message);
        this.name = 'LexerError';
        this.line = line;
        this.column = column;
        this.sourceSnippet = sourceSnippet;
    }

    format() {
        let result = `\n${this.name} at line ${this.line}, column ${this.column}:\n`;
        result += `  ${this.message}\n`;
        if (this.sourceSnippet) {
            result += `\n  ${this.line} | ${this.sourceSnippet}\n`;
            result += `      ${' '.repeat(this.column - 1)}^\n`;
        }
        return result;
    }
}

/**
 * Lexer class - Tokenizes source code
 */
export class Lexer {
    constructor(source) {
        this.source = source;
        this.pos = 0;
        this.line = 1;
        this.column = 1;
        this.tokens = [];
        this.currentLineStart = 0;
    }

    /**
     * Get current character
     */
    peek(offset = 0) {
        const pos = this.pos + offset;
        return pos < this.source.length ? this.source[pos] : '\0';
    }

    /**
     * Consume and return current character
     */
    advance() {
        const char = this.source[this.pos];
        this.pos++;

        if (char === '\n') {
            this.line++;
            this.column = 1;
            this.currentLineStart = this.pos;
        } else {
            this.column++;
        }

        return char;
    }

    /**
     * Get current line content for error messages
     */
    getCurrentLineContent() {
        let end = this.source.indexOf('\n', this.currentLineStart);
        if (end === -1) end = this.source.length;
        return this.source.slice(this.currentLineStart, end);
    }

    /**
     * Skip whitespace (except newlines)
     */
    skipWhitespace() {
        while (this.peek() === ' ' || this.peek() === '\t' || this.peek() === '\r') {
            this.advance();
        }
    }

    /**
     * Skip comment (# to end of line)
     */
    skipComment() {
        if (this.peek() === '#') {
            while (this.peek() !== '\n' && this.peek() !== '\0') {
                this.advance();
            }
        }
    }

    /**
     * Read a number literal
     */
    readNumber() {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (/[0-9]/.test(this.peek())) {
            value += this.advance();
        }

        // Handle decimal
        if (this.peek() === '.' && /[0-9]/.test(this.peek(1))) {
            value += this.advance(); // consume '.'
            while (/[0-9]/.test(this.peek())) {
                value += this.advance();
            }
        }

        return new Token(TokenType.NUMBER, parseFloat(value), startLine, startColumn);
    }

    /**
     * Read an identifier or keyword
     */
    readIdentifier() {
        const startLine = this.line;
        const startColumn = this.column;
        let value = '';

        while (/[a-zA-Z0-9_]/.test(this.peek())) {
            value += this.advance();
        }

        const lower = value.toLowerCase();
        const type = KEYWORDS[lower] || TokenType.IDENTIFIER;

        return new Token(type, value, startLine, startColumn);
    }

    /**
     * Read a string literal
     */
    readString() {
        const startLine = this.line;
        const startColumn = this.column;
        const quote = this.advance(); // consume opening quote
        let value = '';

        while (this.peek() !== quote && this.peek() !== '\0' && this.peek() !== '\n') {
            if (this.peek() === '\\') {
                this.advance(); // consume backslash
                const escaped = this.advance();
                switch (escaped) {
                    case 'n': value += '\n'; break;
                    case 't': value += '\t'; break;
                    case '\\': value += '\\'; break;
                    case '"': value += '"'; break;
                    case "'": value += "'"; break;
                    default: value += escaped;
                }
            } else {
                value += this.advance();
            }
        }

        if (this.peek() !== quote) {
            throw new LexerError(
                'Unterminated string literal',
                startLine,
                startColumn,
                this.getCurrentLineContent()
            );
        }

        this.advance(); // consume closing quote
        return new Token(TokenType.STRING, value, startLine, startColumn);
    }

    /**
     * Main tokenize method
     */
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
                this.tokens.push(new Token(TokenType.NEWLINE, '\\n', startLine, startColumn));
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
                this.tokens.push(new Token(TokenType.EQUALS, '==', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '!' && this.peek(1) === '=') {
                this.tokens.push(new Token(TokenType.NOT_EQUALS, '!=', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '<' && this.peek(1) === '=') {
                this.tokens.push(new Token(TokenType.LESS_EQ, '<=', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }
            if (char === '>' && this.peek(1) === '=') {
                this.tokens.push(new Token(TokenType.GREATER_EQ, '>=', startLine, startColumn));
                this.advance(); this.advance();
                continue;
            }

            // Single-character operators and punctuation
            switch (char) {
                case ':':
                    this.tokens.push(new Token(TokenType.COLON, ':', startLine, startColumn));
                    this.advance();
                    break;
                case '(':
                    this.tokens.push(new Token(TokenType.LPAREN, '(', startLine, startColumn));
                    this.advance();
                    break;
                case ')':
                    this.tokens.push(new Token(TokenType.RPAREN, ')', startLine, startColumn));
                    this.advance();
                    break;
                case '.':
                    this.tokens.push(new Token(TokenType.DOT, '.', startLine, startColumn));
                    this.advance();
                    break;
                case ',':
                    this.tokens.push(new Token(TokenType.COMMA, ',', startLine, startColumn));
                    this.advance();
                    break;
                case '<':
                    this.tokens.push(new Token(TokenType.LESS_THAN, '<', startLine, startColumn));
                    this.advance();
                    break;
                case '>':
                    this.tokens.push(new Token(TokenType.GREATER_THAN, '>', startLine, startColumn));
                    this.advance();
                    break;
                case '+':
                    this.tokens.push(new Token(TokenType.PLUS, '+', startLine, startColumn));
                    this.advance();
                    break;
                case '-':
                    this.tokens.push(new Token(TokenType.MINUS, '-', startLine, startColumn));
                    this.advance();
                    break;
                default:
                    throw new LexerError(
                        `Unexpected character: '${char}'`,
                        startLine,
                        startColumn,
                        this.getCurrentLineContent()
                    );
            }
        }

        // Add EOF token
        this.tokens.push(new Token(TokenType.EOF, null, this.line, this.column));

        // Filter out consecutive newlines
        return this.tokens.filter((token, i, arr) => {
            if (token.type === TokenType.NEWLINE) {
                // Keep first newline, skip if previous was also newline
                return i === 0 || arr[i - 1].type !== TokenType.NEWLINE;
            }
            return true;
        });
    }
}

export default Lexer;

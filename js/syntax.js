/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - SYNTAX HIGHLIGHTER
 * ═══════════════════════════════════════════════════════════════
 * Real-time syntax highlighting for Python and C++ modes
 */

/**
 * Token types and their CSS classes
 */
const TokenStyles = {
    KEYWORD: 'token-keyword',      // MOVE, TURN, COLLECT, etc
    CONTROL: 'token-control',      // IF, ELSE, LOOP, WHILE, END
    FUNCTION: 'token-function',    // scan, log
    STRING: 'token-string',        // "text"
    NUMBER: 'token-number',        // 123
    COMMENT: 'token-comment',      // # comment or // comment
    OPERATOR: 'token-operator',    // ==, !=, <, >, and, or
    VARIABLE: 'token-variable',    // energy, inventory
    DIRECTION: 'token-direction',  // forward, back, left, right
    PUNCTUATION: 'token-punctuation', // :, (, ), {, }, ;
    TYPE: 'token-type'             // int (C++ mode)
};

/**
 * Python-style keyword lists
 */
const PythonKeywords = {
    actions: ['MOVE', 'TURN', 'COLLECT', 'WAIT'],
    control: ['IF', 'ELIF', 'ELSE', 'LOOP', 'WHILE', 'END'],
    functions: ['scan', 'scan_left', 'scan_right', 'log'],
    operators: ['and', 'or', 'not'],
    directions: ['forward', 'back', 'left', 'right'],
    variables: ['energy', 'x', 'y', 'facing', 'inventory']
};

/**
 * C++ style keyword lists
 */
const CppKeywords = {
    actions: ['move_forward', 'move_back', 'turn_left', 'turn_right', 'collect', 'wait'],
    control: ['if', 'else', 'for', 'while'],
    functions: ['scan', 'scan_left', 'scan_right', 'log'],
    types: ['int', 'void', 'bool'],
    operators: ['&&', '||', '!'],
    directions: [],
    variables: ['energy', 'x', 'y', 'facing', 'inventory', 'true', 'false']
};

/**
 * Syntax Highlighter class
 */
export class SyntaxHighlighter {
    constructor() {
        this.overlay = null;
        this.editor = null;
        this.mode = 'python'; // 'python' or 'cpp'
    }

    /**
     * Initialize with editor element
     */
    init(editorId) {
        this.editor = document.getElementById(editorId);
        if (!this.editor) return;

        // Create highlighting overlay
        this.createOverlay();

        // Sync on input
        this.editor.addEventListener('input', () => this.highlight());
        this.editor.addEventListener('scroll', () => this.syncScroll());

        // Initial highlight
        this.highlight();
    }

    /**
     * Set syntax mode
     */
    setMode(mode) {
        this.mode = mode;
        this.highlight();
    }

    /**
     * Create overlay element for highlighting
     */
    createOverlay() {
        const container = this.editor.parentElement;

        // Create pre element for highlighted code
        this.overlay = document.createElement('pre');
        this.overlay.className = 'syntax-overlay';
        this.overlay.setAttribute('aria-hidden', 'true');

        // Insert before editor
        container.insertBefore(this.overlay, this.editor);

        // Make editor transparent background
        this.editor.classList.add('syntax-editor');
    }

    /**
     * Highlight the code
     */
    highlight() {
        if (!this.editor || !this.overlay) return;
        const code = this.editor.value;
        const highlighted = this.highlightCode(code);
        this.overlay.innerHTML = highlighted + '\n';
    }

    /**
     * Sync scroll position
     */
    syncScroll() {
        this.overlay.scrollTop = this.editor.scrollTop;
        this.overlay.scrollLeft = this.editor.scrollLeft;
    }

    /**
     * Apply syntax highlighting to code
     */
    highlightCode(code) {
        const lines = code.split('\n');
        return lines.map(line => this.highlightLine(line)).join('\n');
    }

    /**
     * Highlight a single line
     */
    highlightLine(line) {
        const commentChar = this.mode === 'cpp' ? '//' : '#';

        // Handle comments first
        const commentIndex = line.indexOf(commentChar);
        if (commentIndex === 0) {
            return `<span class="${TokenStyles.COMMENT}">${this.escapeHtml(line)}</span>`;
        }

        let result = '';
        let remaining = line;

        if (commentIndex > 0) {
            remaining = line.substring(0, commentIndex);
        }

        // Tokenize and highlight
        result = this.tokenizeAndHighlight(remaining);

        // Add comment if present
        if (commentIndex > 0) {
            result += `<span class="${TokenStyles.COMMENT}">${this.escapeHtml(line.substring(commentIndex))}</span>`;
        }

        return result;
    }

    /**
     * Tokenize and apply highlighting
     */
    tokenizeAndHighlight(text) {
        const keywords = this.mode === 'cpp' ? CppKeywords : PythonKeywords;

        // Regex patterns
        const patterns = [
            // Strings
            {
                regex: /"[^"]*"/g,
                class: TokenStyles.STRING
            },
            // Numbers
            {
                regex: /\b\d+\b/g,
                class: TokenStyles.NUMBER
            }
        ];

        // Add mode-specific patterns
        if (this.mode === 'cpp') {
            // C++ types
            if (keywords.types.length > 0) {
                patterns.push({
                    regex: new RegExp(`\\b(${keywords.types.join('|')})\\b`, 'g'),
                    class: TokenStyles.TYPE
                });
            }
            // C++ action keywords (functions)
            patterns.push({
                regex: new RegExp(`\\b(${keywords.actions.join('|')})\\b`, 'g'),
                class: TokenStyles.KEYWORD
            });
            // C++ control keywords
            patterns.push({
                regex: new RegExp(`\\b(${keywords.control.join('|')})\\b`, 'g'),
                class: TokenStyles.CONTROL
            });
            // C++ operators
            patterns.push({
                regex: /&&|\|\||!/g,
                class: TokenStyles.OPERATOR
            });
            // Comparison operators
            patterns.push({
                regex: /==|!=|<=|>=|<|>/g,
                class: TokenStyles.OPERATOR
            });
            // C++ punctuation
            patterns.push({
                regex: /[{}();,.+\-]/g,
                class: TokenStyles.PUNCTUATION
            });
        } else {
            // Python action keywords
            patterns.push({
                regex: new RegExp(`\\b(${keywords.actions.join('|')})\\b`, 'g'),
                class: TokenStyles.KEYWORD
            });
            // Python control keywords
            patterns.push({
                regex: new RegExp(`\\b(${keywords.control.join('|')})\\b`, 'g'),
                class: TokenStyles.CONTROL
            });
            // Python operators
            patterns.push({
                regex: /\b(and|or|not)\b|==|!=|<=|>=|<|>/g,
                class: TokenStyles.OPERATOR
            });
            // Python directions
            patterns.push({
                regex: new RegExp(`\\b(${keywords.directions.join('|')})\\b`, 'g'),
                class: TokenStyles.DIRECTION
            });
            // Python punctuation
            patterns.push({
                regex: /[:\(\)\.]/g,
                class: TokenStyles.PUNCTUATION
            });
        }

        // Functions (both modes)
        patterns.push({
            regex: new RegExp(`\\b(${keywords.functions.join('|')})\\b`, 'g'),
            class: TokenStyles.FUNCTION
        });

        // Variables (both modes)
        patterns.push({
            regex: new RegExp(`\\b(${keywords.variables.join('|')})\\b`, 'g'),
            class: TokenStyles.VARIABLE
        });

        // Build replacement map
        const replacements = [];
        let escaped = this.escapeHtml(text);

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                replacements.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                    class: pattern.class
                });
            }
        }

        // Sort by position (descending to replace from end)
        replacements.sort((a, b) => b.start - a.start);

        // Apply replacements
        let result = escaped;
        for (const r of replacements) {
            const before = result.substring(0, r.start);
            const token = this.escapeHtml(r.text);
            const after = result.substring(r.end);
            result = `${before}<span class="${r.class}">${token}</span>${after}`;
        }

        return result;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/ /g, '&nbsp;');
    }
}

export default SyntaxHighlighter;

/**
 * ═══════════════════════════════════════════════════════════════
 * AUTODRONE - CODE TEMPLATES
 * ═══════════════════════════════════════════════════════════════
 * Quick-insert code snippets and patterns for Python and C++ modes
 */

/**
 * Python-style template definitions
 */
export const PythonTemplates = {
    // Basic Action Templates
    basic: {
        name: '📦 Basic',
        templates: [
            {
                name: 'Move 3x',
                code: `LOOP 3:
    MOVE forward
END`
            },
            {
                name: 'Square Pattern',
                code: `LOOP 4:
    MOVE forward
    MOVE forward
    TURN right
END`
            },
            {
                name: 'Collect All',
                code: `LOOP 10:
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    END
END`
            }
        ]
    },

    // Control Flow Templates
    control: {
        name: '🔀 Control Flow',
        templates: [
            {
                name: 'IF Basic',
                code: `IF scan() == "crystal":
    MOVE forward
    COLLECT
END`
            },
            {
                name: 'IF-ELSE',
                code: `IF scan() == "wall":
    TURN right
ELSE:
    MOVE forward
END`
            },
            {
                name: 'IF-ELIF-ELSE',
                code: `IF scan() == "crystal":
    MOVE forward
    COLLECT
ELIF scan() == "wall":
    TURN right
ELSE:
    MOVE forward
END`
            }
        ]
    },

    // Loop Templates
    loops: {
        name: '🔁 Loops',
        templates: [
            {
                name: 'LOOP Basic',
                code: `LOOP 5:
    MOVE forward
END`
            },
            {
                name: 'WHILE Energy',
                code: `WHILE energy > 20:
    MOVE forward
END`
            },
            {
                name: 'WHILE Inventory',
                code: `WHILE inventory.crystal < 3:
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    ELSE:
        MOVE forward
    END
END`
            }
        ]
    },

    // Navigation Templates
    navigation: {
        name: '🧭 Navigation',
        templates: [
            {
                name: 'Wall Follower',
                code: `LOOP 20:
    IF scan() == "wall":
        TURN right
    ELSE:
        MOVE forward
    END
END`
            }
        ]
    },

    // Debug Templates
    debug: {
        name: '🔍 Debug',
        templates: [
            {
                name: 'Log Status',
                code: `log "Energy: " + energy
log "Crystals: " + inventory.crystal`
            }
        ]
    }
};

/**
 * C++ style template definitions
 */
export const CppTemplates = {
    // Basic Action Templates
    basic: {
        name: '📦 Basic',
        templates: [
            {
                name: 'Move 3x',
                code: `for (int i = 0; i < 3; i++) {
    move_forward();
}`
            },
            {
                name: 'Square Pattern',
                code: `for (int i = 0; i < 4; i++) {
    move_forward();
    move_forward();
    turn_right();
}`
            },
            {
                name: 'Collect All',
                code: `for (int i = 0; i < 10; i++) {
    if (scan() == "crystal") {
        move_forward();
        collect();
    }
}`
            }
        ]
    },

    // Control Flow Templates
    control: {
        name: '🔀 Control Flow',
        templates: [
            {
                name: 'if Basic',
                code: `if (scan() == "crystal") {
    move_forward();
    collect();
}`
            },
            {
                name: 'if-else',
                code: `if (scan() == "wall") {
    turn_right();
} else {
    move_forward();
}`
            },
            {
                name: 'if-else if-else',
                code: `if (scan() == "crystal") {
    move_forward();
    collect();
} else if (scan() == "wall") {
    turn_right();
} else {
    move_forward();
}`
            }
        ]
    },

    // Loop Templates
    loops: {
        name: '🔁 Loops',
        templates: [
            {
                name: 'for Loop',
                code: `for (int i = 0; i < 5; i++) {
    move_forward();
}`
            },
            {
                name: 'while Energy',
                code: `while (energy > 20) {
    move_forward();
}`
            },
            {
                name: 'while Inventory',
                code: `while (inventory.crystal < 3) {
    if (scan() == "crystal") {
        move_forward();
        collect();
    } else {
        move_forward();
    }
}`
            }
        ]
    },

    // Navigation Templates
    navigation: {
        name: '🧭 Navigation',
        templates: [
            {
                name: 'Wall Follower',
                code: `for (int i = 0; i < 20; i++) {
    if (scan() == "wall") {
        turn_right();
    } else {
        move_forward();
    }
}`
            }
        ]
    },

    // Debug Templates
    debug: {
        name: '🔍 Debug',
        templates: [
            {
                name: 'Log Status',
                code: `log("Energy: " + energy);
log("Crystals: " + inventory.crystal);`
            }
        ]
    }
};

/**
 * Template Manager class
 */
export class TemplateManager {
    constructor(editor) {
        this.editor = editor;
        this.dropdown = null;
        this.mode = 'python'; // 'python' or 'cpp'
    }

    /**
     * Set mode
     */
    setMode(mode) {
        this.mode = mode;
        this.updateMenu();
    }

    /**
     * Get current templates
     */
    getTemplates() {
        return this.mode === 'cpp' ? CppTemplates : PythonTemplates;
    }

    /**
     * Create dropdown UI
     */
    createDropdown(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        this.dropdown = document.createElement('div');
        this.dropdown.className = 'template-dropdown';
        this.dropdown.innerHTML = `
            <button class="template-btn" id="template-toggle">
                📋 Templates
            </button>
            <div class="template-menu hidden" id="template-menu">
                ${this.generateMenuHTML()}
            </div>
        `;

        container.appendChild(this.dropdown);

        // Setup event listeners
        const toggleBtn = document.getElementById('template-toggle');
        const menu = document.getElementById('template-menu');

        toggleBtn.addEventListener('click', () => {
            menu.classList.toggle('hidden');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target)) {
                menu.classList.add('hidden');
            }
        });

        // Template item clicks
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.template-item');
            if (item) {
                const category = item.dataset.category;
                const index = parseInt(item.dataset.index);
                this.insertTemplate(category, index);
                menu.classList.add('hidden');
            }
        });
    }

    /**
     * Update menu content
     */
    updateMenu() {
        const menu = document.getElementById('template-menu');
        if (menu) {
            menu.innerHTML = this.generateMenuHTML();
        }
    }

    /**
     * Generate menu HTML
     */
    generateMenuHTML() {
        let html = '';
        const templates = this.getTemplates();

        for (const [key, category] of Object.entries(templates)) {
            html += `<div class="template-category">
                <div class="template-category-name">${category.name}</div>`;

            category.templates.forEach((template, i) => {
                html += `<div class="template-item" data-category="${key}" data-index="${i}">
                    ${template.name}
                </div>`;
            });

            html += '</div>';
        }

        return html;
    }

    /**
     * Insert template into editor
     */
    insertTemplate(category, index) {
        const templates = this.getTemplates();
        const template = templates[category]?.templates[index];
        if (!template || !this.editor) return;

        const start = this.editor.selectionStart;
        const end = this.editor.selectionEnd;
        const value = this.editor.value;

        // Insert at cursor position
        const before = value.substring(0, start);
        const after = value.substring(end);
        const newValue = before + template.code + after;

        this.editor.value = newValue;
        this.editor.selectionStart = this.editor.selectionEnd = start + template.code.length;

        // Trigger input event
        this.editor.dispatchEvent(new Event('input'));
        this.editor.focus();
    }

    /**
     * Get all templates flat list
     */
    getAllTemplates() {
        const all = [];
        const templates = this.getTemplates();
        for (const [key, category] of Object.entries(templates)) {
            category.templates.forEach((t, i) => {
                all.push({
                    category: key,
                    categoryName: category.name,
                    index: i,
                    ...t
                });
            });
        }
        return all;
    }
}

export default TemplateManager;

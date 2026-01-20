# AutoDrone - Web Automation Game

A web-based automation game where you write scripts to control a drone in a fog-of-war world.

## 🚀 Quick Start

**Important**: This game uses ES Modules and must be served via a web server.

### Option 1: Using Node.js (Recommended)
```bash
# Install if needed, then serve
npx serve .

# Open browser to http://localhost:3000
```

### Option 2: Using Python
```bash
# Python 3
python -m http.server 8000

# Open browser to http://localhost:8000
```

### Option 3: Using VS Code
Install the "Live Server" extension and right-click `index.html` → Open with Live Server

---

## 🎮 How to Play

1. Write automation scripts in the editor (left panel)
2. Press **F5** or click **Run** to execute
3. Watch the drone navigate the grid (center panel)
4. Check console output and analysis (right panel)

---

## 📝 Script Language

```python
# Move the drone
MOVE forward
MOVE back
TURN left
TURN right

# Collect resources
COLLECT

# Control flow
LOOP 5:
    MOVE forward
END

IF scan() == "crystal":
    COLLECT
END

WHILE energy > 20:
    MOVE forward
END
```

See [SCRIPT_REFERENCE.md](docs/SCRIPT_REFERENCE.md) for full documentation.

---

## 🎯 Levels

1. **Tutorial** - Learn basic commands
2. **Automation 101** - Use loops efficiently
3. **Into the Unknown** - Navigate with fog of war
4. **Danger Zone** - Avoid hazards
5. **Resource Rush** - Collect multiple resource types

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F5 | Run script |
| F6 | Pause |
| F7 | Step (single instruction) |
| F8 | Stop |

---

## 🏗️ Architecture

```
theFarmer/
├── index.html      # Main HTML
├── css/style.css   # Cyberpunk styling
├── js/
│   ├── main.js     # App bootstrap
│   ├── lexer.js    # Tokenizer
│   ├── parser.js   # AST builder
│   ├── compiler.js # AST → Bytecode
│   ├── vm.js       # Virtual Machine
│   ├── game.js     # Game state
│   ├── renderer.js # Canvas rendering
│   ├── analysis.js # Scoring engine
│   ├── ui.js       # UI controller
│   └── levels.js   # Level definitions
└── docs/
    └── SCRIPT_REFERENCE.md
```

---

## 📊 Features

- **Real Virtual Machine** with instruction pointer and stack
- **Fog of War** exploration mechanics
- **Post-run Analysis** with efficiency scoring
- **Rewind/Replay** execution history
- **Safety Sandboxing** for infinite loop protection
- **Multiple Resource Types** and objectives

---

## License

MIT

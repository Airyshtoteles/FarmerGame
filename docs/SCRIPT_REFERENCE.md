# AutoDrone Script Reference

A complete guide to the AutoDrone scripting language.

---

## Actions

Actions cost energy and move/interact with the world.

| Command | Syntax | Energy Cost | Description |
|---------|--------|-------------|-------------|
| **MOVE** | `MOVE forward` / `MOVE back` | 2 | Move drone in direction |
| **TURN** | `TURN left` / `TURN right` | 1 | Rotate drone 90° |
| **COLLECT** | `COLLECT` | 3 | Pick up resource at current tile |
| **WAIT** | `WAIT` / `WAIT n` | 0 (+1 restore) | Wait and restore energy |

---

## Control Flow

### IF Statement
```
IF condition:
    # code when true
END

IF condition:
    # code when true
ELSE:
    # code when false
END

IF condition1:
    # first check
ELIF condition2:
    # second check
ELSE:
    # default
END
```

### LOOP (Fixed Iterations)
```
LOOP 5:
    MOVE forward
    TURN right
END
```

### WHILE (Conditional Loop)
```
WHILE energy > 10:
    MOVE forward
END
```

---

## Sensors

Sensors let you "see" the environment.

| Function | Cost | Cooldown | Returns |
|----------|------|----------|---------|
| `scan()` | 1 | 3 ticks | Tile type ahead |
| `scan_left()` | 1 | 3 ticks | Tile type to left |
| `scan_right()` | 1 | 3 ticks | Tile type to right |

**Return values**: `"empty"`, `"wall"`, `"crystal"`, `"data"`, `"hazard"`, `"charger"`, `"energy"`

---

## Variables (Read-Only)

| Variable | Type | Description |
|----------|------|-------------|
| `energy` | Number | Current energy (0-100) |
| `x` | Number | Drone X position |
| `y` | Number | Drone Y position |
| `facing` | String | `"north"`, `"east"`, `"south"`, `"west"` |
| `inventory.crystal` | Number | Crystals collected |
| `inventory.data` | Number | Data cores collected |

---

## Operators

### Comparison
- `==` equal
- `!=` not equal
- `<` less than
- `>` greater than
- `<=` less or equal
- `>=` greater or equal

### Logical
- `and` - both conditions true
- `or` - either condition true
- `not` - negate condition

### Arithmetic
- `+` addition
- `-` subtraction

---

## Logging

```
log "Hello World"
log "Energy: " + energy
log inventory.crystal
```

---

## Tile Types

| Tile | Emoji | Effect |
|------|-------|--------|
| Empty | ⬜ | Passable |
| Wall | ⬛ | Blocks movement |
| Crystal | 💎 | Collectible (+1 crystal) |
| Data Core | 📀 | Collectible (+1 data) |
| Energy Cell | 🔋 | Collectible (+10 energy) |
| Hazard | ⚠️ | -10 energy on contact |
| Charger | ⚡ | +20 energy, consumed |

---

## Example Scripts

### Basic Collection
```
MOVE forward
MOVE forward
COLLECT
TURN right
MOVE forward
COLLECT
```

### Loop with Scan
```
LOOP 10:
    IF scan() == "crystal":
        MOVE forward
        COLLECT
    ELIF scan() == "wall":
        TURN right
    ELSE:
        MOVE forward
    END
END
```

### Energy Management
```
WHILE energy > 20:
    IF scan() == "charger":
        MOVE forward
    ELIF scan() == "hazard":
        TURN left
    ELSE:
        MOVE forward
    END
    
    IF energy < 30:
        WAIT 5
    END
END
```

---

## Tips

1. **Plan your path** - Minimize turns to save energy
2. **Use scan() wisely** - It has a 3-tick cooldown
3. **Watch your energy** - WAIT restores 1 energy per tick
4. **Avoid hazards** - They drain 10 energy instantly
5. **Find chargers** - They restore 20 energy

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| F5 | Run script |
| F6 | Pause |
| F7 | Step (single instruction) |
| F8 | Stop |

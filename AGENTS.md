# AGENTS.md - Development Guide

## Project Overview

Chinese Chess (中国象棋) web application built with Python/Flask backend and vanilla JavaScript frontend.

## Build & Run Commands

### Installation
```bash
pip install -r requirements.txt
```

### Running the Server
```bash
# Recommended: GUI Controller (cross-platform)
python3 tools/controller.py

# Or: Management script
./scripts/manage.sh start   # Linux/macOS
scripts\manage.bat start    # Windows

# Or: Direct execution
python3 core/server.py
```

### Server Management
```bash
./scripts/manage.sh start|stop|restart|status|logs
```

### Testing
No formal test suite exists. Manual testing via browser at http://localhost:5000

### Running Single Tests
Manual API testing via curl:
```bash
# Create game
curl -X POST http://localhost:5000/api/games -H "Content-Type: application/json" -d '{"type":"pvai"}'

# Make move
curl -X POST http://localhost:5000/api/games/1/move -H "Content-Type: application/json" -d '{"from":[6,4],"to":[5,4]}'
```

## Code Style Guidelines

### Python Conventions

**Imports:**
- Standard library imports first (`os`, `sys`, `time`)
- Third-party imports second (`flask`, `flask_socketio`)
- Local imports last (relative imports like `.game` or absolute `from game import`)
- Use try/except for imports that need fallback for direct vs module execution

**Naming:**
- Classes: PascalCase (`ChineseChess`, `ChessAI`, `Database`)
- Functions/Methods: snake_case (`make_move`, `get_all_moves`, `is_valid_move`)
- Constants: UPPER_CASE (`RED`, `BLACK`, `PIECE_VALUES`)
- Private methods: Leading underscore (`_validate_king`, `_validate_horse`)

**Types & Documentation:**
- Type hints not currently used; add when extending code
- Docstrings for classes and public methods using triple-quoted strings
- Include `:param` and `:return` in docstrings for methods

**Error Handling:**
- Return tuple `(success: bool, message: str)` for operations that can fail
- Use appropriate HTTP status codes (400, 404) in API endpoints
- Catch specific exceptions; avoid bare `except:`

**Formatting:**
- 4-space indentation
- Blank lines between methods (2 in classes, 2 at module level)
- Line length: ~100 characters (soft limit)

### JavaScript Conventions

**Naming:**
- Variables: camelCase (`currentGameId`, `selectedPiece`, `validMoves`)
- Functions: camelCase (`initSounds`, `makeMove`, `renderPieces`)
- Constants: UPPER_CASE (`CELL_SIZE`, `BOARD_OFFSET_X`)
- Global state: module-level `let` variables

**Error Handling:**
- Use try/catch for async fetch operations
- Log errors to console; show user-friendly alerts
- Graceful degradation (e.g., sound play failures silently ignored)

**DOM Operations:**
- Cache DOM references when reused
- Use `document.createElementNS` for SVG elements
- Clean up event handlers and DOM elements on view changes

## Architecture

**Backend (core/):**
- `server.py` - Flask app, REST API, WebSocket handlers
- `game.py` - Game rules engine, move validation, board state
- `ai.py` - Minimax AI with Alpha-Beta pruning
- `database.py` - SQLite persistence layer

**Frontend (static/):**
- `game.js` - Game UI logic, WebSocket client, SVG board rendering
- `style.css` - Chinese-themed styling
- `sounds/` - Audio effects (click, move, capture, check)

## Key Patterns

**Game State:**
- Server maintains authoritative state in `games` dict
- Database persists all game state changes
- WebSocket broadcasts updates to connected clients

**Move Validation:**
- Server-side validation is authoritative
- Client-side validation for UX (prevents obviously invalid moves)
- Rules include: 憋马脚 (blocking horse), 塞象眼 (blocking elephant), 炮翻山 (cannon jump)

**AI Integration:**
- AI runs server-side in background threads
- `ai_move_task()` triggers next AI move after player move
- AIvAI mode: two AIs play alternately with threading

## Files to Modify for Common Tasks

**Add new game mode:** Modify `server.py` create_game(), add mode handling
**Change game rules:** Modify `game.py` validation methods
**Update AI behavior:** Modify `ai.py` evaluate() or get_best_move()
**UI changes:** Modify `static/game.js` and `templates/index.html`
**Database schema:** Modify `database.py` init_db()

## Important Notes

- Chinese comments throughout codebase are intentional
- Coordinate system: (row, col) where row 0 is top (black side), row 9 is bottom (red side)
- Piece notation: lowercase for black, UPPERCASE for red in FEN
- AI depth defaults to 3 ply (adjustable in ChessAI constructor)

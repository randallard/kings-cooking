# King's Cooking 🍳♟️

A custom chess variant board game built with React 19 + Vite 7 for GitHub Pages deployment. Developed using the **PRP (Product Requirement Prompt) Framework** for AI-assisted one-pass implementation.

## 🎮 Game Overview

**King's Cooking** is a unique chess variant where the goal isn't checkmate, but attending a party hosted by the losing king! The king with the most opponent pieces that made it to their castle has to host the feast.

### 🏠 Core Game Rules

- **3x3 Board**: Compact chess variant (initially)
- **No King in Play**: Kings stay at their castle, off the board
- **Starting Pieces**: Rook, Knight, Bishop per player (mirrored setup)
- **Standard Movement**: Normal chess rules (no en passant, no castling)
- **Scoring Mechanic**:
  - Pieces that reach opponent's court (off-board) = points for that player
  - Captured pieces go to their own king's court = no points
- **Victory**: Player with most pieces in opponent's court wins
- **Off-Board Movement Rules**:
  - **Rooks**: Can move straight off if path is clear
  - **Knights**: Can L-jump directly off-board
  - **Bishops**: Can move off only if diagonal crosses through middle column (col 1)

For complete rules, see **[PRD.md](PRD.md)** (Product Requirements Document)

---

## 📊 Development Progress

### ✅ Phase 1: Foundation (COMPLETE)
**Status**: Production-ready
**Documentation**: [PRPs/phase-1-foundation-react19.md](PRPs/phase-1-foundation-react19.md)

**Implemented**:
- ✅ React 19.2 + Vite 7 setup
- ✅ TypeScript strict mode
- ✅ Zod validation with branded types
- ✅ localStorage utilities
- ✅ Dark mode support
- ✅ Vitest 3.x + Playwright testing infrastructure
- ✅ ESLint + Prettier (zero warnings)

**Validation**:
- TypeScript: 0 errors
- ESLint: 0 warnings
- Build: Successful
- Tests: 15 passing

---

### ✅ Phase 2: Chess Engine (COMPLETE)
**Status**: Production-ready
**Documentation**: [PRPs/phase-2-chess-engine.md](PRPs/phase-2-chess-engine.md)

**Implemented**:
- ✅ `KingsChessEngine` class (428 lines)
- ✅ Piece movement logic (Rook, Knight, Bishop)
- ✅ Move validation with King's Cooking rules
- ✅ Off-board movement mechanics
- ✅ Capture mechanics (captured piece → own court)
- ✅ Victory condition detection
- ✅ Auto-scoring when team eliminated
- ✅ Move history tracking
- ✅ State serialization (JSON)

**Test Coverage**:
- **104 tests** written (all passing)
- **83.48%** chess engine coverage ✅
- **95.74%** overall coverage ✅

**Validation**:
- Level 1: TypeScript (0 errors) + ESLint (0 warnings) ✅
- Level 2: 104/104 tests passing with 80%+ coverage ✅
- Level 3: Production build successful (252KB) ✅

**Files Created**:
```
src/lib/chess/
├── KingsChessEngine.ts (428 lines)
├── types.ts (53 lines)
├── pieceMovement.ts (285 lines)
├── moveValidation.ts (213 lines)
├── victoryConditions.ts (162 lines)
├── KingsChessEngine.test.ts (28 tests)
├── pieceMovement.test.ts (33 tests)
└── victoryConditions.test.ts (10 tests)
```

---

### 🔄 Phase 3: URL Encoding & Security (TODO)
**Status**: Not started
**Estimated**: Week 2

**Scope**:
- AES encryption with crypto-js
- LZ-String compression
- URL encoding/decoding utilities
- Zod validators for URL parameters
- Player identity validation
- Turn sequence validation
- Browser refresh recovery

---

### 🔄 Phase 4: UI Components (TODO)
**Status**: Not started
**Estimated**: Week 3

**Scope**:
- GameBoard component
- Piece selection UI
- Move confirmation
- Victory screen
- Game controls

---

### 🔄 Phase 5: Game Flow Integration (TODO)
**Status**: Not started
**Estimated**: Week 3-4

**Scope**:
- Wire engine to React UI
- Hot-seat turn handoff
- URL generation on move
- Game history tracking

---

### 🔄 Phase 6: Polish & Optimization (TODO)
**Status**: Not started
**Estimated**: Week 4-5

**Scope**:
- Animations and transitions
- Sound effects
- Mobile optimization
- Performance tuning

---

### 🔄 Phase 7: Deployment (TODO)
**Status**: Not started
**Estimated**: Week 5

**Scope**:
- GitHub Pages deployment
- CI/CD pipeline
- Production testing
- Documentation

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20+)
- pnpm 8.15+ (package manager)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/kings-cooking.git
cd kings-cooking

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Run tests
pnpm test

# Run tests with coverage
pnpm run test:coverage

# Build for production
pnpm build
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (Vite) |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm test` | Run unit tests (Vitest) |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm test:e2e` | Run E2E tests (Playwright) |
| `pnpm run check` | TypeScript type checking |
| `pnpm run lint` | Lint with ESLint |
| `pnpm run lint:fix` | Fix ESLint issues |
| `pnpm run format` | Format with Prettier |
| `pnpm run validate` | Run all checks (type-check + lint + tests) |

---

## 🧪 Manual Verification

### Testing the Chess Engine

Create a test script to verify the engine works:

```bash
# Create test file
cat > test-engine.js << 'EOF'
import { KingsChessEngine } from './src/lib/chess/KingsChessEngine.js';
import { PlayerIdSchema } from './src/lib/validation/schemas.js';
import { v4 as uuid } from 'uuid';

const whitePlayer = {
  id: PlayerIdSchema.parse(uuid()),
  name: 'Alice',
};

const blackPlayer = {
  id: PlayerIdSchema.parse(uuid()),
  name: 'Bob',
};

const engine = new KingsChessEngine(whitePlayer, blackPlayer);

console.log('Initial state:', engine.getGameState());

// Move 1: White rook forward
console.log('\n--- Move 1: White rook forward ---');
let result = engine.makeMove([2, 0], [1, 0]);
console.log('Result:', result.success ? 'Success' : result.error);

// Move 2: Black rook forward
console.log('\n--- Move 2: Black rook forward ---');
result = engine.makeMove([0, 0], [1, 1]);
console.log('Result:', result.success ? 'Success' : result.error);

console.log('\nFinal state:', engine.getGameState());
console.log('\nVictory check:', engine.checkGameEnd());
EOF

# Run with Node (requires ES modules support)
node --input-type=module test-engine.js
```

### Testing Individual Piece Movement

```typescript
import { KingsChessEngine } from './src/lib/chess/KingsChessEngine';

const engine = new KingsChessEngine(whitePlayer, blackPlayer);

// Test rook movement
console.log('Rook valid moves:', engine.getValidMoves([2, 0]));

// Test knight movement
console.log('Knight valid moves:', engine.getValidMoves([2, 1]));

// Test bishop movement
console.log('Bishop valid moves:', engine.getValidMoves([2, 2]));
```

### Testing Off-Board Moves

```typescript
// Clear path for white rook to move off-board
engine.makeMove([2, 0], [1, 0]); // White rook forward
engine.makeMove([0, 1], [2, 0]); // Black knight moves away
engine.makeMove([1, 0], [0, 0]); // White rook to edge
engine.makeMove([2, 0], [0, 1]); // Black knight moves again

// Now white rook can move off-board
const result = engine.makeMove([0, 0], 'off_board');
console.log('Off-board result:', result.success); // Should be true

const state = engine.getGameState();
console.log('White court (scored):', state.whiteCourt); // Should have 1 rook
```

### Testing Victory Conditions

```typescript
// Simulate game ending
const state = engine.getGameState();

// Manually set courts for testing
state.whiteCourt = [
  { type: 'rook', owner: 'white', position: null, moveCount: 3, id: uuid() },
  { type: 'knight', owner: 'white', position: null, moveCount: 2, id: uuid() },
];

state.blackCourt = [
  { type: 'bishop', owner: 'black', position: null, moveCount: 4, id: uuid() },
];

state.board = [[null, null, null], [null, null, null], [null, null, null]];

const engine2 = new KingsChessEngine(whitePlayer, blackPlayer, state);
const victory = engine2.checkGameEnd();

console.log('Victory result:', victory);
// Should show: { gameOver: true, winner: 'white', score: { white: 2, black: 1 } }
```

### Verifying Test Coverage

```bash
# Run coverage report
pnpm run test:coverage

# Expected output:
# src/lib/chess: 83.48%+ coverage
# Overall: 95.74%+ coverage

# View detailed HTML report
open coverage/index.html
```

---

## 🛠️ Technical Stack

### Core
- **React 19.1.1** (with React Compiler)
- **Vite 7.0** (build tool)
- **TypeScript 5.9** (strict mode)
- **Zod 3.22** (runtime validation)
- **UUID 13.0** (unique identifiers)

### Testing
- **Vitest 3.0** (unit tests)
- **Playwright 1.40** (E2E tests)
- **@testing-library/react 16.0** (React testing)
- **Happy DOM 15.0** (DOM environment)

### Development
- **ESLint 9.36** (linting, zero warnings enforced)
- **Prettier 3.1** (code formatting)
- **pnpm 8.15** (package manager)

---

## 📚 Development Methodology: PRP Framework

This project uses the **PRP (Product Requirement Prompt) Framework** for AI-assisted development.

### What is PRP?

**PRP = PRD + curated codebase intelligence + agent/runbook**

A PRP is a structured prompt that provides AI coding agents with everything needed to deliver production-ready code on the first pass.

### Key PRP Principles

1. **Context is King**: Include ALL necessary documentation, examples, and gotchas
2. **Validation Loops**: Provide executable tests/lints the AI can run and fix
3. **Information Dense**: Use keywords and patterns from the codebase
4. **Progressive Success**: Start simple, validate, then enhance

### PRP Structure

```markdown
## Goal
Specific end state and deliverables

## Why
Business value and user impact

## What
User-visible behavior and technical requirements

## All Needed Context
- Documentation URLs
- Code examples
- Gotchas and pitfalls
- Patterns to follow

## Implementation Blueprint
Detailed pseudocode and task breakdown

## Validation Loop
Level 1: Syntax & Style
Level 2: Unit Tests
Level 3: Integration Tests
Level 4: Manual Verification
```

### Available PRPs

- **[PRD.md](PRD.md)** - Complete Product Requirements Document
- **[Phase 1 PRP](PRPs/phase-1-foundation-react19.md)** - Foundation setup
- **[Phase 2 PRP](PRPs/phase-2-chess-engine.md)** - Chess engine implementation
- Phase 3-7 PRPs (coming soon)

### Using PRPs

```bash
# Execute a PRP using Claude Code
/prp-base-execute PRPs/phase-2-chess-engine.md

# Or use the runner script
uv run PRPs/scripts/prp_runner.py --prp phase-2-chess-engine --interactive
```

---

## 📁 Project Structure

```
kings-cooking/
├── PRPs/                          # Product Requirement Prompts
│   ├── phase-1-foundation-react19.md
│   ├── phase-2-chess-engine.md
│   ├── templates/                 # PRP templates
│   ├── scripts/                   # PRP runner
│   └── ai_docs/                   # Curated documentation
├── .claude/
│   ├── commands/                  # Claude Code commands
│   └── settings.local.json        # Tool permissions
├── src/
│   ├── lib/
│   │   ├── chess/                 # Phase 2: Chess engine
│   │   │   ├── KingsChessEngine.ts
│   │   │   ├── types.ts
│   │   │   ├── pieceMovement.ts
│   │   │   ├── moveValidation.ts
│   │   │   ├── victoryConditions.ts
│   │   │   ├── KingsChessEngine.test.ts
│   │   │   ├── pieceMovement.test.ts
│   │   │   └── victoryConditions.test.ts
│   │   ├── storage/               # Phase 1: localStorage utilities
│   │   │   ├── localStorage.ts
│   │   │   └── localStorage.test.ts
│   │   └── validation/            # Phase 1: Zod schemas
│   │       ├── schemas.ts
│   │       └── schemas.test.ts
│   ├── App.tsx                    # Phase 1: Demo app
│   ├── App.test.tsx
│   ├── main.tsx
│   └── index.css
├── CLAUDE.md                      # Project instructions for Claude
├── PRD.md                         # Product Requirements Document
├── README.md                      # This file
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── tsconfig.json
```

---

## 🔐 Type Safety

This project enforces **strict TypeScript** with:

- `strict: true`
- `noImplicitAny: true`
- `strictNullChecks: true`
- `noUncheckedIndexedAccess: true`
- `exactOptionalPropertyTypes: true`

All external data is validated with **Zod** at runtime:

```typescript
// Branded types prevent mixing IDs
const gameId: GameId = GameIdSchema.parse(uuid());
const playerId: PlayerId = PlayerIdSchema.parse(uuid());

// Full game state validation
const state = GameStateSchema.parse(externalData);
```

---

## 🧪 Testing Strategy

### Test Pyramid

- **Unit Tests** (104 tests): Piece movement, validation, game logic
- **Integration Tests** (TODO): Complete game flows
- **E2E Tests** (TODO): UI interactions

### TDD Red-Green-Refactor

1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### Coverage Requirements

- **Minimum 80%** across all test types
- **Phase 2 achieved**: 83.48% engine coverage, 95.74% overall

---

## 🎨 Code Style

- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **ESLint**: Zero warnings enforced
- **Prettier**: Consistent formatting
- **JSDoc**: All public APIs documented

---

## 📖 Documentation

- **[PRD.md](PRD.md)** - Complete game rules and technical architecture
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines for AI agents
- **[Phase 1 PRP](PRPs/phase-1-foundation-react19.md)** - Foundation implementation
- **[Phase 2 PRP](PRPs/phase-2-chess-engine.md)** - Chess engine implementation
- **Type Definitions** - All code includes TypeScript types and JSDoc

---

## 🤝 Contributing

This project is built using AI-assisted development with the PRP framework. To contribute:

1. Read **[CLAUDE.md](CLAUDE.md)** for project guidelines
2. Review relevant PRPs in **PRPs/** directory
3. Follow TDD Red-Green-Refactor methodology
4. Ensure 80%+ test coverage
5. Pass all validation gates (TypeScript + ESLint + tests + build)

---

## 📄 License

MIT License

---

## 🙏 Acknowledgments

Built using the **PRP (Product Requirement Prompt) Framework** by [@Wirasm](https://github.com/Wirasm).

If you find value in this methodology, consider:
👉 **Buy me a coffee:** https://coff.ee/wirasm

---

**Current Status**: Phase 2 Complete ✅ | Next: Phase 3 (URL Encoding & Security)

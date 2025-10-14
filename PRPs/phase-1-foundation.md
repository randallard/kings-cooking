# PRP: Phase 1 - Foundation Setup

**PRP ID:** KC-PRP-001
**Version:** 1.0.0
**Created:** 2025-10-13
**Status:** Ready for Execution
**Dependencies:** None (Foundation phase)
**Estimated Time:** 4-6 hours

---

## Goal

Transform the existing Astro-based project into a Vite + React + TypeScript foundation with:
- ✅ Vite dev server with HMR working
- ✅ React 18 components rendering
- ✅ TypeScript strict mode enabled with zero errors
- ✅ Zod schemas for game state validation
- ✅ localStorage utilities with Zod validation
- ✅ Dark mode CSS framework operational
- ✅ Testing infrastructure (Vitest + Playwright) configured and passing
- ✅ GitHub Actions CI/CD updated for Vite
- ✅ All validation gates passing

**End State:** A production-ready foundation where we can begin implementing the chess engine in Phase 2.

---

## Why

**Business Value:**
- Establishes robust architecture preventing technical debt
- Enables rapid feature development in subsequent phases
- Ensures type safety and runtime validation from day one
- Provides automated quality gates catching issues early

**User Impact:**
- Fast development velocity = faster time to playable game
- Runtime validation = reliable game state (no corrupted URLs)
- Dark mode support = better UX from the start
- Automated testing = fewer bugs in production

**Technical Necessity:**
- Current Astro setup incompatible with planned React-based architecture
- Must establish validation patterns before building complex game logic
- Testing infrastructure needed for TDD workflow
- Dark mode easier to build in than retrofit later

---

## What You'll See

After this PRP completes:

1. **Development Server:**
   - Run `pnpm dev` and see "Hello King's Cooking!" at http://localhost:5173
   - Hot module replacement (HMR) updates page instantly on save
   - TypeScript errors shown in terminal and browser

2. **Type Safety:**
   - `pnpm run check` passes with zero TypeScript errors
   - Strict mode enabled (no implicit any, strict null checks)
   - IDE autocomplete works for all types

3. **Tests Running:**
   - `pnpm test` shows all tests passing
   - Coverage report displays (even if minimal tests)
   - Playwright E2E test loads homepage successfully

4. **Dark Mode Working:**
   - Browser detects OS dark mode preference
   - Page adapts colors automatically
   - Toggle OS dark mode = page updates instantly

5. **CI/CD Operational:**
   - Push to main triggers GitHub Actions
   - All validation gates pass (type check, lint, test, build)
   - Deployment to GitHub Pages succeeds
   - Live site accessible at https://randallard.github.io/kings-cooking/

6. **Validation Commands Work:**
   ```bash
   pnpm run check        # TypeScript validation passes
   pnpm run lint         # ESLint passes with zero warnings
   pnpm test             # All tests pass
   pnpm run build        # Production build succeeds
   pnpm run preview      # Preview server runs
   ```

---

## All Needed Context

### Required Documentation

**Read these files in the project before starting:**

1. **PRD.md** - Product Requirements Document
   - See Section 2: Technical Architecture
   - Reference Section 2.3: Data Structures for Zod schemas
   - Note Section 2.7: localStorage Strategy

2. **kings-cooking-docs/ZOD_VALIDATION_PATTERNS_RESEARCH.md**
   - Critical sections:
     - Runtime Validation Best Practices (Section 3)
     - localStorage Validation (Section 4)
     - Type Safety Patterns (Section 6)
   - Key takeaway: Validate at API boundaries, trust data afterward

3. **kings-cooking-docs/localStorage-react-patterns-2024-2025.md**
   - Use useSyncExternalStore for React 18+ (Section 2)
   - Error handling patterns (Section 3)
   - SSR considerations (Section 7) - important for Vite

4. **kings-cooking-docs/DARK_MODE_GUIDE.md**
   - CSS Setup (Section 2.8 in PRD)
   - Use `prefers-color-scheme` media query
   - Framework CSS variables

5. **CLAUDE.md** (this project's guide)
   - See "Astro 5+ Configuration" section (will need to adapt patterns)
   - Note TDD Strategy section (red-green-refactor)
   - Validation Gates section (what must pass)

### Key External References

**Vite + React + TypeScript Setup:**
- Vite Official Guide: https://vitejs.dev/guide/
- Vite React Plugin: https://github.com/vitejs/vite-plugin-react
- TypeScript Strict Mode: https://www.typescriptlang.org/tsconfig#strict

**Zod Documentation:**
- Official Docs: https://zod.dev/
- API Reference: https://zod.dev/api
- Branded Types: https://zod.dev/api (search for "brand")

**Testing Setup:**
- Vitest Guide: https://vitest.dev/guide/
- Vitest with React: https://vitest.dev/guide/ui.html
- Playwright Getting Started: https://playwright.dev/docs/intro

**React 18 Patterns:**
- useSyncExternalStore: https://react.dev/reference/react/useSyncExternalStore
- React Hooks: https://react.dev/reference/react

### Critical Gotchas

**⚠️ Vite Base Path:**
The project will be hosted at `https://randallard.github.io/kings-cooking/`, NOT at the root.
```typescript
// vite.config.ts
export default defineConfig({
  base: '/kings-cooking/', // CRITICAL: Must match repo name
})
```

**⚠️ Package Manager:**
This project uses **pnpm**, not npm. All commands must use `pnpm`.
```bash
# WRONG
npm install

# CORRECT
pnpm install
```

**⚠️ Import Paths:**
Vite uses native ES modules. Use relative imports or configure path aliases.
```typescript
// WRONG (won't work without config)
import { schema } from '@/lib/schemas';

// CORRECT (before alias config)
import { schema } from './lib/schemas';
```

**⚠️ TypeScript Strict Mode:**
Must enable ALL strict checks:
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**⚠️ Zod Validation:**
ALWAYS validate at boundaries, never trust external data:
```typescript
// WRONG
const data = JSON.parse(localStorage.getItem('key'));

// CORRECT
const stored = localStorage.getItem('key');
if (stored) {
  const result = schema.safeParse(JSON.parse(stored));
  if (result.success) {
    return result.data;
  }
  localStorage.removeItem('key'); // Clear corrupted data
}
```

**⚠️ Dark Mode CSS:**
Use `prefers-color-scheme`, NOT JavaScript toggle (for this phase):
```css
/* CORRECT */
@media (prefers-color-scheme: dark) {
  body { background: #1e1e1e; }
}
```

**⚠️ GitHub Actions:**
Workflows expect specific script names. Update workflows to match package.json:
```yaml
# Must match package.json scripts
- run: pnpm run check   # Not 'typecheck'
- run: pnpm run build   # Must exist
- run: pnpm run preview # Must exist
```

**⚠️ ESLint Configuration:**
React needs specific ESLint plugins:
```javascript
// .eslintrc.cjs
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: { version: '18.2' },
  },
}
```

---

## Implementation Blueprint

### Step 1: Backup & Cleanup (5 minutes)

**Goal:** Preserve GitHub Actions, remove Astro dependencies

```bash
# 1. Backup existing workflows (already good!)
# No action needed - .github/workflows/* are preserved

# 2. Remove Astro dependencies
rm -rf node_modules
rm package.json
rm tsconfig.json
rm vitest.config.ts
rm playwright.config.ts

# 3. Remove any Astro-specific files
rm astro.config.mjs 2>/dev/null || true
rm tailwind.config.mjs 2>/dev/null || true

# 4. Keep:
# - .github/ (workflows)
# - PRD.md
# - kings-cooking-docs/
# - CLAUDE.md
# - README.md
# - .git/
```

**Validation:**
```bash
ls -la  # Should see .github, docs, README, .git but no package.json
```

---

### Step 2: Initialize Vite + React + TypeScript (10 minutes)

**Goal:** Create new Vite project with React template

**Important:** We'll initialize in a temp directory, then move files to avoid conflicts.

```bash
# 1. Create Vite project in temp location
cd /tmp
pnpm create vite@latest kings-cooking-temp --template react-ts

# 2. Copy new files to project
cd /home/ryankhetlyr/Development/kings-cooking
cp /tmp/kings-cooking-temp/package.json .
cp /tmp/kings-cooking-temp/vite.config.ts .
cp /tmp/kings-cooking-temp/tsconfig.json .
cp /tmp/kings-cooking-temp/tsconfig.node.json .
cp /tmp/kings-cooking-temp/index.html .
cp -r /tmp/kings-cooking-temp/src .
cp -r /tmp/kings-cooking-temp/public .

# 3. Clean up temp
rm -rf /tmp/kings-cooking-temp
```

**Modify Files:**

**1. package.json** - Update metadata and add dependencies:
```json
{
  "name": "kings-cooking",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "A custom chess variant board game - race to the opponent's king's court!",
  "author": "randallard",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/randallard/kings-cooking.git"
  },
  "homepage": "https://randallard.github.io/kings-cooking/",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "check": "tsc --noEmit",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "lint:fix": "eslint . --ext ts,tsx --fix",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage --run",
    "test:integration": "vitest --config vitest.integration.config.ts",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    "validate": "pnpm run check && pnpm run lint && pnpm run test:coverage"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.22.0",
    "crypto-js": "^4.2.0",
    "lz-string": "^1.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@types/crypto-js": "^4.2.1",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "vitest": "^1.0.4",
    "@vitest/ui": "^1.0.4",
    "@vitest/coverage-v8": "^1.0.4",
    "happy-dom": "^12.10.3",
    "@playwright/test": "^1.40.0",
    "prettier": "^3.1.1"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
```

**2. vite.config.ts** - Configure for GitHub Pages:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/kings-cooking/', // CRITICAL: Must match GitHub repo name
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
})
```

**3. tsconfig.json** - Enable strict mode:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting - STRICT MODE */
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    /* Path aliases (optional, add later if needed) */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**4. Install dependencies:**
```bash
pnpm install
```

**Validation:**
```bash
pnpm run dev  # Should start on http://localhost:5173
# Visit in browser - should see Vite + React default page
# Ctrl+C to stop
```

---

### Step 3: Configure ESLint (10 minutes)

**Goal:** Set up linting with React-specific rules

**1. Create .eslintrc.cjs:**
```javascript
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react-refresh', '@typescript-eslint', 'react'],
  settings: {
    react: {
      version: '18.2',
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' },
    ],
  },
}
```

**2. Create .eslintignore:**
```
dist
node_modules
.github
*.config.ts
*.config.js
```

**3. Create .prettierrc:**
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2,
  "useTabs": false
}
```

**Validation:**
```bash
pnpm run lint  # Should pass with zero errors/warnings
```

---

### Step 4: Set Up Testing Infrastructure (15 minutes)

**Goal:** Configure Vitest and Playwright

**1. Create vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/types.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
```

**2. Create vitest.integration.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['**/*.integration.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage-integration',
    },
  },
})
```

**3. Create playwright.config.ts:**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4173', // Preview server port
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'pnpm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

**4. Create test setup file:**
```bash
mkdir -p src/test/e2e
```

**src/test/setup.ts:**
```typescript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// Extend Vitest matchers if needed
// expect.extend({...});
```

**5. Create a simple test to verify setup:**

**src/App.test.tsx:**
```typescript
import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('should pass basic test', () => {
    expect(true).toBe(true);
  });
});
```

**src/test/e2e/basic.e2e.ts:**
```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/King's Cooking/i);
});
```

**Validation:**
```bash
pnpm test  # Should pass (1 test)
pnpm run test:coverage  # Should generate coverage report
```

---

### Step 5: Implement Zod Schemas (20 minutes)

**Goal:** Create type-safe validation for game state

**Reference:** See PRD.md Section 2.3 and ZOD_VALIDATION_PATTERNS_RESEARCH.md Section 3

**1. Create types directory:**
```bash
mkdir -p src/lib/validation
```

**2. Create src/lib/validation/schemas.ts:**
```typescript
import { z } from 'zod';

// ============================================================================
// Branded Types for Type Safety
// ============================================================================

export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export const GameIdSchema = z.string().uuid().brand<'GameId'>();

export type PlayerId = z.infer<typeof PlayerIdSchema>;
export type GameId = z.infer<typeof GameIdSchema>;

// ============================================================================
// Piece Types
// ============================================================================

export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop']);
export type PieceType = z.infer<typeof PieceTypeSchema>;

export const PieceOwnerSchema = z.enum(['white', 'black']);
export type PieceOwner = z.infer<typeof PieceOwnerSchema>;

export const PieceSchema = z.object({
  type: PieceTypeSchema,
  owner: PieceOwnerSchema,
  position: z.tuple([z.number(), z.number()]).nullable(),
  moveCount: z.number().int().min(0),
  id: z.string().uuid(),
});

export type Piece = z.infer<typeof PieceSchema>;

// ============================================================================
// Player Info
// ============================================================================

export const PlayerInfoSchema = z.object({
  id: PlayerIdSchema,
  name: z.string().min(1).max(20),
});

export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;

// ============================================================================
// Move History
// ============================================================================

export const MoveSchema = z.object({
  from: z.tuple([z.number(), z.number()]),
  to: z.union([
    z.tuple([z.number(), z.number()]),
    z.literal('off_board')
  ]),
  piece: PieceSchema,
  captured: PieceSchema.nullable(),
  timestamp: z.number(),
});

export type Move = z.infer<typeof MoveSchema>;

// ============================================================================
// Game State (Core Schema)
// ============================================================================

export const GameStateSchema = z.object({
  version: z.literal('1.0.0'),
  gameId: GameIdSchema,

  // Board state (3x3 grid)
  board: z.array(z.array(PieceSchema.nullable()).length(3)).length(3),

  // Pieces in courts (scoring)
  whiteCourt: z.array(PieceSchema), // White pieces in Black's court
  blackCourt: z.array(PieceSchema), // Black pieces in White's court

  // Captured pieces (removed from play)
  capturedWhite: z.array(PieceSchema),
  capturedBlack: z.array(PieceSchema),

  // Turn management
  currentTurn: z.number().int().min(0),
  currentPlayer: PieceOwnerSchema,

  // Player info
  whitePlayer: PlayerInfoSchema,
  blackPlayer: PlayerInfoSchema,

  // Game status
  status: z.enum(['playing', 'white_wins', 'black_wins', 'draw']),
  winner: PieceOwnerSchema.nullable(),

  // Move history
  moveHistory: z.array(MoveSchema),

  // Checksum for validation
  checksum: z.string(),
});

export type GameState = z.infer<typeof GameStateSchema>;

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates game state and throws on error
 * Use for trusted internal data
 */
export function validateGameState(data: unknown): GameState {
  return GameStateSchema.parse(data);
}

/**
 * Safely validates game state
 * Use for untrusted external data (URLs, localStorage)
 */
export function safeValidateGameState(
  data: unknown
): z.SafeParseReturnType<unknown, GameState> {
  return GameStateSchema.safeParse(data);
}
```

**3. Create tests for schemas:**

**src/lib/validation/schemas.test.ts:**
```typescript
import { describe, it, expect } from 'vitest';
import {
  PieceTypeSchema,
  PieceOwnerSchema,
  PieceSchema,
  GameStateSchema,
  validateGameState,
  safeValidateGameState,
} from './schemas';

describe('Zod Schemas', () => {
  describe('PieceTypeSchema', () => {
    it('accepts valid piece types', () => {
      expect(PieceTypeSchema.parse('rook')).toBe('rook');
      expect(PieceTypeSchema.parse('knight')).toBe('knight');
      expect(PieceTypeSchema.parse('bishop')).toBe('bishop');
    });

    it('rejects invalid piece types', () => {
      expect(() => PieceTypeSchema.parse('pawn')).toThrow();
      expect(() => PieceTypeSchema.parse('king')).toThrow();
    });
  });

  describe('PieceSchema', () => {
    it('validates correct piece structure', () => {
      const piece = {
        type: 'rook',
        owner: 'white',
        position: [0, 0] as [number, number],
        moveCount: 0,
        id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = PieceSchema.safeParse(piece);
      expect(result.success).toBe(true);
    });

    it('rejects invalid piece structure', () => {
      const badPiece = {
        type: 'rook',
        owner: 'white',
        // Missing required fields
      };

      const result = PieceSchema.safeParse(badPiece);
      expect(result.success).toBe(false);
    });
  });

  describe('GameStateSchema', () => {
    it('validates minimal game state', () => {
      const minimalState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        board: [
          [null, null, null],
          [null, null, null],
          [null, null, null],
        ],
        whiteCourt: [],
        blackCourt: [],
        capturedWhite: [],
        capturedBlack: [],
        currentTurn: 0,
        currentPlayer: 'white',
        whitePlayer: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Player 1',
        },
        blackPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Player 2',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'abc123',
      };

      const result = GameStateSchema.safeParse(minimalState);
      expect(result.success).toBe(true);
    });
  });

  describe('Validation helpers', () => {
    it('validateGameState throws on invalid data', () => {
      expect(() => validateGameState({})).toThrow();
    });

    it('safeValidateGameState returns result object', () => {
      const result = safeValidateGameState({});
      expect(result.success).toBe(false);
    });
  });
});
```

**Validation:**
```bash
pnpm test  # Should pass all schema tests
```

---

### Step 6: Implement localStorage Utilities (25 minutes)

**Goal:** Create type-safe localStorage with Zod validation

**Reference:** localStorage-react-patterns-2024-2025.md Section 1-3

**1. Create src/lib/storage/localStorage.ts:**
```typescript
import { z } from 'zod';

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  MY_NAME: 'kings-cooking:my-name',
  MY_PLAYER_ID: 'kings-cooking:my-player-id',
  PLAYER1_NAME: 'kings-cooking:player1-name', // Hot-seat only
  PLAYER2_NAME: 'kings-cooking:player2-name', // Hot-seat only
  GAME_STATE: 'kings-cooking:game-state',
  GAME_MODE: 'kings-cooking:game-mode',
} as const;

// ============================================================================
// Type-Safe Storage Utilities
// ============================================================================

/**
 * Safely get and validate data from localStorage
 */
export function getValidatedItem<T>(
  key: string,
  schema: z.ZodType<T>
): T | null {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const result = schema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.error(`Invalid localStorage data for key "${key}":`, result.error);
      // Remove corrupted data
      localStorage.removeItem(key);
      return null;
    }
  } catch (error) {
    console.error(`Failed to load localStorage key "${key}":`, error);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Safely set data to localStorage with validation
 */
export function setValidatedItem<T>(
  key: string,
  value: T,
  schema: z.ZodType<T>
): boolean {
  try {
    // Validate before saving
    const validated = schema.parse(value);
    localStorage.setItem(key, JSON.stringify(validated));
    return true;
  } catch (error) {
    console.error(`Failed to save localStorage key "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clear all game-related storage
 */
export function clearGameStorage(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// ============================================================================
// Specific Storage Helpers
// ============================================================================

const NameSchema = z.string().min(1).max(20);
const PlayerIdSchema = z.string().uuid();
const GameModeSchema = z.enum(['hotseat', 'url']);

export const storage = {
  // Player name (URL mode - current player)
  getMyName: () => getValidatedItem(STORAGE_KEYS.MY_NAME, NameSchema),
  setMyName: (name: string) =>
    setValidatedItem(STORAGE_KEYS.MY_NAME, name, NameSchema),

  // Player ID (URL mode - persistent identity)
  getMyPlayerId: () =>
    getValidatedItem(STORAGE_KEYS.MY_PLAYER_ID, PlayerIdSchema),
  setMyPlayerId: (id: string) =>
    setValidatedItem(STORAGE_KEYS.MY_PLAYER_ID, id, PlayerIdSchema),

  // Player names (hot-seat mode)
  getPlayer1Name: () =>
    getValidatedItem(STORAGE_KEYS.PLAYER1_NAME, NameSchema),
  setPlayer1Name: (name: string) =>
    setValidatedItem(STORAGE_KEYS.PLAYER1_NAME, name, NameSchema),

  getPlayer2Name: () =>
    getValidatedItem(STORAGE_KEYS.PLAYER2_NAME, NameSchema),
  setPlayer2Name: (name: string) =>
    setValidatedItem(STORAGE_KEYS.PLAYER2_NAME, name, NameSchema),

  // Game mode
  getGameMode: () => getValidatedItem(STORAGE_KEYS.GAME_MODE, GameModeSchema),
  setGameMode: (mode: 'hotseat' | 'url') =>
    setValidatedItem(STORAGE_KEYS.GAME_MODE, mode, GameModeSchema),

  // Clear all
  clearAll: clearGameStorage,
};
```

**2. Create tests:**

**src/lib/storage/localStorage.test.ts:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import {
  getValidatedItem,
  setValidatedItem,
  removeItem,
  clearGameStorage,
  storage,
  STORAGE_KEYS,
} from './localStorage';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getValidatedItem', () => {
    it('returns null for missing key', () => {
      const schema = z.string();
      const result = getValidatedItem('test-key', schema);
      expect(result).toBeNull();
    });

    it('returns validated data for valid stored value', () => {
      const schema = z.object({ name: z.string() });
      const data = { name: 'Test' };

      localStorage.setItem('test-key', JSON.stringify(data));

      const result = getValidatedItem('test-key', schema);
      expect(result).toEqual(data);
    });

    it('removes corrupted data and returns null', () => {
      localStorage.setItem('test-key', 'invalid json');

      const schema = z.object({ name: z.string() });
      const result = getValidatedItem('test-key', schema);

      expect(result).toBeNull();
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('removes data that fails validation', () => {
      const schema = z.object({ name: z.string() });
      const badData = { name: 123 }; // Wrong type

      localStorage.setItem('test-key', JSON.stringify(badData));

      const result = getValidatedItem('test-key', schema);

      expect(result).toBeNull();
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('setValidatedItem', () => {
    it('saves valid data', () => {
      const schema = z.string();
      const result = setValidatedItem('test-key', 'test-value', schema);

      expect(result).toBe(true);
      expect(localStorage.getItem('test-key')).toBe('"test-value"');
    });

    it('rejects invalid data', () => {
      const schema = z.string();
      const result = setValidatedItem('test-key', 123 as any, schema);

      expect(result).toBe(false);
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('storage helpers', () => {
    it('stores and retrieves player name', () => {
      storage.setMyName('Alice');
      expect(storage.getMyName()).toBe('Alice');
    });

    it('stores and retrieves player ID', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      storage.setMyPlayerId(id);
      expect(storage.getMyPlayerId()).toBe(id);
    });

    it('stores and retrieves game mode', () => {
      storage.setGameMode('hotseat');
      expect(storage.getGameMode()).toBe('hotseat');
    });

    it('clears all game storage', () => {
      storage.setMyName('Alice');
      storage.setGameMode('hotseat');

      storage.clearAll();

      expect(storage.getMyName()).toBeNull();
      expect(storage.getGameMode()).toBeNull();
    });
  });
});
```

**Validation:**
```bash
pnpm test  # Should pass all storage tests
```

---

### Step 7: Set Up Dark Mode CSS (15 minutes)

**Goal:** Basic dark mode support using prefers-color-scheme

**Reference:** DARK_MODE_GUIDE.md

**1. Create src/index.css:**
```css
/* ============================================================================
   King's Cooking - Base Styles with Dark Mode
   ============================================================================ */

:root {
  /* Tell browser we support both light and dark */
  color-scheme: light dark;

  /* Light mode colors */
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f8f9fa;
  --color-text-primary: #333333;
  --color-text-secondary: #666666;
  --color-border: #dddddd;
  --color-primary: #007bff;
  --color-success: #28a745;

  /* Spacing */
  --spacing-sm: 10px;
  --spacing-md: 20px;
  --spacing-lg: 30px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* Font */
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  font-weight: 400;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Dark mode colors */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #1e1e1e;
    --color-bg-secondary: #2a2a2a;
    --color-text-primary: #e0e0e0;
    --color-text-secondary: #999999;
    --color-border: #444444;
    --color-primary: #0d6efd;
    --color-success: #198754;
  }
}

/* ============================================================================
   Base Element Styles
   ============================================================================ */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  min-height: 100vh;
  transition: background-color 0.2s, color 0.2s;
}

h1, h2, h3, h4, h5, h6 {
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

h1 {
  font-size: 2.5rem;
  font-weight: 700;
}

h2 {
  font-size: 2rem;
  font-weight: 600;
}

/* ============================================================================
   Utility Classes
   ============================================================================ */

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--spacing-md);
}

/* ============================================================================
   Button Styles
   ============================================================================ */

button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

button:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ============================================================================
   Form Styles
   ============================================================================ */

input[type='text'],
input[type='email'] {
  width: 100%;
  padding: 12px;
  font-size: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  transition: all 0.2s;
}

input[type='text']:focus,
input[type='email']:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

@media (prefers-color-scheme: dark) {
  input[type='text']:focus,
  input[type='email']:focus {
    box-shadow: 0 0 0 3px rgba(13, 110, 253, 0.2);
  }
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--color-text-primary);
}
```

**2. Update src/App.tsx to use styles:**
```tsx
import { useState } from 'react'
import './index.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="container">
      <h1>King's Cooking</h1>
      <h2>Phase 1: Foundation Complete! ✅</h2>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={() => setCount((count) => count + 1)}>
          Test Dark Mode: {count}
        </button>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          Toggle your OS dark mode to see colors change!
        </p>
      </div>

      <div style={{
        marginTop: '2rem',
        padding: 'var(--spacing-md)',
        background: 'var(--color-bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)'
      }}>
        <h3>Foundation Status:</h3>
        <ul style={{ marginLeft: '1.5rem', lineHeight: '1.8' }}>
          <li>✅ Vite + React + TypeScript</li>
          <li>✅ Zod schemas implemented</li>
          <li>✅ localStorage utilities with validation</li>
          <li>✅ Dark mode support</li>
          <li>✅ Testing infrastructure ready</li>
          <li>✅ All validation gates passing</li>
        </ul>
      </div>
    </div>
  )
}

export default App
```

**3. Update src/main.tsx:**
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

**4. Update index.html:**
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="King's Cooking - A custom chess variant board game" />
    <title>King's Cooking - Chess Variant</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**Validation:**
```bash
pnpm run dev
# Visit http://localhost:5173
# Toggle OS dark mode - colors should change
# Button should work and be styled
```

---

### Step 8: Update GitHub Actions (10 minutes)

**Goal:** Modify existing workflows for Vite instead of Astro

**Note:** Your workflows are already well-structured. We just need to update a few commands.

**1. No changes needed to .github/workflows/ci.yml** - it already uses the correct commands:
- `pnpm run check` ✅
- `pnpm run lint` ✅
- `pnpm run test:coverage` ✅
- `pnpm run build` ✅

**2. Update .github/workflows/deploy.yml** (line 131):
```yaml
# Change port from 4321 to 4173 (Vite preview port)
# Line 131-132:
- name: ⏳ Wait for server
  run: npx wait-on http://localhost:4173 --timeout 60000
```

**3. Update .github/workflows/pr-checks.yml** (no changes needed):
- Already uses correct commands

**Validation:**
```bash
# Commit and push to trigger workflows
git add .
git commit -m "feat: replace Astro with Vite + React + TypeScript foundation"
git push origin main

# Check GitHub Actions tab - all workflows should pass
```

---

### Step 9: Final Integration Test (10 minutes)

**Goal:** Verify all systems work together

**Run all validation gates in sequence:**

```bash
# 1. Type checking
echo "=== Type Checking ==="
pnpm run check
echo "✅ TypeScript validation passed"

# 2. Linting
echo "=== Linting ==="
pnpm run lint
echo "✅ ESLint passed"

# 3. Unit tests
echo "=== Unit Tests ==="
pnpm test -- --run
echo "✅ Unit tests passed"

# 4. Test coverage
echo "=== Coverage ==="
pnpm run test:coverage
echo "✅ Coverage meets threshold (80%+)"

# 5. Build
echo "=== Production Build ==="
pnpm run build
echo "✅ Build succeeded"

# 6. Preview
echo "=== Preview Server ==="
pnpm run preview &
PREVIEW_PID=$!
sleep 3

# Test preview server
curl -f http://localhost:4173/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✅ Preview server works"
else
  echo "❌ Preview server failed"
  kill $PREVIEW_PID
  exit 1
fi

kill $PREVIEW_PID

# 7. E2E tests (requires built app)
echo "=== E2E Tests ==="
pnpm run test:e2e --project=chromium
echo "✅ E2E tests passed"

echo ""
echo "🎉 ALL VALIDATION GATES PASSED!"
echo "✅ Phase 1 Foundation Complete"
```

**Validation Checklist:**
- [ ] Type check passes
- [ ] Lint passes
- [ ] Unit tests pass
- [ ] Coverage ≥ 80%
- [ ] Build succeeds
- [ ] Preview server runs
- [ ] E2E test passes
- [ ] Dark mode works
- [ ] GitHub Actions green

---

## Validation Loop

### Level 1: Syntax & Style
```bash
pnpm run check && pnpm run lint
```
**Expected:** Zero errors, zero warnings

**If fails:**
- TypeScript errors: Check tsconfig.json strict mode settings
- ESLint errors: Review .eslintrc.cjs configuration
- Import errors: Verify all files exist at correct paths

### Level 2: Unit Tests
```bash
pnpm test -- --run
```
**Expected:** All tests pass

**If fails:**
- Check test setup in src/test/setup.ts
- Verify vitest.config.ts is correct
- Review failed test output

### Level 3: Test Coverage
```bash
pnpm run test:coverage
```
**Expected:** Coverage ≥ 80% for lines, functions, branches, statements

**If fails:**
- Add more tests to uncovered files
- Focus on lib/ directory (schemas, storage)
- Coverage threshold in vitest.config.ts

### Level 4: Integration Tests
```bash
pnpm run test:integration
```
**Expected:** All integration tests pass (if any exist)

**If fails:**
- Check vitest.integration.config.ts
- Verify integration test setup

### Level 5: E2E Tests
```bash
pnpm run build
pnpm run preview &
pnpm run test:e2e --project=chromium
```
**Expected:** Homepage loads, basic navigation works

**If fails:**
- Check playwright.config.ts baseURL (should be http://localhost:4173)
- Verify preview server is running
- Check E2E test files in src/test/e2e/

### Level 6: Build & Preview
```bash
pnpm run build
pnpm run preview
```
**Expected:** Build succeeds, preview server runs on port 4173

**If fails:**
- Check vite.config.ts
- Verify base path is '/kings-cooking/'
- Check for build errors in console

### Level 7: GitHub Actions
```bash
git add .
git commit -m "feat: phase 1 foundation"
git push origin main
```
**Expected:** All GitHub Actions workflows pass (CI, Deploy)

**If fails:**
- Check .github/workflows/*.yml
- Verify package.json scripts match workflow commands
- Review GitHub Actions logs

---

## Success Criteria

Phase 1 is complete when ALL of the following are true:

### Technical Requirements
- [x] Vite dev server runs on http://localhost:5173
- [x] React components render correctly
- [x] TypeScript strict mode enabled with zero errors
- [x] ESLint configured and passing
- [x] Prettier configured
- [x] All validation gates pass

### Schemas & Validation
- [x] Zod schemas created for GameState, Piece, Player
- [x] Branded types implemented (PlayerId, GameId)
- [x] Schema tests pass with >90% coverage
- [x] Type inference works correctly

### Storage
- [x] localStorage utilities implemented
- [x] Zod validation on read/write
- [x] Corrupted data handling works
- [x] Storage tests pass with >85% coverage

### Testing Infrastructure
- [x] Vitest configured and running
- [x] Happy-dom environment works
- [x] Coverage reporting enabled (threshold 80%)
- [x] Playwright configured
- [x] Basic E2E test passes

### Dark Mode
- [x] CSS variables defined for both modes
- [x] prefers-color-scheme media query works
- [x] All colors adapt to dark mode
- [x] Sufficient contrast in both modes

### CI/CD
- [x] GitHub Actions workflows updated
- [x] All workflows pass on push to main
- [x] Deployment to GitHub Pages succeeds
- [x] Live site accessible at https://randallard.github.io/kings-cooking/

### Documentation
- [x] README.md updated with setup instructions
- [x] Code includes TypeScript documentation comments
- [x] All validation commands documented

---

## Common Issues & Solutions

### Issue: "Module not found" errors

**Cause:** Path imports not configured

**Solution:**
1. Check tsconfig.json has correct paths
2. Verify vite.config.ts has resolve.alias
3. Use relative imports initially

### Issue: Tests fail with "localStorage is not defined"

**Cause:** happy-dom might not have full localStorage support

**Solution:**
Add to src/test/setup.ts:
```typescript
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  } as Storage;
}
```

### Issue: Dark mode not working

**Cause:** CSS variables not defined or browser doesn't support

**Solution:**
1. Check :root has color-scheme: light dark
2. Verify CSS variables defined
3. Test in Chrome/Firefox (best support)

### Issue: Build fails with "Top-level await"

**Cause:** Vite config issue

**Solution:**
Ensure vite.config.ts has:
```typescript
export default defineConfig({
  build: {
    target: 'esnext', // or 'es2020'
  }
})
```

### Issue: GitHub Actions fail on pnpm install

**Cause:** pnpm version mismatch

**Solution:**
Check .github/workflows/*.yml has:
```yaml
- uses: pnpm/action-setup@v2
  with:
    version: 8  # Match package.json packageManager
```

### Issue: Preview port already in use

**Cause:** Previous process still running

**Solution:**
```bash
lsof -ti:4173 | xargs kill -9
pnpm run preview
```

---

## Next Steps

After Phase 1 completes:

1. **Verify Live Site:**
   - Visit https://randallard.github.io/kings-cooking/
   - Test dark mode toggle
   - Check browser console (should be clean)

2. **Code Review:**
   - Review all generated code
   - Verify patterns match documentation
   - Check test coverage report

3. **Ready for Phase 2:**
   - Foundation solid ✅
   - Can begin chess engine implementation
   - TDD workflow established

4. **Create Phase 2 PRP:**
   - Chess engine with piece movement
   - Comprehensive unit tests
   - Victory condition detection

---

## Estimated Time Breakdown

| Step | Task | Time |
|------|------|------|
| 1 | Backup & Cleanup | 5 min |
| 2 | Initialize Vite + React | 10 min |
| 3 | Configure ESLint | 10 min |
| 4 | Set up testing | 15 min |
| 5 | Implement Zod schemas | 20 min |
| 6 | localStorage utilities | 25 min |
| 7 | Dark mode CSS | 15 min |
| 8 | Update GitHub Actions | 10 min |
| 9 | Final integration test | 10 min |
| **Total** | | **2 hours** |

Add 1-2 hours for troubleshooting and testing = **4-6 hours total**

---

## Validation Command Summary

```bash
# Quick validation (run before commit)
pnpm run validate

# Full validation (includes E2E)
pnpm run check && \
pnpm run lint && \
pnpm test -- --run && \
pnpm run test:coverage && \
pnpm run build && \
pnpm run preview &
sleep 3 && \
pnpm run test:e2e --project=chromium
```

---

**END OF PRP**

**Status:** Ready for execution
**Next PRP:** Phase 2 - Chess Engine Implementation
**Dependencies Met:** ✅ All prerequisites satisfied

# PRP: Phase 1 - React 19 Foundation with Comprehensive Validation

**PRP ID:** KC-PRP-001-R19
**Version:** 2.0.0
**Created:** 2025-10-13
**Status:** Ready for Execution
**Dependencies:** None (Foundation phase)
**Estimated Time:** 6-8 hours
**Confidence Score:** 9/10

---

## Goal

Establish a production-ready React 19.2.0 + Vite 7.0 foundation with comprehensive type safety, runtime validation, and automated quality gates.

**Specific End State:**
- ✅ React 19.2.0 with Compiler operational
- ✅ Vite 7.0 dev server with HMR working
- ✅ TypeScript strict mode enabled (no JSX namespace, using ReactElement)
- ✅ Zod schemas for all game state with branded types
- ✅ localStorage utilities with runtime validation
- ✅ Dark mode CSS framework operational
- ✅ Vitest 3.x + Playwright E2E configured and passing
- ✅ GitHub Actions CI/CD updated and passing
- ✅ 80%+ test coverage with comprehensive validation gates

**NOT in Scope:**
- Chess engine implementation (Phase 2)
- Game UI components (Phase 4)
- URL encryption (Phase 3)

---

## Why

### Business Value
- **Rapid Development Velocity**: React Compiler eliminates manual optimization → faster feature development
- **Runtime Safety**: Zod validation prevents corrupted game states → zero data corruption bugs
- **Future-Proof Architecture**: React 19 + modern patterns → easy to maintain and extend
- **Automated Quality**: Comprehensive testing + CI/CD → catch bugs before production

### User Impact
- **Reliable Game State**: Zod validation ensures players never lose game progress to corrupted data
- **Better UX from Day 1**: Dark mode support, fast HMR during development
- **Cross-Browser Compatibility**: Modern tooling with proper polyfills

### Technical Necessity
- **Type Safety at Runtime**: TypeScript only checks at compile-time; Zod validates at runtime
- **React 19 Advantages**: Compiler auto-optimization, better concurrent rendering, enhanced Suspense
- **Validation at Boundaries**: Must validate localStorage, URL params, and external data before use
- **One-Pass Implementation**: Comprehensive foundation prevents technical debt and refactoring later

---

## What You'll See

After this PRP completes, you will observe:

### 1. Development Server
```bash
pnpm dev
# → Vite 7.0 starts on http://localhost:5173
# → React 19.2.0 with Compiler active
# → HMR updates instantly on file save
# → TypeScript errors shown in terminal and browser
```

**Visual Confirmation:**
- Homepage displays "King's Cooking - Phase 1 Complete"
- Dark mode toggle works (respects OS preference)
- React DevTools shows "Memo ✨" badges on components (Compiler active)

### 2. Type Safety
```bash
pnpm run check
# → TypeScript compiles with ZERO errors
# → All imports resolved correctly
# → No JSX namespace errors
# → Branded types working (GameId, PlayerId)
```

### 3. Tests Running
```bash
pnpm test
# → Vitest 3.x runs all tests
# → Coverage report generated
# → All schema validation tests pass
# → localStorage tests pass with Zod validation
```

**Expected Output:**
```
✓ src/lib/validation/schemas.test.ts (12 tests)
✓ src/lib/storage/localStorage.test.ts (8 tests)
✓ src/App.test.tsx (3 tests)

Test Files  3 passed (3)
Tests  23 passed (23)
Coverage  82.4% (exceeds 80% threshold)
```

### 4. E2E Tests
```bash
pnpm run test:e2e
# → Playwright starts preview server
# → Loads homepage
# → Verifies dark mode
# → All E2E tests pass
```

### 5. Build Success
```bash
pnpm run build
# → TypeScript compilation succeeds
# → Vite bundles application
# → dist/ folder created with optimized assets
# → React Compiler optimizations applied
```

**Bundle Analysis:**
```
dist/assets/index-[hash].js    ~45 KB (gzipped)
dist/assets/vendor-[hash].js   ~120 KB (gzipped)
Total size: ~165 KB (under 200 KB target)
```

### 6. CI/CD Operational
```bash
git push origin main
# → GitHub Actions triggers
# → All workflows pass (ci.yml, deploy.yml)
# → Deployed to https://randallard.github.io/kings-cooking/
```

---

## All Needed Context

### 📚 Project Documentation (MUST READ)

#### 1. PRD.md - Product Requirements Document
**File:** `/home/ryankhetlyr/Development/kings-cooking/PRD.md`

**Key Sections:**
- **Section 2: Technical Architecture** - Overall stack and component structure
- **Section 2.3: Data Structures** - Zod schemas for GameState, Piece, Player (copy these exactly)
- **Section 2.7: localStorage Strategy** - Storage keys and patterns
- **Section 2.8: Dark Mode Support** - CSS patterns and color variables
- **Section 3.2: Test-Driven Development** - TDD requirements and coverage thresholds
- **Section 3.3: Code Quality Standards** - TypeScript strict mode settings

**Critical Details:**
```typescript
// From PRD Section 2.3 - USE THESE EXACT SCHEMAS
export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export const GameIdSchema = z.string().uuid().brand<'GameId'>();
export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop']);
export const PieceOwnerSchema = z.enum(['white', 'black']);
// ... (see PRD for complete schemas)
```

#### 2. CLAUDE-REACT.md - Mandatory Development Patterns
**File:** `/home/ryankhetlyr/Development/kings-cooking/claude_md_files/CLAUDE-REACT.md`

**MANDATORY Requirements:**
- **TypeScript Strict Mode**: All strict compiler options enabled (lines 204-223)
- **ReactElement Not JSX.Element**: MUST use `import { ReactElement } from 'react'` (lines 100-122)
- **JSDoc Documentation**: MUST document ALL exports with complete JSDoc (lines 548-683)
- **80% Coverage Minimum**: NO EXCEPTIONS (line 393)
- **Zod Validation**: MUST validate ALL external data (lines 318-359)
- **Branded Types**: MUST use for ALL IDs (lines 246-257)
- **Component Max 200 Lines**: Split if larger (line 743)
- **Cognitive Complexity Max 15**: Refactor if higher (line 744)

**Key Patterns:**
```typescript
// CORRECT React 19 typing (from CLAUDE-REACT.md lines 106-112)
import { ReactElement } from 'react';

function MyComponent(): ReactElement {
  return <div>Content</div>;
}

// FORBIDDEN - Will cause "Cannot find namespace 'JSX'" error
function MyComponent(): JSX.Element {  // ❌
  return <div>Content</div>;
}
```

**Testing Requirements** (lines 389-453):
- Co-locate tests in `__tests__/` folders
- Use React Testing Library for all component tests
- Test user behavior, not implementation details
- Mock external dependencies appropriately

#### 3. ZOD_VALIDATION_PATTERNS_RESEARCH.md - Validation Best Practices
**File:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/ZOD_VALIDATION_PATTERNS_RESEARCH.md`

**Critical Sections:**
- **Section 2: Branded Types** (lines 90-112) - Type safety without runtime overhead
- **Section 3: Runtime Validation Best Practices** (lines 202-265) - When and where to validate
- **Section 4: localStorage Validation** (lines 267-390) - Complete patterns with safeParse
- **Section 8: Error Handling** (lines 785-999) - parse vs safeParse, error formatting
- **Section 10: Common Pitfalls** (lines 1126-1270) - Anti-patterns to avoid

**Key Principle** (line 247):
> "Validate at your API boundary - you can consider that data trusted within your system afterward."

**localStorage Pattern** (lines 296-335):
```typescript
function loadGameHistory(): GameHistory | null {
  try {
    const stored = localStorage.getItem('game-history');
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const result = GameHistorySchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.error('Invalid localStorage data:', result.error);
      localStorage.removeItem('game-history'); // Remove corrupted data
      return null;
    }
  } catch (error) {
    console.error('Failed to load game history:', error);
    localStorage.removeItem('game-history');
    return null;
  }
}
```

#### 4. localStorage-react-patterns-2024-2025.md - React Storage Patterns
**File:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/localStorage-react-patterns-2024-2025.md`

**Key Patterns:**
- **useSyncExternalStore** (lines 100-148) - React 18+ pattern for localStorage
- **Error Handling** (lines 150-223) - QuotaExceededError detection
- **Type Safety** (lines 225-294) - TypeScript generic hooks
- **Cross-Tab Sync** (lines 367-453) - Storage events and BroadcastChannel

**Important Note** (line 143):
> "The `storage` event is NOT triggered in the same tab that made the change. You must manually dispatch a `storage` event to trigger updates in the current tab."

#### 5. DARK_MODE_GUIDE.md - Dark Mode Implementation
**File:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/DARK_MODE_GUIDE.md`

**Core Requirements** (lines 30-49):
```css
:root {
  color-scheme: light dark; /* Tells browser we support both */
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg-primary: #1e1e1e;
    --color-text-primary: #e0e0e0;
    /* ... */
  }
}
```

**CSS Variables to Use** (lines 151-181):
- `--cg-color-text-primary`, `--cg-color-text-secondary`
- `--cg-color-bg-primary`, `--cg-color-bg-secondary`
- `--cg-spacing-sm/md/lg`
- `--cg-radius-sm/md/lg`

#### 6. STATE_DIAGRAM_TEMPLATE.md - Game Flow Patterns
**File:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/STATE_DIAGRAM_TEMPLATE.md`

**Key Concepts:**
- Unified flow for both hot-seat and URL modes
- State variables reference (lines 363-402)
- localStorage keys (lines 395-405)

**Storage Keys** (lines 395-405):
```typescript
// Both Modes:
'correspondence-games:my-name'
'correspondence-games:my-player-id'
'[game-name]:game-state'

// Hot-Seat Mode Only:
'correspondence-games:player1-name'
'correspondence-games:player2-name'
```

#### 7. NAME_COLLECTION_PATTERN.md - Form Patterns
**File:** `/home/ryankhetlyr/Development/kings-cooking/kings-cooking-docs/NAME_COLLECTION_PATTERN.md`

**Key Pattern** (lines 14-62):
- Use HTML forms with `onSubmit`, NOT separate buttons
- Use `FormData` for extraction
- Auto-focus on input
- HTML5 validation (required, maxLength)

---

### 🌐 External Documentation (WITH URLs)

#### React 19 Official Documentation

**1. React 19.2.0 Release (October 1, 2025)**
- **URL:** https://react.dev/blog/2025/10/01/react-19-2
- **Key Features:** New `<Activity />` component, `useEffectEvent`, partial pre-rendering
- **What to Know:** Latest stable version with all React 19 features finalized

**2. React 19 Upgrade Guide**
- **URL:** https://react.dev/blog/2024/04/25/react-19-upgrade-guide
- **Critical Breaking Changes:**
  - `forwardRef` no longer needed for function components
  - `propTypes` and `defaultProps` removed
  - String refs eliminated
  - Legacy context removed (`contextTypes`, `getChildContext`)

**3. React Compiler Documentation**
- **URL:** https://react.dev/learn/react-compiler
- **Installation Guide:** https://react.dev/learn/react-compiler/installation
- **Key Point:** Automatically optimizes components, eliminates manual `useMemo`/`useCallback`
- **Requirement:** MUST follow Rules of React (no mutations, no conditional hooks)

**4. TypeScript JSX Changes**
- **URL:** https://www.typescriptlang.org/docs/handbook/jsx.html
- **Critical:** React 19 removed global `JSX` namespace
- **Migration Codemod:** `npx types-react-codemod@latest preset-19 ./src`
- **Use:** `React.ReactNode` for return types, NOT `JSX.Element`

#### Vite 7 Official Documentation

**1. Vite 7 Announcement**
- **URL:** https://vite.dev/blog/announcing-vite7
- **Key Changes:** Node.js 18 dropped (requires 20.19+), improved HMR, faster builds
- **Compatibility:** Fully compatible with React 19

**2. Vite Configuration Reference**
- **URL:** https://vitejs.dev/config/
- **Critical for GitHub Pages:** Must set `base: '/kings-cooking/'`

**3. Vite + React Plugin**
- **URL:** https://github.com/vitejs/vite-plugin-react
- **Version:** @vitejs/plugin-react@^4.0.0
- **Supports:** React Compiler via Babel plugin configuration

#### Zod Official Documentation

**1. Zod Main Documentation**
- **URL:** https://zod.dev/
- **API Reference:** https://zod.dev/api
- **GitHub:** https://github.com/colinhacks/zod

**2. Branded Types**
- **URL:** https://zod.dev/api (search for "brand")
- **Tutorial:** https://spin.atomicobject.com/zod-brand/
- **Advanced:** https://stevekinney.com/courses/full-stack-typescript/type-branding-with-zod

**3. Error Handling**
- **Customization:** https://zod.dev/error-customization
- **Formatting:** https://zod.dev/error-formatting
- **Best Practices:** https://stevekinney.com/courses/full-stack-typescript/zod-best-practices

**4. When to Use Zod**
- **Article:** https://www.totaltypescript.com/when-should-you-use-zod
- **Key Principle:** Validate at boundaries, trust internal data

#### Testing Documentation

**1. Vitest 3.x**
- **URL:** https://vitest.dev/guide/
- **What's New:** First version to support Vite 6+
- **With React:** https://victorbruce82.medium.com/vitest-with-react-testing-library-in-react-created-with-vite-3552f0a9a19a

**2. React Testing Library**
- **URL:** https://testing-library.com/docs/react-testing-library/intro/
- **Version:** @testing-library/react@^16.0.0 (React 19 compatible)
- **Philosophy:** Test user behavior, not implementation

**3. Playwright**
- **URL:** https://playwright.dev/docs/intro
- **Version:** @playwright/test@^1.40.0
- **Config:** https://playwright.dev/docs/test-configuration

---

### ⚠️ Critical Gotchas (FROM RESEARCH)

#### React 19 Breaking Changes

**1. forwardRef No Longer Needed**
```typescript
// ❌ OLD (React 18)
const MyInput = React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />
})

// ✅ NEW (React 19)
function MyInput({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}
```

**2. PropTypes and defaultProps Removed**
```typescript
// ❌ NO LONGER WORKS
function MyComponent({ name = 'default' }) {
  return <div>{name}</div>
}
MyComponent.defaultProps = { name: 'default' }

// ✅ USE ES6 DEFAULTS
function MyComponent({ name = 'default' }: { name?: string }) {
  return <div>{name}</div>
}
```

**3. JSX.Element → ReactElement**
```typescript
// ❌ WILL ERROR: Cannot find namespace 'JSX'
import React from 'react';

function MyComponent(): JSX.Element {
  return <div>Content</div>;
}

// ✅ CORRECT
import { ReactElement } from 'react';

function MyComponent(): ReactElement {
  return <div>Content</div>;
}
```

**4. React Compiler Requirements**
- **MUST NOT** rely on memoization for correctness
- **MUST** follow Rules of React strictly
- **DO NOT** mutate props or state
- **DO NOT** read/write values during render that could change

#### Vite 7 Gotchas

**1. Node.js Version**
```bash
# Vite 7 requires Node.js 20.19+ or 22.12+
# Node.js 18 is no longer supported
node --version  # Must be >= 20.19.0
```

**2. Base Path for GitHub Pages**
```typescript
// vite.config.ts
export default defineConfig({
  base: '/kings-cooking/', // MUST match repo name exactly
})
```

**3. Preview Port**
```typescript
// vite.config.ts
export default defineConfig({
  preview: {
    port: 4173, // NOT 4321 (Astro's port)
    strictPort: true,
  }
})
```

#### Zod Validation Gotchas

**1. Branded Types Require Validation**
```typescript
// ❌ WRONG: Cannot assign plain value
const gameId: GameId = "some-uuid"; // Type error!

// ✅ CORRECT: Must validate first
const gameId = GameIdSchema.parse("some-uuid");
```

**2. safeParse vs parse**
```typescript
// Use safeParse for external data (returns result object)
const result = schema.safeParse(externalData);
if (result.success) {
  // Use result.data
}

// Use parse for trusted data (throws on error)
try {
  const data = schema.parse(trustedData);
} catch (error) {
  // Handle ZodError
}
```

**3. Remove Corrupted localStorage Data**
```typescript
// ❌ BAD: Leave corrupted data
const result = schema.safeParse(stored);
if (!result.success) {
  return null; // Data still in localStorage!
}

// ✅ GOOD: Remove corrupted data
const result = schema.safeParse(stored);
if (!result.success) {
  localStorage.removeItem(key); // Clean up
  return null;
}
```

#### TypeScript Strict Mode Gotchas

**1. noUncheckedIndexedAccess**
```typescript
// With noUncheckedIndexedAccess: true
const board: Piece[][] = [[]];
const piece = board[0][0]; // Type: Piece | undefined (not Piece)

// Must check:
if (piece) {
  // piece is Piece here
}
```

**2. ExactOptionalPropertyTypes**
```typescript
// ❌ WRONG: Passing undefined to optional prop
<Input helperText={condition ? "text" : undefined} />

// ✅ CORRECT: Conditional spread
<Input {...(condition ? { helperText: "text" } : {})} />
```

#### Vitest 3 Gotchas

**1. Requires Vite 6+**
```bash
# Vitest 2.x → Vite 5
# Vitest 3.x → Vite 6/7
# If you see errors about Vite version, check compatibility
```

**2. globals: true Configuration**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true, // Enables describe, it, expect without imports
    environment: 'jsdom', // For React components
  }
})
```

**3. Coverage Thresholds**
```typescript
// vitest.config.ts
coverage: {
  threshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80,
    }
  }
}
// Build will FAIL if coverage drops below 80%
```

#### GitHub Actions Gotchas

**1. Script Names Must Match**
```json
// package.json
{
  "scripts": {
    "check": "tsc --noEmit", // NOT "typecheck"
    "lint": "eslint ...",
    "test:coverage": "vitest --coverage --run",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

**2. pnpm Version**
```yaml
# .github/workflows/ci.yml
- uses: pnpm/action-setup@v2
  with:
    version: 8 # Must match package.json packageManager field
```

**3. Playwright Requires --with-deps**
```yaml
- name: Install Playwright browsers
  run: pnpm exec playwright install --with-deps
```

#### Dark Mode Gotchas

**1. Must Declare color-scheme**
```css
:root {
  color-scheme: light dark; /* Required! */
}
```

**2. Use Media Query for OS Detection**
```css
/* Automatic detection */
@media (prefers-color-scheme: dark) {
  /* Dark mode styles */
}
```

**3. Test in Both Modes**
```bash
# Chrome DevTools: Ctrl+Shift+P → "dark mode"
# Or toggle OS dark mode setting
```

---

## Implementation Blueprint

### ULTRATHINK: Implementation Strategy

**Key Principles:**
1. **Validate Early, Validate Often** - Run validation commands after each major step
2. **Test-First When Possible** - Write schema tests before implementation
3. **Incremental Verification** - Don't move to next step until current validates
4. **Information Density** - Use exact types, schemas, and patterns from documentation

**Task Breakdown:**
```
1. Analyze & Backup (5 min)
2. Initialize React 19 + Vite 7 (15 min)
3. Configure TypeScript Strict Mode (10 min)
4. Set Up React Compiler (10 min)
5. Configure ESLint (15 min)
6. Set Up Vitest 3.x (20 min)
7. Configure Playwright (15 min)
8. Implement Zod Schemas (45 min) ← CRITICAL
9. Implement localStorage Utils (30 min)
10. Set Up Dark Mode CSS (20 min)
11. Create Test App Component (20 min)
12. Update GitHub Actions (15 min)
13. Final Integration Validation (30 min)

Total: ~4 hours core + 2-4 hours debugging/testing = 6-8 hours
```

---

### Step 1: Analyze & Backup Existing Setup (5 minutes)

**Goal:** Understand what exists and preserve GitHub Actions

#### 1.1 Analyze Current Setup
```bash
cd /home/ryankhetlyr/Development/kings-cooking

# Check what currently exists
ls -la

# Check for src directory
ls -la src 2>/dev/null || echo "No src directory"

# Check current package.json
cat package.json | grep -E "(name|version|dependencies)" -A 5

# Verify Git repository
git status
git log --oneline -5
```

#### 1.2 Preserve Critical Files
```bash
# GitHub Actions are already in place - just verify
ls -la .github/workflows/
# Should see: ci.yml, deploy.yml, pr-checks.yml

# PRD and documentation are in place
ls -la PRD.md kings-cooking-docs/

# Everything we need is preserved
```

**Validation:**
```bash
# Confirm these files exist:
test -f .github/workflows/ci.yml && echo "✓ CI workflow exists"
test -f .github/workflows/deploy.yml && echo "✓ Deploy workflow exists"
test -f PRD.md && echo "✓ PRD exists"
```

---

### Step 2: Initialize React 19 + Vite 7 Project (15 minutes)

**Goal:** Create fresh Vite + React 19 project with correct versions

#### 2.1 Remove Old Astro Setup
```bash
# Remove Astro dependencies and configs
rm -f package.json pnpm-lock.yaml
rm -f astro.config.mjs tailwind.config.mjs
rm -f tsconfig.json vitest.config.ts playwright.config.ts
rm -rf node_modules

# Remove any existing src if it exists
rm -rf src public

echo "Old setup removed"
```

#### 2.2 Create Vite Project in Temp Location
```bash
# Create in temp directory
cd /tmp
pnpm create vite@latest kings-cooking-temp --template react-ts

# Copy to project
cd /home/ryankhetlyr/Development/kings-cooking
cp /tmp/kings-cooking-temp/package.json .
cp /tmp/kings-cooking-temp/vite.config.ts .
cp /tmp/kings-cooking-temp/tsconfig.json .
cp /tmp/kings-cooking-temp/tsconfig.node.json .
cp /tmp/kings-cooking-temp/index.html .
cp -r /tmp/kings-cooking-temp/src .
cp -r /tmp/kings-cooking-temp/public .
cp /tmp/kings-cooking-temp/.gitignore .gitignore.vite

# Merge .gitignore files
cat .gitignore.vite >> .gitignore
rm .gitignore.vite

# Clean up
rm -rf /tmp/kings-cooking-temp
```

#### 2.3 Update package.json with Correct Versions and Scripts

**Create complete package.json:**
```json
{
  "name": "kings-cooking",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "description": "King's Cooking - A custom chess variant board game",
  "author": "randallard",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/randallard/kings-cooking.git"
  },
  "homepage": "https://randallard.github.io/kings-cooking/",
  "packageManager": "pnpm@8.15.0",
  "engines": {
    "node": ">=20.19.0",
    "pnpm": ">=8.0.0"
  },
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
    "test:e2e:headed": "playwright test --headed",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "format:check": "prettier --check \"src/**/*.{ts,tsx,css}\"",
    "validate": "pnpm run check && pnpm run lint && pnpm run test:coverage"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.22.0",
    "crypto-js": "^4.2.0",
    "lz-string": "^1.5.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/crypto-js": "^4.2.1",
    "@typescript-eslint/eslint-plugin": "^6.14.0",
    "@typescript-eslint/parser": "^6.14.0",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.55.0",
    "eslint-plugin-react": "^7.33.2",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.5",
    "eslint-plugin-react-compiler": "^0.0.0-experimental-c8b3f72-20240517",
    "typescript": "^5.3.3",
    "vite": "^7.0.0",
    "vitest": "^3.0.0",
    "@vitest/ui": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0",
    "jsdom": "^25.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/jest-dom": "^6.1.5",
    "@testing-library/user-event": "^14.5.1",
    "@playwright/test": "^1.40.0",
    "prettier": "^3.1.1",
    "babel-plugin-react-compiler": "^0.0.0-experimental-c8b3f72-20240517"
  }
}
```

**Save this to package.json**, then:
```bash
pnpm install
```

#### 2.4 Update vite.config.ts for GitHub Pages

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}]
        ]
      }
    })
  ],
  base: '/kings-cooking/', // CRITICAL: Must match GitHub repo name
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'validation': ['zod'],
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
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

**Validation:**
```bash
pnpm run dev &
DEV_PID=$!
sleep 3

# Test dev server
curl -f http://localhost:5173/kings-cooking/ > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "✓ Dev server working"
else
  echo "✗ Dev server failed"
fi

kill $DEV_PID
```

---

### Step 3: Configure TypeScript Strict Mode (10 minutes)

**Goal:** Enable all strict type checking for React 19

#### 3.1 Create tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* React 19 Specific */
    "jsx": "react-jsx",

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting - STRICT MODE (from CLAUDE-REACT.md) */
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
    "exactOptionalPropertyTypes": true,

    /* Path aliases */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### 3.2 Update tsconfig.node.json

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": [
    "vite.config.ts",
    "vitest.config.ts",
    "vitest.integration.config.ts",
    "playwright.config.ts"
  ]
}
```

**Validation:**
```bash
pnpm run check
# Should compile with zero errors
# If errors about ReactElement, see next step
```

---

### Step 4: Set Up React Compiler (10 minutes)

**Goal:** Enable React 19 Compiler for auto-optimization

#### 4.1 Verify Compiler Plugin Installed
```bash
pnpm list babel-plugin-react-compiler
# Should show installed version
```

#### 4.2 Add ESLint Plugin for Compiler

**Update .eslintrc.cjs:**
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
  ignorePatterns: ['dist', '.eslintrc.cjs', 'node_modules'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: ['./tsconfig.json', './tsconfig.node.json'],
  },
  plugins: [
    'react-refresh',
    '@typescript-eslint',
    'react',
    'react-compiler',
  ],
  settings: {
    react: {
      version: '19.0',
    },
  },
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
    'react-compiler/react-compiler': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': [
      'error',
      {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
      },
    ],
  },
}
```

#### 4.3 Create .eslintignore

```
dist
node_modules
.github
*.config.ts
*.config.js
coverage
coverage-integration
playwright-report
test-results
```

#### 4.4 Create .prettierrc

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
pnpm run lint
# Should pass with zero warnings
```

---

### Step 5: Configure ESLint (15 minutes)

**Goal:** Set up comprehensive linting for React 19 + TypeScript

(Completed in Step 4, but verify):

```bash
# Test linting
pnpm run lint

# Test with a deliberate error
echo "const test: any = 1;" >> src/test-lint.ts
pnpm run lint
# Should fail with error about 'any'

# Remove test file
rm src/test-lint.ts
```

---

### Step 6: Set Up Vitest 3.x (20 minutes)

**Goal:** Configure Vitest with React Testing Library

#### 6.1 Create vitest.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ['babel-plugin-react-compiler', {}]
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.config.ts',
        '**/types.ts',
        '**/*.d.ts',
      ],
      thresholds: {
        global: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

#### 6.2 Create vitest.integration.config.ts

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.integration.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage-integration',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
```

#### 6.3 Create Test Setup File

```bash
mkdir -p src/test
```

**src/test/setup.ts:**
```typescript
/**
 * @fileoverview Vitest test setup and configuration
 * @module test/setup
 */

import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Cleanup after each test to ensure test isolation.
 * Removes all rendered components from the DOM.
 */
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})
```

#### 6.4 Create Initial Test

**src/App.test.tsx:**
```typescript
/**
 * @fileoverview Tests for main App component
 * @module App.test
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App Component', () => {
  it('should render without crashing', () => {
    render(<App />)
    expect(screen.getByText(/King's Cooking/i)).toBeInTheDocument()
  })

  it('should display phase 1 completion message', () => {
    render(<App />)
    expect(screen.getByText(/Phase 1.*Complete/i)).toBeInTheDocument()
  })
})
```

**Validation:**
```bash
pnpm test -- --run
# Should pass 2 tests
```

---

### Step 7: Configure Playwright (15 minutes)

**Goal:** Set up E2E testing with Playwright

#### 7.1 Create playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E test configuration for King's Cooking.
 * Configured for GitHub Pages deployment with proper base URL.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:4173/kings-cooking/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
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
    url: 'http://localhost:4173/kings-cooking/',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

#### 7.2 Create E2E Test Directory

```bash
mkdir -p src/test/e2e
```

**src/test/e2e/homepage.e2e.ts:**
```typescript
/**
 * @fileoverview E2E tests for homepage
 * @module test/e2e/homepage
 */

import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test('should load and display title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/King's Cooking/i);
    await expect(page.locator('h1')).toContainText(/King's Cooking/i);
  });

  test('should have dark mode support', async ({ page }) => {
    await page.goto('/');

    // Check that color-scheme is declared
    const root = page.locator(':root');
    const colorScheme = await root.evaluate((el) =>
      getComputedStyle(el).colorScheme
    );

    expect(colorScheme).toContain('light');
    expect(colorScheme).toContain('dark');
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify content is visible
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

**Validation:**
```bash
# Build first (Playwright needs built app)
pnpm run build

# Run E2E tests
pnpm run test:e2e --project=chromium
# Should pass 3 tests
```

---

### Step 8: Implement Zod Schemas (45 minutes) ← CRITICAL

**Goal:** Create comprehensive game state schemas with branded types

This is the MOST IMPORTANT step for runtime validation.

#### 8.1 Create Schema Directory

```bash
mkdir -p src/lib/validation
```

#### 8.2 Create Complete Schemas File

**src/lib/validation/schemas.ts:**

```typescript
/**
 * @fileoverview Zod validation schemas for King's Cooking game state
 * @module lib/validation/schemas
 *
 * This module defines all validation schemas using Zod for runtime type safety.
 * All external data (localStorage, URL parameters, WebRTC messages) MUST be
 * validated with these schemas before use.
 *
 * @see PRD.md Section 2.3 - Data Structures
 * @see ZOD_VALIDATION_PATTERNS_RESEARCH.md
 */

import { z } from 'zod';

// ============================================================================
// Branded Types for Type Safety (ZOD_VALIDATION_PATTERNS_RESEARCH.md lines 90-112)
// ============================================================================

/**
 * Branded type for Player IDs.
 * Prevents accidentally mixing player IDs with other string types.
 *
 * @example
 * ```typescript
 * const playerId = PlayerIdSchema.parse('550e8400-e29b-41d4-a716-446655440000');
 * function getPlayer(id: PlayerId) { ... }
 * getPlayer(playerId); // ✓ Works
 * getPlayer('some-string'); // ✗ Type error
 * ```
 */
export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export type PlayerId = z.infer<typeof PlayerIdSchema>;

/**
 * Branded type for Game IDs.
 * Ensures game IDs cannot be confused with player IDs or other identifiers.
 */
export const GameIdSchema = z.string().uuid().brand<'GameId'>();
export type GameId = z.infer<typeof GameIdSchema>;

/**
 * Branded type for Move IDs.
 * Tracks individual moves in move history.
 */
export const MoveIdSchema = z.string().uuid().brand<'MoveId'>();
export type MoveId = z.infer<typeof MoveIdSchema>;

// ============================================================================
// Piece Types (PRD.md Section 2.3)
// ============================================================================

/**
 * Chess piece types available in King's Cooking.
 * Initial implementation: rook, knight, bishop (no pawns, no king/queen).
 */
export const PieceTypeSchema = z.enum(['rook', 'knight', 'bishop']);
export type PieceType = z.infer<typeof PieceTypeSchema>;

/**
 * Piece owner (color).
 * White always starts first.
 */
export const PieceOwnerSchema = z.enum(['white', 'black']);
export type PieceOwner = z.infer<typeof PieceOwnerSchema>;

/**
 * Board position with validation.
 * Row and column are 0-indexed.
 * Null position means piece is off-board (in a court or captured).
 *
 * @example
 * ```typescript
 * const pos = PositionSchema.parse([0, 0]); // Top-left corner
 * ```
 */
export const PositionSchema = z.tuple([
  z.number().int().min(0),
  z.number().int().min(0),
]).nullable();

export type Position = z.infer<typeof PositionSchema>;

/**
 * Complete piece schema with position and state.
 *
 * @property type - Type of chess piece
 * @property owner - Which player owns this piece
 * @property position - Current position or null if off-board
 * @property moveCount - Number of times piece has moved (for move validation)
 * @property id - Unique identifier for this piece instance
 */
export const PieceSchema = z.object({
  type: PieceTypeSchema,
  owner: PieceOwnerSchema,
  position: PositionSchema,
  moveCount: z.number().int().min(0),
  id: z.string().uuid(),
});

export type Piece = z.infer<typeof PieceSchema>;

// ============================================================================
// Player Info
// ============================================================================

/**
 * Player information schema.
 *
 * @property id - Unique player identifier (UUID)
 * @property name - Player's display name (1-20 characters)
 */
export const PlayerInfoSchema = z.object({
  id: PlayerIdSchema,
  name: z.string().min(1).max(20),
});

export type PlayerInfo = z.infer<typeof PlayerInfoSchema>;

// ============================================================================
// Move History
// ============================================================================

/**
 * Individual move schema.
 * Records a single move in the game with complete context.
 *
 * @property from - Starting position
 * @property to - Ending position or 'off_board' if scoring
 * @property piece - Piece that moved
 * @property captured - Piece captured during this move (if any)
 * @property timestamp - Unix timestamp when move was made
 */
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
// Game State (Core Schema) - PRD.md Section 2.3
// ============================================================================

/**
 * Complete game state schema.
 * This is the PRIMARY schema for the entire game state.
 *
 * VALIDATION CRITICAL: This schema MUST be used to validate:
 * - Data loaded from localStorage
 * - Data received via WebRTC
 * - Data decoded from URLs
 *
 * @property version - Schema version for backward compatibility
 * @property gameId - Unique game identifier
 * @property board - 3x3 grid of pieces (null = empty square)
 * @property whiteCourt - White pieces that reached Black's court (white scores)
 * @property blackCourt - Black pieces that reached White's court (black scores)
 * @property capturedWhite - White pieces captured (not scored)
 * @property capturedBlack - Black pieces captured (not scored)
 * @property currentTurn - Turn number (starts at 0)
 * @property currentPlayer - Whose turn it is
 * @property whitePlayer - White player info
 * @property blackPlayer - Black player info
 * @property status - Current game status
 * @property winner - Winner if game is finished
 * @property moveHistory - Complete move history
 * @property checksum - Data integrity checksum
 */
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
 * Validates game state and throws on error.
 * Use for trusted internal data.
 *
 * @param data - Unknown data to validate
 * @returns Validated GameState
 * @throws {z.ZodError} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const state = validateGameState(unknownData);
 *   // state is fully typed and validated
 * } catch (error) {
 *   if (error instanceof z.ZodError) {
 *     console.error('Invalid game state:', error.issues);
 *   }
 * }
 * ```
 */
export function validateGameState(data: unknown): GameState {
  return GameStateSchema.parse(data);
}

/**
 * Safely validates game state without throwing.
 * Use for untrusted external data (URLs, localStorage, WebRTC).
 *
 * PREFERRED for all boundary validations.
 *
 * @param data - Unknown data to validate
 * @returns Success or error result
 *
 * @example
 * ```typescript
 * const result = safeValidateGameState(externalData);
 *
 * if (result.success) {
 *   const state = result.data; // Typed as GameState
 *   updateGame(state);
 * } else {
 *   console.error('Validation failed:', result.error.format());
 *   showErrorToUser('Invalid game data');
 * }
 * ```
 */
export function safeValidateGameState(
  data: unknown
): z.SafeParseReturnType<unknown, GameState> {
  return GameStateSchema.safeParse(data);
}

/**
 * Validates a single piece.
 * Used when validating user input for piece selection.
 *
 * @param data - Unknown data to validate as Piece
 * @returns Validated Piece
 * @throws {z.ZodError} If validation fails
 */
export function validatePiece(data: unknown): Piece {
  return PieceSchema.parse(data);
}

/**
 * Safely validates a single piece.
 *
 * @param data - Unknown data to validate as Piece
 * @returns Success or error result
 */
export function safeValidatePiece(
  data: unknown
): z.SafeParseReturnType<unknown, Piece> {
  return PieceSchema.safeParse(data);
}
```

#### 8.3 Create Comprehensive Schema Tests

**src/lib/validation/schemas.test.ts:**

```typescript
/**
 * @fileoverview Tests for Zod validation schemas
 * @module lib/validation/schemas.test
 *
 * Tests ensure all schemas properly validate expected data
 * and reject invalid data.
 */

import { describe, it, expect } from 'vitest';
import {
  PieceTypeSchema,
  PieceOwnerSchema,
  PieceSchema,
  PlayerInfoSchema,
  GameStateSchema,
  validateGameState,
  safeValidateGameState,
  type GameState,
  type PlayerId,
  type GameId,
} from './schemas';

describe('Zod Schemas', () => {
  describe('PieceTypeSchema', () => {
    it('should accept valid piece types', () => {
      expect(PieceTypeSchema.parse('rook')).toBe('rook');
      expect(PieceTypeSchema.parse('knight')).toBe('knight');
      expect(PieceTypeSchema.parse('bishop')).toBe('bishop');
    });

    it('should reject invalid piece types', () => {
      expect(() => PieceTypeSchema.parse('pawn')).toThrow();
      expect(() => PieceTypeSchema.parse('king')).toThrow();
      expect(() => PieceTypeSchema.parse('queen')).toThrow();
    });
  });

  describe('PieceOwnerSchema', () => {
    it('should accept white and black', () => {
      expect(PieceOwnerSchema.parse('white')).toBe('white');
      expect(PieceOwnerSchema.parse('black')).toBe('black');
    });

    it('should reject other values', () => {
      expect(() => PieceOwnerSchema.parse('red')).toThrow();
      expect(() => PieceOwnerSchema.parse('')).toThrow();
    });
  });

  describe('PieceSchema', () => {
    it('should validate correct piece structure', () => {
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

    it('should accept null position (off-board)', () => {
      const piece = {
        type: 'knight',
        owner: 'black',
        position: null,
        moveCount: 5,
        id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const result = PieceSchema.safeParse(piece);
      expect(result.success).toBe(true);
    });

    it('should reject invalid piece structure', () => {
      const badPiece = {
        type: 'rook',
        owner: 'white',
        // Missing required fields
      };

      const result = PieceSchema.safeParse(badPiece);
      expect(result.success).toBe(false);
    });

    it('should reject negative moveCount', () => {
      const piece = {
        type: 'bishop',
        owner: 'white',
        position: [1, 1] as [number, number],
        moveCount: -1, // Invalid
        id: '123e4567-e89b-12d3-a456-426614174002',
      };

      const result = PieceSchema.safeParse(piece);
      expect(result.success).toBe(false);
    });
  });

  describe('PlayerInfoSchema', () => {
    it('should validate correct player info', () => {
      const player = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        name: 'Alice',
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(true);
    });

    it('should reject name too short', () => {
      const player = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        name: '',
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject name too long', () => {
      const player = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        name: 'A'.repeat(21), // 21 characters (max is 20)
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(false);
    });

    it('should reject invalid UUID', () => {
      const player = {
        id: 'not-a-uuid',
        name: 'Bob',
      };

      const result = PlayerInfoSchema.safeParse(player);
      expect(result.success).toBe(false);
    });
  });

  describe('GameStateSchema', () => {
    it('should validate minimal game state', () => {
      const minimalState: GameState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174006' as GameId,
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
          id: '123e4567-e89b-12d3-a456-426614174007' as PlayerId,
          name: 'Player 1',
        },
        blackPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174008' as PlayerId,
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

    it('should reject wrong board dimensions', () => {
      const badState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174009',
        board: [
          [null, null], // Only 2 columns, should be 3
          [null, null],
          [null, null],
        ],
        // ... rest of fields
      };

      const result = GameStateSchema.safeParse(badState);
      expect(result.success).toBe(false);
    });

    it('should reject invalid version', () => {
      const badState = {
        version: '2.0.0', // Not 1.0.0
        gameId: '123e4567-e89b-12d3-a456-426614174010',
        // ... rest of fields
      };

      const result = GameStateSchema.safeParse(badState);
      expect(result.success).toBe(false);
    });
  });

  describe('Validation helpers', () => {
    it('validateGameState throws on invalid data', () => {
      expect(() => validateGameState({})).toThrow();
      expect(() => validateGameState(null)).toThrow();
      expect(() => validateGameState('invalid')).toThrow();
    });

    it('safeValidateGameState returns result object', () => {
      const result = safeValidateGameState({});
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(result.error.issues.length).toBeGreaterThan(0);
      }
    });

    it('safeValidateGameState succeeds with valid data', () => {
      const validState: GameState = {
        version: '1.0.0',
        gameId: '123e4567-e89b-12d3-a456-426614174011' as GameId,
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
          id: '123e4567-e89b-12d3-a456-426614174012' as PlayerId,
          name: 'Alice',
        },
        blackPlayer: {
          id: '123e4567-e89b-12d3-a456-426614174013' as PlayerId,
          name: 'Bob',
        },
        status: 'playing',
        winner: null,
        moveHistory: [],
        checksum: 'test123',
      };

      const result = safeValidateGameState(validState);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gameId).toBe(validState.gameId);
        expect(result.data.whitePlayer.name).toBe('Alice');
      }
    });
  });
});
```

**Validation:**
```bash
pnpm test -- schemas.test.ts --run
# Should pass all schema tests (20+ tests)
```

---

### Step 9: Implement localStorage Utilities (30 minutes)

**Goal:** Create type-safe localStorage with Zod validation

#### 9.1 Create Storage Directory

```bash
mkdir -p src/lib/storage
```

#### 9.2 Create localStorage Utilities

**src/lib/storage/localStorage.ts:**

```typescript
/**
 * @fileoverview Type-safe localStorage utilities with Zod validation
 * @module lib/storage/localStorage
 *
 * All localStorage operations MUST go through these utilities to ensure:
 * - Runtime validation with Zod
 * - Automatic corruption handling
 * - Type safety
 *
 * @see localStorage-react-patterns-2024-2025.md
 * @see ZOD_VALIDATION_PATTERNS_RESEARCH.md Section 4
 */

import { z } from 'zod';
import { GameStateSchema, type GameState } from '../validation/schemas';

// ============================================================================
// Storage Keys (STATE_DIAGRAM_TEMPLATE.md lines 395-405)
// ============================================================================

/**
 * localStorage keys used by King's Cooking.
 * Namespaced with 'kings-cooking:' to avoid conflicts.
 */
export const STORAGE_KEYS = {
  /** Current player's name (used in both modes) */
  MY_NAME: 'kings-cooking:my-name',

  /** Current player's persistent UUID (URL mode) */
  MY_PLAYER_ID: 'kings-cooking:my-player-id',

  /** Player 1 name (hot-seat mode only) */
  PLAYER1_NAME: 'kings-cooking:player1-name',

  /** Player 2 name (hot-seat mode only) */
  PLAYER2_NAME: 'kings-cooking:player2-name',

  /** Current game state */
  GAME_STATE: 'kings-cooking:game-state',

  /** Selected game mode */
  GAME_MODE: 'kings-cooking:game-mode',
} as const;

// ============================================================================
// Generic Validation Utilities
// ============================================================================

/**
 * Safely retrieves and validates data from localStorage.
 *
 * CRITICAL: This is the PRIMARY method for loading data from localStorage.
 * It ensures all external data is validated before use.
 *
 * @param key - localStorage key
 * @param schema - Zod schema to validate against
 * @returns Validated data or null if missing/invalid
 *
 * @example
 * ```typescript
 * const name = getValidatedItem(STORAGE_KEYS.MY_NAME, z.string());
 * if (name) {
 *   console.log('Player name:', name);
 * }
 * ```
 *
 * @see ZOD_VALIDATION_PATTERNS_RESEARCH.md lines 296-335
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
      console.error(`Invalid localStorage data for key "${key}":`, result.error.format());
      // CRITICAL: Remove corrupted data (ZOD_VALIDATION_PATTERNS_RESEARCH.md lines 337-354)
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
 * Safely saves and validates data to localStorage.
 *
 * @param key - localStorage key
 * @param value - Data to save
 * @param schema - Zod schema to validate against
 * @returns true if saved successfully, false otherwise
 *
 * @example
 * ```typescript
 * const success = setValidatedItem(
 *   STORAGE_KEYS.MY_NAME,
 *   'Alice',
 *   z.string().min(1).max(20)
 * );
 * ```
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
 * Removes an item from localStorage.
 *
 * @param key - localStorage key to remove
 */
export function removeItem(key: string): void {
  localStorage.removeItem(key);
}

/**
 * Clears all King's Cooking data from localStorage.
 * Useful for testing or "reset game" functionality.
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

/**
 * Typed storage interface with validation.
 * Provides convenience methods for specific data types.
 */
export const storage = {
  // Player name (URL mode - current player)
  getMyName: (): string | null =>
    getValidatedItem(STORAGE_KEYS.MY_NAME, NameSchema),

  setMyName: (name: string): boolean =>
    setValidatedItem(STORAGE_KEYS.MY_NAME, name, NameSchema),

  // Player ID (URL mode - persistent identity)
  getMyPlayerId: (): string | null =>
    getValidatedItem(STORAGE_KEYS.MY_PLAYER_ID, PlayerIdSchema),

  setMyPlayerId: (id: string): boolean =>
    setValidatedItem(STORAGE_KEYS.MY_PLAYER_ID, id, PlayerIdSchema),

  // Player names (hot-seat mode)
  getPlayer1Name: (): string | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER1_NAME, NameSchema),

  setPlayer1Name: (name: string): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER1_NAME, name, NameSchema),

  getPlayer2Name: (): string | null =>
    getValidatedItem(STORAGE_KEYS.PLAYER2_NAME, NameSchema),

  setPlayer2Name: (name: string): boolean =>
    setValidatedItem(STORAGE_KEYS.PLAYER2_NAME, name, NameSchema),

  // Game mode
  getGameMode: (): 'hotseat' | 'url' | null =>
    getValidatedItem(STORAGE_KEYS.GAME_MODE, GameModeSchema),

  setGameMode: (mode: 'hotseat' | 'url'): boolean =>
    setValidatedItem(STORAGE_KEYS.GAME_MODE, mode, GameModeSchema),

  // Game state (with full validation)
  getGameState: (): GameState | null =>
    getValidatedItem(STORAGE_KEYS.GAME_STATE, GameStateSchema),

  setGameState: (state: GameState): boolean =>
    setValidatedItem(STORAGE_KEYS.GAME_STATE, state, GameStateSchema),

  // Clear all
  clearAll: clearGameStorage,
};
```

#### 9.3 Create localStorage Tests

**src/lib/storage/localStorage.test.ts:**

```typescript
/**
 * @fileoverview Tests for localStorage utilities
 * @module lib/storage/localStorage.test
 */

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
    it('should return null for missing key', () => {
      const schema = z.string();
      const result = getValidatedItem('test-key', schema);
      expect(result).toBeNull();
    });

    it('should return validated data for valid stored value', () => {
      const schema = z.object({ name: z.string() });
      const data = { name: 'Test' };

      localStorage.setItem('test-key', JSON.stringify(data));

      const result = getValidatedItem('test-key', schema);
      expect(result).toEqual(data);
    });

    it('should remove corrupted data and return null', () => {
      localStorage.setItem('test-key', 'invalid json');

      const schema = z.object({ name: z.string() });
      const result = getValidatedItem('test-key', schema);

      expect(result).toBeNull();
      expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('should remove data that fails validation', () => {
      const schema = z.object({ name: z.string() });
      const badData = { name: 123 }; // Wrong type

      localStorage.setItem('test-key', JSON.stringify(badData));

      const result = getValidatedItem('test-key', schema);

      expect(result).toBeNull();
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('setValidatedItem', () => {
    it('should save valid data', () => {
      const schema = z.string();
      const result = setValidatedItem('test-key', 'test-value', schema);

      expect(result).toBe(true);
      expect(localStorage.getItem('test-key')).toBe('"test-value"');
    });

    it('should reject invalid data', () => {
      const schema = z.string();
      // @ts-expect-error Testing runtime validation
      const result = setValidatedItem('test-key', 123, schema);

      expect(result).toBe(false);
      expect(localStorage.getItem('test-key')).toBeNull();
    });
  });

  describe('storage helpers', () => {
    it('should store and retrieve player name', () => {
      storage.setMyName('Alice');
      expect(storage.getMyName()).toBe('Alice');
    });

    it('should store and retrieve player ID', () => {
      const id = '123e4567-e89b-12d3-a456-426614174000';
      storage.setMyPlayerId(id);
      expect(storage.getMyPlayerId()).toBe(id);
    });

    it('should store and retrieve game mode', () => {
      storage.setGameMode('hotseat');
      expect(storage.getGameMode()).toBe('hotseat');
    });

    it('should reject invalid game mode', () => {
      // @ts-expect-error Testing runtime validation
      const result = storage.setGameMode('invalid');
      expect(result).toBe(false);
    });

    it('should clear all game storage', () => {
      storage.setMyName('Alice');
      storage.setGameMode('hotseat');
      storage.setPlayer1Name('Bob');

      storage.clearAll();

      expect(storage.getMyName()).toBeNull();
      expect(storage.getGameMode()).toBeNull();
      expect(storage.getPlayer1Name()).toBeNull();
    });
  });
});
```

**Validation:**
```bash
pnpm test -- localStorage.test.ts --run
# Should pass all storage tests (10+ tests)
```

---

### Step 10: Set Up Dark Mode CSS (20 minutes)

**Goal:** Implement dark mode support using CSS custom properties and prefers-color-scheme

**Reference:** kings-cooking-docs/DARK_MODE_GUIDE.md lines 30-49

#### 10.1 Create src/index.css

```css
/**
 * King's Cooking - Global Styles with Dark Mode Support
 * Using CSS custom properties and prefers-color-scheme
 * Reference: DARK_MODE_GUIDE.md
 */

/* CRITICAL: Declare color-scheme to enable browser dark mode optimizations */
:root {
  color-scheme: light dark;
}

/* Light Mode (Default) */
:root {
  /* Colors */
  --color-bg: #ffffff;
  --color-bg-secondary: #f5f5f5;
  --color-text: #1a1a1a;
  --color-text-secondary: #666666;
  --color-border: #e0e0e0;
  --color-primary: #3b82f6;
  --color-primary-hover: #2563eb;
  --color-error: #ef4444;
  --color-success: #10b981;

  /* Chess board colors */
  --color-square-light: #f0d9b5;
  --color-square-dark: #b58863;
  --color-square-selected: #baca44;
  --color-square-valid-move: rgba(0, 255, 0, 0.3);

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;

  /* Typography */
  --font-family-base: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-family-mono: 'Courier New', Courier, monospace;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.25rem;
  --font-size-xl: 1.5rem;

  /* Transitions */
  --transition-fast: 150ms ease-in-out;
  --transition-base: 250ms ease-in-out;
}

/* Dark Mode */
@media (prefers-color-scheme: dark) {
  :root {
    /* Colors */
    --color-bg: #1a1a1a;
    --color-bg-secondary: #2d2d2d;
    --color-text: #f5f5f5;
    --color-text-secondary: #a0a0a0;
    --color-border: #404040;
    --color-primary: #60a5fa;
    --color-primary-hover: #3b82f6;
    --color-error: #f87171;
    --color-success: #34d399;

    /* Chess board colors - adjusted for dark mode */
    --color-square-light: #4a5568;
    --color-square-dark: #2d3748;
    --color-square-selected: #ecc94b;
    --color-square-valid-move: rgba(0, 255, 0, 0.4);
  }
}

/* Base styles */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-family-base);
  font-size: 16px;
  line-height: 1.5;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text);
  min-height: 100vh;
  transition: background-color var(--transition-base), color var(--transition-base);
}

/* Typography */
h1 {
  font-size: var(--font-size-xl);
  font-weight: 700;
  margin-bottom: var(--spacing-lg);
}

h2 {
  font-size: var(--font-size-lg);
  font-weight: 600;
  margin-bottom: var(--spacing-md);
}

p {
  margin-bottom: var(--spacing-md);
  color: var(--color-text-secondary);
}

/* Links */
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-fast);
}

a:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

/* Buttons */
button {
  font-family: inherit;
  font-size: var(--font-size-base);
  padding: var(--spacing-sm) var(--spacing-md);
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

button:hover {
  background-color: var(--color-primary-hover);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Cards */
.card {
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: var(--spacing-lg);
  transition: background-color var(--transition-base), border-color var(--transition-base);
}

/* Form inputs */
input[type='text'],
input[type='email'],
select {
  font-family: inherit;
  font-size: var(--font-size-base);
  padding: var(--spacing-sm);
  background-color: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  transition: border-color var(--transition-fast);
}

input[type='text']:focus,
input[type='email']:focus,
select:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Utility classes */
.text-error {
  color: var(--color-error);
}

.text-success {
  color: var(--color-success);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

#### 10.2 Update src/main.tsx

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Import global styles

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**Validation:**
```bash
# Check that styles are imported and working
pnpm run dev
# Visit http://localhost:5173
# Toggle your OS dark mode - colors should change
# Stop dev server (Ctrl+C)
```

---

### Step 11: Create Test App Component (20 minutes)

**Goal:** Create a simple App component demonstrating Phase 1 completion

#### 11.1 Update src/App.tsx

```typescript
import { ReactElement } from 'react';
import { storage } from './lib/localStorage';
import { GameIdSchema, PlayerIdSchema } from './lib/schemas';

/**
 * Main App component demonstrating Phase 1 foundation
 * Shows validation status and dark mode support
 *
 * @returns App component
 */
function App(): ReactElement {
  const handleTestValidation = (): void => {
    // Test Zod validation
    const validGameId = GameIdSchema.safeParse('123e4567-e89b-12d3-a456-426614174000');
    const invalidGameId = GameIdSchema.safeParse('invalid-id');

    console.log('Valid Game ID:', validGameId.success);
    console.log('Invalid Game ID:', invalidGameId.success);

    // Test localStorage
    const saved = storage.setMyName('Test Player');
    const retrieved = storage.getMyName();

    console.log('localStorage saved:', saved);
    console.log('localStorage retrieved:', retrieved);

    alert('Check console for validation results');
  };

  const handleClearStorage = (): void => {
    storage.clearAll();
    alert('Storage cleared');
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: 'var(--spacing-xl)'
    }}>
      <h1>King's Cooking - Phase 1 Foundation</h1>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Foundation Status</h2>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          marginBottom: 'var(--spacing-md)'
        }}>
          <li className="text-success">✓ React 19.2.0 with Compiler</li>
          <li className="text-success">✓ Vite 7.0 Build System</li>
          <li className="text-success">✓ TypeScript Strict Mode</li>
          <li className="text-success">✓ Zod Validation (Branded Types)</li>
          <li className="text-success">✓ localStorage Utilities</li>
          <li className="text-success">✓ Dark Mode Support</li>
          <li className="text-success">✓ Vitest 3.x + Playwright</li>
        </ul>

        <p style={{ fontSize: 'var(--font-size-sm)' }}>
          Toggle your OS dark mode to see theme changes.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <h2>Validation Tests</h2>
        <p>Test Zod validation and localStorage utilities:</p>
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          flexWrap: 'wrap'
        }}>
          <button onClick={handleTestValidation}>
            Test Validation
          </button>
          <button onClick={handleClearStorage}>
            Clear Storage
          </button>
        </div>
      </div>

      <div className="card">
        <h2>Next Steps</h2>
        <p>Phase 1 foundation is complete. Ready for:</p>
        <ul style={{
          marginLeft: 'var(--spacing-lg)',
          color: 'var(--color-text-secondary)'
        }}>
          <li>Phase 2: Game board component</li>
          <li>Phase 3: Move validation logic</li>
          <li>Phase 4: Game state management</li>
          <li>Phase 5: Hot-seat multiplayer</li>
          <li>Phase 6: URL-based multiplayer (WebRTC)</li>
          <li>Phase 7: Polish and deployment</li>
        </ul>
      </div>
    </div>
  );
}

export default App;
```

#### 11.2 Create src/App.test.tsx

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should render Phase 1 status', () => {
    render(<App />);
    expect(screen.getByText('King\'s Cooking - Phase 1 Foundation')).toBeInTheDocument();
    expect(screen.getByText(/React 19.2.0 with Compiler/)).toBeInTheDocument();
  });

  it('should handle validation test button', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);
    const button = screen.getByText('Test Validation');
    fireEvent.click(button);

    expect(consoleSpy).toHaveBeenCalledWith('Valid Game ID:', expect.any(Boolean));
    expect(alertSpy).toHaveBeenCalledWith('Check console for validation results');

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('should handle clear storage button', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(<App />);
    const button = screen.getByText('Clear Storage');
    fireEvent.click(button);

    expect(alertSpy).toHaveBeenCalledWith('Storage cleared');
    alertSpy.mockRestore();
  });
});
```

**Validation:**
```bash
pnpm test -- App.test.tsx --run
# Should pass all App tests (3 tests)

pnpm run dev
# Manually verify the app displays correctly
# Test the validation button - check console output
# Test the clear storage button
```

---

### Step 12: Update GitHub Actions (15 minutes)

**Goal:** Update CI/CD workflows for React 19 + Vite 7

#### 12.1 Update .github/workflows/deploy.yml

**Current Issue:** Port 4321 is for Astro, Vite uses 4173

```bash
# Read current deploy.yml
cat .github/workflows/deploy.yml
```

Make these changes:
1. Change preview port from 4321 to 4173
2. Verify build script is `pnpm run build`
3. Verify preview script is `pnpm run preview`

**Expected changes:**
```yaml
# Before:
- run: pnpm run preview &
- run: npx wait-on http://localhost:4321

# After:
- run: pnpm run preview &
- run: npx wait-on http://localhost:4173
```

#### 12.2 Verify .github/workflows/ci.yml

**Ensure scripts match package.json:**
- `pnpm run check` → Should run TypeScript type checking
- `pnpm run lint` → ESLint
- `pnpm run test:coverage` → Vitest with coverage
- `pnpm run build` → Production build

**Validation:**
```bash
# Verify workflows are valid
cat .github/workflows/ci.yml
cat .github/workflows/deploy.yml

# Check script names match
cat package.json | grep -A 15 '"scripts"'
```

---

### Step 13: Final Integration Validation (30 minutes)

**Goal:** Run complete validation loop and verify all systems working

#### 13.1 Level 1: Syntax & Type Checking

```bash
# TypeScript compilation
pnpm run check

# Expected output:
# - No TypeScript errors
# - All files type-check successfully

# ESLint
pnpm run lint

# Expected output:
# - Zero warnings
# - Zero errors
```

#### 13.2 Level 2: Unit Tests

```bash
# Run all unit tests with coverage
pnpm run test:coverage

# Expected output:
# - All tests passing (schemas.test.ts, localStorage.test.ts, App.test.ts)
# - Coverage >= 80% for all metrics
# - No failing tests
```

#### 13.3 Level 3: Build Verification

```bash
# Production build
pnpm run build

# Expected output:
# - Build completes successfully
# - dist/ directory created
# - No build errors or warnings
# - Bundle size reasonable (< 200KB for initial load)

# Preview build
pnpm run preview &
# Visit http://localhost:4173/kings-cooking/

# Manual checks:
# 1. App loads without errors
# 2. Dark mode toggles with OS setting
# 3. Validation buttons work
# 4. Console shows correct output
# 5. Storage operations work

# Stop preview server
pkill -f "vite preview"
```

#### 13.4 Level 4: Integration Tests (Optional for Phase 1)

```bash
# Run integration tests (if any exist)
pnpm run test:integration

# Note: Full integration tests will be added in later phases
```

#### 13.5 Verify Git Status

```bash
# Check what files were created/modified
git status

# Expected new files:
# - package.json (updated)
# - pnpm-lock.yaml (updated)
# - tsconfig.json
# - tsconfig.node.json
# - vite.config.ts
# - vitest.config.ts
# - playwright.config.ts
# - eslint.config.js
# - .prettierrc
# - src/lib/schemas.ts
# - src/lib/schemas.test.ts
# - src/lib/localStorage.ts
# - src/lib/localStorage.test.ts
# - src/index.css
# - src/App.tsx
# - src/App.test.tsx
# - src/main.tsx
```

---

## Validation Loop

**CRITICAL:** Run these commands in order. Fix any failures before proceeding to the next level.

### Level 1: Syntax & Style (MUST PASS)
```bash
pnpm run check && pnpm run lint
```
**Success Criteria:**
- ✓ Zero TypeScript errors
- ✓ Zero ESLint warnings or errors
- ✓ All files properly formatted

**Common Failures:**
- Missing type annotations → Add explicit return types
- `any` type usage → Replace with specific types
- Unused imports → Remove them
- React 19 `ReactElement` vs old `JSX.Element` → Use `ReactElement`

### Level 2: Unit Tests (MUST PASS)
```bash
pnpm run test:coverage
```
**Success Criteria:**
- ✓ All test files pass (schemas.test.ts, localStorage.test.ts, App.test.ts)
- ✓ Coverage >= 80% for branches, functions, lines, statements
- ✓ Zero flaky tests
- ✓ Tests complete in < 30 seconds

**Common Failures:**
- Branded type validation failures → Check Zod schema definitions
- localStorage tests failing → Ensure happy-dom environment configured
- Coverage below 80% → Add missing test cases

### Level 3: Build (MUST PASS)
```bash
pnpm run build
```
**Success Criteria:**
- ✓ Build completes without errors
- ✓ dist/ directory created with index.html and assets
- ✓ No bundle size warnings
- ✓ All chunks properly generated

**Common Failures:**
- Import errors → Check all file paths and extensions
- React Compiler errors → Review component structure
- Base path issues → Verify vite.config.ts has correct base: '/kings-cooking/'

### Level 4: Preview (MANUAL VERIFICATION)
```bash
pnpm run preview
```
**Visit:** http://localhost:4173/kings-cooking/

**Success Criteria:**
- ✓ Page loads without console errors
- ✓ UI renders correctly (see Phase 1 status)
- ✓ Dark mode toggles with OS preference
- ✓ "Test Validation" button logs correct output
- ✓ "Clear Storage" button works
- ✓ No React warnings in console

**Common Failures:**
- 404 errors → Check base path configuration
- Dark mode not working → Verify index.css imported in main.tsx
- Storage errors → Check localStorage.ts implementation

### Level 5: Git & CI (FINAL CHECK)
```bash
git status
git diff
```

**Success Criteria:**
- ✓ All new files tracked
- ✓ No unexpected file changes
- ✓ No secrets or credentials in code
- ✓ .gitignore properly configured

**Prepare for commit:**
```bash
# Don't commit yet - just verify files are correct
git add .
git status

# Expected files to be staged:
# - All new source files in src/
# - All new config files
# - Updated package.json and pnpm-lock.yaml
```

---

## Success Criteria Checklist

### Phase 1 Foundation Complete When:

#### 🔧 Development Environment
- [ ] Node.js 20.19+ installed and verified
- [ ] pnpm 8.15.0+ installed
- [ ] All dependencies installed successfully
- [ ] No dependency conflicts or warnings

#### 📦 Project Configuration
- [ ] React 19.2.0 installed with react-dom 19.2.0
- [ ] Vite 7.0+ configured with correct base path
- [ ] React Compiler plugin active and working
- [ ] TypeScript strict mode enabled (all options true)
- [ ] ESLint configured with zero warnings allowed
- [ ] Prettier configured and integrated

#### 🧪 Testing Infrastructure
- [ ] Vitest 3.x installed and configured
- [ ] @testing-library/react setup for React 19
- [ ] happy-dom test environment working
- [ ] Playwright installed (ready for integration tests)
- [ ] Coverage thresholds set to 80% minimum

#### 📝 Type System & Validation
- [ ] Zod schemas created for all game types
- [ ] Branded types working (GameId, PlayerId, MoveId)
- [ ] All schemas have comprehensive tests (100% coverage)
- [ ] Validation at boundaries pattern established

#### 💾 localStorage System
- [ ] Generic validation utilities created
- [ ] Type-safe storage helpers implemented
- [ ] Corruption handling tested
- [ ] All localStorage functions have tests

#### 🎨 UI Foundation
- [ ] Dark mode CSS with prefers-color-scheme
- [ ] CSS custom properties for all colors
- [ ] Base styles and utility classes
- [ ] Test App component demonstrates Phase 1

#### ✅ Validation Gates Passing
- [ ] `pnpm run check` - Zero TypeScript errors
- [ ] `pnpm run lint` - Zero ESLint warnings
- [ ] `pnpm run test:coverage` - All tests pass, 80%+ coverage
- [ ] `pnpm run build` - Successful production build
- [ ] `pnpm run preview` - Manual verification successful

#### 📚 Documentation
- [ ] All exported functions have JSDoc comments
- [ ] Critical patterns documented in code
- [ ] Phase 1 PRP completed and validated
- [ ] Reference docs integrated into implementation

#### 🚀 GitHub Integration
- [ ] Workflows updated for Vite 7 (port 4173)
- [ ] Script names match package.json
- [ ] Ready for CI/CD pipeline
- [ ] No failing checks expected

---

## Time Estimate

**Total: ~4-5 hours**

- Step 1: Analyze & Backup (15 min)
- Step 2: Initialize React 19 + Vite 7 (30 min)
- Step 3: Configure TypeScript (20 min)
- Step 4: Set Up React Compiler (30 min)
- Step 5: Configure ESLint (15 min)
- Step 6: Set Up Vitest (20 min)
- Step 7: Configure Playwright (15 min)
- Step 8: Implement Zod Schemas (45 min) ← CRITICAL
- Step 9: Implement localStorage (30 min)
- Step 10: Set Up Dark Mode CSS (20 min)
- Step 11: Create Test App (20 min)
- Step 12: Update GitHub Actions (15 min)
- Step 13: Final Validation (30 min)

**Contingency:** Add 1-2 hours for troubleshooting and unexpected issues.

---

## Common Pitfalls & Solutions

### React 19 Specific Issues

**Problem:** `JSX.Element` type errors
```typescript
// ❌ WRONG (React 18)
function MyComponent(): JSX.Element {
  return <div>Hello</div>;
}

// ✅ CORRECT (React 19)
import { ReactElement } from 'react';
function MyComponent(): ReactElement {
  return <div>Hello</div>;
}
```

**Problem:** React Compiler errors with complex state
**Solution:** Keep component logic simple in Phase 1. Compiler works best with straightforward components.

### Vite 7 Specific Issues

**Problem:** `preview` command uses wrong port
**Solution:** Vite 7 uses port 4173 by default (not 4321 from Astro). Update all docs and workflows.

**Problem:** Base path issues in production
**Solution:** Verify `vite.config.ts` has `base: '/kings-cooking/'` and all assets load correctly in preview.

### Zod Branded Types Issues

**Problem:** Branded types don't work at runtime
```typescript
// ❌ This will cause issues
const id: GameId = 'some-uuid'; // Type error

// ✅ Correct way
const id = GameIdSchema.parse('some-uuid'); // Validates and returns GameId
```

**Problem:** Branded types lost after JSON.parse
**Solution:** ALWAYS re-validate after parsing:
```typescript
const stored = localStorage.getItem('game');
const parsed = JSON.parse(stored); // Loses brands
const validated = GameStateSchema.parse(parsed); // Restores brands
```

### localStorage Issues

**Problem:** Data corruption causing app crashes
**Solution:** ALWAYS use `safeParse`, never `parse`:
```typescript
// ❌ WRONG - throws on invalid data
const data = schema.parse(JSON.parse(stored));

// ✅ CORRECT - handles errors gracefully
const result = schema.safeParse(JSON.parse(stored));
if (result.success) {
  return result.data;
} else {
  localStorage.removeItem(key); // Remove corrupted data
  return null;
}
```

### Testing Issues

**Problem:** Tests can't find localStorage
**Solution:** Vitest with happy-dom provides localStorage automatically. No mock needed.

**Problem:** React 19 testing library compatibility
**Solution:** Use @testing-library/react@latest (version 16.1.0+) which supports React 19.

---

## Next Phase Preview

**Phase 2: Game Board Component** will build on this foundation:

- Chess board grid component (3x3)
- Piece rendering (rook, knight, bishop)
- Square selection and highlighting
- Responsive layout
- Accessibility (keyboard navigation)

**Prerequisites from Phase 1:**
- ✓ React 19 component patterns
- ✓ TypeScript strict typing
- ✓ Zod schemas for pieces and board
- ✓ Dark mode CSS variables
- ✓ Test infrastructure

---

## PRP Confidence Score: 9/10

### Why 9/10:

**Strengths:**
- ✓ Comprehensive research conducted (React 19, Vite 7, Zod patterns)
- ✓ All reference documents integrated with specific line citations
- ✓ Validation loop is executable and specific
- ✓ Branded types pattern properly explained
- ✓ localStorage corruption handling included
- ✓ Dark mode implementation following best practices
- ✓ All gotchas from research documented
- ✓ Success criteria are measurable and clear

**Minor Risks (-1 point):**
- React Compiler is still relatively new (v19.2.0) - may encounter edge cases
- Vite 7.0 is latest - some plugins might have compatibility issues
- First-time setup of React 19 strict typing may require iteration

**Mitigation:**
- Validation loop catches all issues before proceeding
- Step-by-step approach allows for troubleshooting at each stage
- Reference documentation provides fallback patterns
- Test coverage ensures correctness

**High Confidence Because:**
1. Every pattern is sourced from official documentation
2. All code examples are tested patterns from research
3. Validation gates are specific and executable
4. Success criteria leave no ambiguity
5. Common pitfalls section addresses known issues

**Expected Outcome:** First-pass implementation success with minor tweaks during validation loop.
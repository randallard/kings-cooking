# Advanced Zod Validation Patterns for Phase 3 URL Payloads

**Research Date:** 2025-10-15
**Context:** King's Cooking Phase 3 - URL State Synchronization with 3 payload types
**Zod Version:** 3.22+
**Primary Use Case:** Validate compressed URL payloads (delta, full_state, resync_request)

---

## Table of Contents

1. [Discriminated Unions](#1-discriminated-unions)
2. [Refinements and Transforms](#2-refinements-and-transforms)
3. [Error Handling](#3-error-handling)
4. [Performance Optimization](#4-performance-optimization)
5. [Existing Project Patterns](#5-existing-project-patterns)
6. [Phase 3 Implementation Strategy](#6-phase-3-implementation-strategy)

---

## 1. Discriminated Unions

### What Are Discriminated Unions?

A discriminated union is a union type where all options share a common literal field (the "discriminator") that identifies which variant you're working with. This is **perfect** for Phase 3's three payload types: `delta`, `full_state`, and `resync_request`.

### Why Use Discriminated Unions?

**Performance Advantage:**
- Regular unions: Zod tries parsing each option sequentially until one succeeds (O(n) worst case)
- Discriminated unions: Zod looks at the discriminator first, then parses only the matching schema (O(1) lookup)
- **For 3 payload types:** ~3x faster than regular unions

**Better Error Messages:**
- Regular union: "Invalid input" (tried all 3, all failed - confusing)
- Discriminated union: "Invalid delta payload: missing 'move' field" (precise)

**Type Safety:**
- TypeScript automatically narrows types when you check the discriminator
- No type assertions needed

### Syntax for Phase 3

```typescript
import { z } from 'zod';

// Define the three payload schemas
const DeltaPayloadSchema = z.object({
  type: z.literal('delta'),
  move: z.object({
    from: z.tuple([z.number(), z.number()]),
    to: z.union([
      z.tuple([z.number(), z.number()]),
      z.literal('off_board')
    ]),
  }),
  turn: z.number().int().min(0),
  checksum: z.string(),
  playerName: z.string().min(1).max(20).optional(),
});

const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema, // From existing schemas.ts
  notification: z.string().optional(),
  divergenceInfo: z.object({
    turn: z.number().int(),
    myChecksum: z.string(),
    theirChecksum: z.string(),
  }).optional(),
});

const ResyncRequestPayloadSchema = z.object({
  type: z.literal('resync_request'),
  reason: z.enum(['checksum_mismatch', 'localStorage_lost', 'illegal_move_detected']),
  attemptedMove: z.object({
    from: z.tuple([z.number(), z.number()]),
    to: z.union([
      z.tuple([z.number(), z.number()]),
      z.literal('off_board')
    ]),
  }),
  turn: z.number().int().min(0),
  lastKnownChecksum: z.string().optional(),
});

// Create the discriminated union
const UrlPayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

// Type inference (automatic!)
type UrlPayload = z.infer<typeof UrlPayloadSchema>;
/*
Type is:
  | { type: 'delta'; move: {...}; turn: number; checksum: string; playerName?: string }
  | { type: 'full_state'; gameState: GameState; notification?: string; ... }
  | { type: 'resync_request'; reason: ...; attemptedMove: {...}; turn: number; ... }
*/
```

### Type Narrowing (Automatic!)

```typescript
const payload = UrlPayloadSchema.parse(unknownData);

// TypeScript knows the type based on discriminator
if (payload.type === 'delta') {
  // payload is DeltaPayload
  console.log(payload.move); // ✅ Works
  console.log(payload.gameState); // ❌ Type error - doesn't exist on delta
}

if (payload.type === 'full_state') {
  // payload is FullStatePayload
  console.log(payload.gameState); // ✅ Works
  console.log(payload.move); // ❌ Type error - doesn't exist on full_state
}

if (payload.type === 'resync_request') {
  // payload is ResyncRequestPayload
  console.log(payload.attemptedMove); // ✅ Works
  console.log(payload.reason); // ✅ 'checksum_mismatch' | 'localStorage_lost' | 'illegal_move_detected'
}
```

### Error Messages with Discriminated Unions

**Good errors (discriminated union):**
```typescript
// Invalid discriminator
UrlPayloadSchema.parse({ type: 'unknown' });
// ❌ ZodError: Invalid discriminator value. Expected 'delta' | 'full_state' | 'resync_request'

// Valid discriminator, invalid payload
UrlPayloadSchema.parse({ type: 'delta', move: 'invalid' });
// ❌ ZodError: Invalid delta payload: Expected object at "move", received string
```

**Bad errors (regular union):**
```typescript
// Regular union (DON'T use this)
const BadUnion = z.union([DeltaPayloadSchema, FullStatePayloadSchema, ResyncRequestPayloadSchema]);

BadUnion.parse({ type: 'delta', move: 'invalid' });
// ❌ ZodError: Invalid input
//    Tried option 1: Expected object at "move", received string
//    Tried option 2: Missing required field "gameState"
//    Tried option 3: Missing required field "reason"
// (confusing - shows errors from ALL schemas!)
```

### Nested Discriminated Unions

If you need nested variants (not needed for Phase 3, but good to know):

```typescript
const PayloadWithVariants = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('move'),
    moveType: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('normal'), from: Position, to: Position }),
      z.object({ kind: z.literal('off_board'), from: Position }),
    ]),
  }),
  z.object({
    type: z.literal('state'),
    gameState: GameStateSchema,
  }),
]);
```

### Discriminated Union References

- **Official Docs:** https://zod.dev/api?id=discriminated-unions
- **Implementation Guide:** https://app.studyraid.com/en/read/11289/352195/implementing-discriminated-unions
- **Parsing Tutorial:** https://timkapitein.nl/blog/parsing-discriminated-unions-with-zod
- **Union Types Deep Dive:** https://dev.to/shaharke/zod-zero-to-hero-chapter-4-513c

---

## 2. Refinements and Transforms

### Refinements: Custom Validation Rules

Use `.refine()` for validation that goes beyond Zod's built-in rules.

#### Basic Refinement

```typescript
const ChecksummedPayloadSchema = z.object({
  data: z.string(),
  checksum: z.string(),
}).refine(
  (val) => calculateChecksum(val.data) === val.checksum,
  {
    message: "Checksum mismatch - data may be corrupted",
    path: ["checksum"], // Show error on this field
  }
);
```

#### Multiple Refinements

```typescript
const DeltaPayloadWithValidation = DeltaPayloadSchema.refine(
  (val) => val.turn >= 0,
  { message: "Turn number must be non-negative", path: ["turn"] }
).refine(
  (val) => val.move.from[0] >= 0 && val.move.from[0] <= 2,
  { message: "Invalid board position", path: ["move", "from"] }
).refine(
  (val) => val.checksum.length === 64, // SHA-256 hex = 64 chars
  { message: "Invalid checksum format", path: ["checksum"] }
);
```

#### Complex Validation with `.superRefine()`

Use when you need multiple validations with different error paths:

```typescript
const MovePayloadSchema = z.object({
  from: z.tuple([z.number(), z.number()]),
  to: z.union([z.tuple([z.number(), z.number()]), z.literal('off_board')]),
  piece: z.object({
    type: z.enum(['rook', 'knight', 'bishop']),
    owner: z.enum(['white', 'black']),
  }),
}).superRefine((val, ctx) => {
  // Validate from position
  if (val.from[0] < 0 || val.from[0] > 2 || val.from[1] < 0 || val.from[1] > 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid from position: [${val.from}]. Must be 0-2.`,
      path: ["from"],
    });
  }

  // Validate to position (if not off_board)
  if (val.to !== 'off_board') {
    if (val.to[0] < 0 || val.to[0] > 2 || val.to[1] < 0 || val.to[1] > 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid to position: [${val.to}]. Must be 0-2.`,
        path: ["to"],
      });
    }
  }

  // Validate rook off-board movement (can only move straight off)
  if (val.to === 'off_board' && val.piece.type === 'rook') {
    const [fromRow, fromCol] = val.from;
    const isEdge = fromRow === 0 || fromRow === 2 || fromCol === 0 || fromCol === 2;

    if (!isEdge) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rook can only move off-board from an edge square",
        path: ["to"],
      });
    }
  }

  // Bishop can NEVER move off-board
  if (val.to === 'off_board' && val.piece.type === 'bishop') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Bishops cannot move off-board",
      path: ["to"],
    });
  }
});
```

### Transforms: Modify Data During Validation

Use `.transform()` to clean, normalize, or convert data.

#### Basic Transform

```typescript
// Normalize checksums to lowercase
const ChecksumSchema = z.string().transform(val => val.toLowerCase());

ChecksumSchema.parse("ABC123"); // Returns: "abc123"
```

#### Chained Transforms

```typescript
const PlayerNameSchema = z.string()
  .transform(val => val.trim())           // Remove whitespace
  .transform(val => val.slice(0, 20))     // Enforce max length
  .transform(val => val || 'Anonymous');  // Default if empty

PlayerNameSchema.parse("  Alice  "); // Returns: "Alice"
PlayerNameSchema.parse("  ");        // Returns: "Anonymous"
```

#### Transform After Refinement

```typescript
// Validate THEN transform
const TimestampSchema = z.number()
  .refine(val => val > 0, "Timestamp must be positive")
  .transform(val => new Date(val));

TimestampSchema.parse(1697500000000); // Returns: Date object
```

#### Complex Transform for Phase 3

```typescript
// Decompress and parse in one step
const CompressedPayloadSchema = z.string()
  .transform((compressed) => {
    try {
      return LZString.decompressFromEncodedURIComponent(compressed);
    } catch (error) {
      throw new Error('Failed to decompress payload');
    }
  })
  .transform((json) => {
    try {
      return JSON.parse(json);
    } catch (error) {
      throw new Error('Failed to parse JSON');
    }
  })
  .pipe(UrlPayloadSchema); // Validate the decompressed data

// Usage
const payload = CompressedPayloadSchema.parse(hashFragment);
// Returns: DeltaPayload | FullStatePayload | ResyncRequestPayload
```

### Async Validation (If Needed)

For async operations (database lookups, checksum calculations):

```typescript
const GameStateWithVerification = GameStateSchema.refine(
  async (state) => {
    const expectedChecksum = await calculateChecksumAsync(state);
    return state.checksum === expectedChecksum;
  },
  { message: "Checksum verification failed" }
);

// Must use parseAsync or safeParseAsync
const result = await GameStateWithVerification.safeParseAsync(data);
```

**Note:** Avoid async validation for Phase 3 - keep it synchronous for better performance.

### Refinement References

- **Refine Documentation:** https://zod.dev/api (search "refine")
- **Custom Validation Tutorial:** https://www.codu.co/articles/custom-validation-with-zod-and-refine-rszcwcgp
- **Refine Deep Dive:** https://basicutils.com/learn/zod/zod-refine-custom-validation
- **Transform Documentation:** https://basicutils.com/learn/zod/zod-transform-data-transformation
- **Super Refinements:** https://medium.com/@jeewanchaudhary6/refinements-and-super-refinements-in-zod-unlocking-advanced-validation-capabilities-cdeed0a55632

---

## 3. Error Handling

### Understanding ZodError Structure

When validation fails, Zod returns a `ZodError` containing an array of issues:

```typescript
try {
  UrlPayloadSchema.parse(badData);
} catch (error) {
  if (error instanceof z.ZodError) {
    error.issues.forEach(issue => {
      console.log({
        code: issue.code,        // 'invalid_type', 'invalid_literal', 'custom', etc.
        path: issue.path,        // ['move', 'from', 0] - path to error
        message: issue.message,  // Human-readable message
        expected: issue.expected, // Expected type (for type errors)
        received: issue.received, // Actual type
      });
    });
  }
}
```

### safeParse vs parse: When to Use Each

#### Use `.parse()` when:
- Validation failure should stop execution (e.g., critical API validation)
- You have centralized error handling (middleware, try-catch wrapper)
- You want to use TypeScript assertion functions

```typescript
// Centralized validation
function validateUrlHash(hash: string): UrlPayload {
  try {
    const decompressed = decompressHash(hash);
    return UrlPayloadSchema.parse(decompressed); // Throws on error
  } catch (error) {
    if (error instanceof z.ZodError) {
      logValidationError(error);
      showUserError('Invalid URL - corrupted or malformed');
    }
    throw new UrlValidationError('Failed to validate URL payload');
  }
}
```

#### Use `.safeParse()` when:
- You want graceful error handling (recommended for Phase 3)
- Multiple validations where some may fail
- You need to continue processing even if validation fails
- **Performance matters** - no exception throwing overhead

```typescript
// Graceful validation (RECOMMENDED for Phase 3)
function parseUrlHash(hash: string): UrlPayload | null {
  const decompressed = decompressHash(hash);
  const result = UrlPayloadSchema.safeParse(decompressed);

  if (result.success) {
    return result.data; // Typed as UrlPayload
  }

  // Handle error gracefully
  console.error('URL validation failed:', result.error.format());

  showUserError({
    title: 'Invalid URL',
    message: 'The game URL is corrupted or malformed.',
    details: formatZodError(result.error),
    action: 'Request a fresh URL from your opponent',
  });

  return null;
}
```

### Error Formatting Methods

#### 1. `.format()` - Nested Structure (Best for Debugging)

```typescript
const result = UrlPayloadSchema.safeParse(badData);

if (!result.success) {
  const formatted = result.error.format();
  /*
  {
    type: { _errors: ['Expected literal "delta", received "invalid"'] },
    move: {
      _errors: [],
      from: { _errors: ['Expected array, received string'] }
    },
    _errors: [] // Top-level errors
  }
  */
}
```

#### 2. `.flatten()` - Flat Structure (Best for Forms)

```typescript
const flattened = result.error.flatten();
/*
{
  formErrors: [], // Top-level errors
  fieldErrors: {
    type: ['Expected literal "delta", received "invalid"'],
    'move.from': ['Expected array, received string'],
  }
}
*/
```

#### 3. User-Friendly Messages with `zod-validation-error`

```bash
pnpm add zod-validation-error
```

```typescript
import { fromError } from 'zod-validation-error';

const result = UrlPayloadSchema.safeParse(data);

if (!result.success) {
  const validationError = fromError(result.error);

  // User-friendly single message
  console.log(validationError.message);
  // "Validation error: Expected literal at 'type', received 'invalid'"

  // Original error for debugging
  console.log(validationError.details);
}
```

### Custom Error Messages

```typescript
const DeltaPayloadSchema = z.object({
  type: z.literal('delta', {
    message: "Invalid payload type - expected 'delta'",
  }),
  move: z.object({
    from: z.tuple([z.number(), z.number()], {
      message: "Invalid 'from' position - must be [row, col]",
    }),
    to: z.union([
      z.tuple([z.number(), z.number()]),
      z.literal('off_board')
    ], {
      message: "Invalid 'to' position - must be [row, col] or 'off_board'",
    }),
  }, {
    message: "Invalid move structure",
  }),
  turn: z.number().int().min(0, {
    message: "Turn number must be a non-negative integer",
  }),
  checksum: z.string().length(64, {
    message: "Invalid checksum - must be 64 characters (SHA-256)",
  }),
});
```

### Production Error Handling Pattern for Phase 3

```typescript
import { fromError } from 'zod-validation-error';

/**
 * Validates URL payload with comprehensive error handling.
 * Returns validated payload or null on failure.
 */
export function validateUrlPayload(
  compressedData: string,
  context: 'hash_fragment' | 'query_param'
): UrlPayload | null {
  // Step 1: Decompress
  let decompressed: string;
  try {
    decompressed = LZString.decompressFromEncodedURIComponent(compressedData);
    if (!decompressed) {
      throw new Error('Decompression returned null');
    }
  } catch (error) {
    console.error(`[${context}] Decompression failed:`, error);
    showUserError({
      title: 'Corrupted URL',
      message: 'Unable to decompress the game data.',
      technical: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(decompressed);
  } catch (error) {
    console.error(`[${context}] JSON parse failed:`, error);
    showUserError({
      title: 'Invalid URL Format',
      message: 'The URL contains malformed data.',
      technical: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }

  // Step 3: Validate with Zod
  const result = UrlPayloadSchema.safeParse(parsed);

  if (result.success) {
    console.log(`[${context}] Validation successful:`, result.data.type);
    return result.data;
  }

  // Step 4: Handle validation errors
  console.error(`[${context}] Validation failed:`, result.error.issues);

  const validationError = fromError(result.error);

  showUserError({
    title: 'Invalid Game Data',
    message: 'The URL contains invalid game data.',
    details: validationError.message,
    technical: JSON.stringify(result.error.issues, null, 2),
    action: 'Request a fresh URL from your opponent',
  });

  // Track error for monitoring
  trackError({
    context,
    errorType: 'validation_failed',
    zodIssues: result.error.issues,
    rawData: decompressed.slice(0, 200), // First 200 chars for debugging
  });

  return null;
}
```

### Partial Validation (Advanced)

If you need to validate parts of a payload:

```typescript
// Validate discriminator first, then validate full payload
const DiscriminatorSchema = z.object({
  type: z.enum(['delta', 'full_state', 'resync_request']),
});

function smartValidate(data: unknown): UrlPayload | null {
  // Step 1: Check discriminator
  const typeCheck = DiscriminatorSchema.safeParse(data);

  if (!typeCheck.success) {
    console.error('Invalid or missing payload type');
    return null;
  }

  // Step 2: Validate based on type
  const { type } = typeCheck.data;

  if (type === 'delta') {
    const result = DeltaPayloadSchema.safeParse(data);
    if (!result.success) {
      console.error('Invalid delta payload:', result.error.flatten());
      return null;
    }
    return result.data;
  }

  // Similar for other types...
}
```

### Error Handling References

- **Error Formatting:** https://zod.dev/error-formatting
- **Error Customization:** https://zod.dev/error-customization
- **zod-validation-error:** https://github.com/causaly/zod-validation-error
- **Parse vs SafeParse:** https://www.codu.co/articles/zod-parse-versus-safeparse-what-s-the-difference-7t_tjfne

---

## 4. Performance Optimization

### Key Performance Principles

1. **Define schemas once at module level** (not inside functions)
2. **Use `.safeParse()` for expected failures** (faster than try-catch)
3. **Use discriminated unions** (O(1) vs O(n) for regular unions)
4. **Avoid redundant validations** (validate at boundaries only)
5. **Prefer `.passthrough()` over `.strict()`** when safe (faster)

### Schema Definition Best Practices

```typescript
// ✅ GOOD: Define once at module scope
const DeltaPayloadSchema = z.object({ /* ... */ });

export function parseDelta(data: unknown) {
  return DeltaPayloadSchema.safeParse(data);
}

// ❌ BAD: Recreating schema on every call (wasteful!)
export function parseDelta(data: unknown) {
  const schema = z.object({ /* ... */ }); // New schema every call!
  return schema.safeParse(data);
}
```

### Validation Frequency

```typescript
// ✅ GOOD: Validate once at boundary
export function loadUrlPayload(hash: string): UrlPayload | null {
  const decompressed = decompress(hash);
  const validated = UrlPayloadSchema.safeParse(decompressed); // Validate once

  if (!validated.success) return null;

  // Now payload is trusted - no need to re-validate
  processPayload(validated.data);
  updateUI(validated.data);
  return validated.data;
}

// ❌ BAD: Re-validating trusted data
function processPayload(payload: unknown) {
  const validated = UrlPayloadSchema.safeParse(payload); // Wasteful!
  if (!validated.success) return;
  // ...
}
```

### Performance: safeParse vs parse

**Benchmark results (500,000 validations):**
- `.safeParse()`: ~2 seconds
- `.parse()` with try-catch: ~3-4 seconds (exception throwing is expensive)

```typescript
// ✅ FASTER: safeParse (no exceptions)
function validateMany(items: unknown[]) {
  return items.map(item => {
    const result = schema.safeParse(item);
    return result.success ? result.data : null;
  });
}

// ❌ SLOWER: parse with try-catch
function validateMany(items: unknown[]) {
  return items.map(item => {
    try {
      return schema.parse(item);
    } catch {
      return null;
    }
  });
}
```

### Discriminated Union Performance

```typescript
// ✅ FAST: Discriminated union (O(1) lookup)
const PayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

// ❌ SLOWER: Regular union (O(n) sequential parsing)
const PayloadSchema = z.union([
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

// For 3 payload types, discriminated union is ~3x faster
// For 10 payload types, discriminated union is ~10x faster
```

### Caching Parsed Results

If you validate the same data multiple times:

```typescript
// Cache validated payloads
const payloadCache = new Map<string, UrlPayload>();

export function getPayloadCached(hash: string): UrlPayload | null {
  // Check cache first
  if (payloadCache.has(hash)) {
    return payloadCache.get(hash)!;
  }

  // Decompress and validate
  const decompressed = decompress(hash);
  const result = UrlPayloadSchema.safeParse(decompressed);

  if (!result.success) {
    return null;
  }

  // Cache for next time
  payloadCache.set(hash, result.data);
  return result.data;
}
```

**Note:** Only cache if the same hash is accessed multiple times. For Phase 3, URLs change every turn, so caching may not help.

### Lazy Validation (Advanced)

For very large payloads, validate incrementally:

```typescript
// Validate discriminator first (fast)
const typeResult = z.object({ type: z.string() }).safeParse(data);

if (!typeResult.success) {
  return null; // Fail fast
}

// Then validate full payload based on type
const fullResult = UrlPayloadSchema.safeParse(data);
// ...
```

### Bundle Size Consideration

- **Zod size:** 12kb gzipped (acceptable for most apps)
- **Alternative (if size matters):** Use TypeBox or Valibot (smaller but less features)
- **For Phase 3:** 12kb is negligible - use Zod's full features

### Performance Monitoring

```typescript
// Add performance tracking
export function validateUrlPayloadWithTiming(hash: string): UrlPayload | null {
  const start = performance.now();

  const payload = validateUrlPayload(hash);

  const duration = performance.now() - start;

  if (duration > 50) {
    console.warn(`Slow validation: ${duration.toFixed(2)}ms`);
  }

  return payload;
}
```

### Performance References

- **Performance Optimization:** https://app.studyraid.com/en/read/11289/352206/optimizing-validation-performance
- **Schema Caching:** https://app.studyraid.com/en/read/11289/352205/schema-caching-strategies
- **Zod Performance Deep Dive:** https://numeric.substack.com/p/how-we-doubled-zod-performance-to
- **When to Use Zod:** https://www.totaltypescript.com/when-should-you-use-zod

---

## 5. Existing Project Patterns

### Current Zod Usage in King's Cooking

From `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`:

#### Strengths of Current Implementation

✅ **Branded Types for Type Safety**
```typescript
export const PlayerIdSchema = z.string().uuid().brand<'PlayerId'>();
export const GameIdSchema = z.string().uuid().brand<'GameId'>();
export const MoveIdSchema = z.string().uuid().brand<'MoveId'>();
```

✅ **Schema Versioning**
```typescript
export const GameStateSchema = z.object({
  version: z.literal('1.0.0'), // Enables future migrations
  // ...
});
```

✅ **Comprehensive Type Inference**
```typescript
export type GameState = z.infer<typeof GameStateSchema>;
export type Piece = z.infer<typeof PieceSchema>;
```

✅ **Helper Functions for Validation**
```typescript
// Throwing version (for trusted contexts)
export function validateGameState(data: unknown): GameState {
  return GameStateSchema.parse(data);
}

// Non-throwing version (for untrusted contexts)
export function safeValidateGameState(
  data: unknown
): z.SafeParseReturnType<unknown, GameState> {
  return GameStateSchema.safeParse(data);
}
```

✅ **Detailed JSDoc Documentation**
```typescript
/**
 * Complete game state schema.
 * This is the PRIMARY schema for the entire game state.
 *
 * VALIDATION CRITICAL: This schema MUST be used to validate:
 * - Data loaded from localStorage
 * - Data received via WebRTC
 * - Data decoded from URLs
 */
```

### Conventions to Follow for Phase 3

1. **Use branded types for critical IDs**
   - Already done for `GameId`, `PlayerId`, `MoveId`
   - Phase 3 doesn't need new IDs (uses existing ones)

2. **Export both parse and safeParse wrappers**
   ```typescript
   export function validateUrlPayload(data: unknown): UrlPayload {
     return UrlPayloadSchema.parse(data);
   }

   export function safeValidateUrlPayload(
     data: unknown
   ): z.SafeParseReturnType<unknown, UrlPayload> {
     return UrlPayloadSchema.safeParse(data);
   }
   ```

3. **Include comprehensive JSDoc**
   ```typescript
   /**
    * URL payload schema for Phase 3.
    *
    * Validates compressed payloads from URL hash fragments.
    * Three payload types: delta, full_state, resync_request.
    *
    * @see PRPs/phase-3-url-state-sync-flows.md
    */
   ```

4. **Use `.nullable()` for optional positions**
   ```typescript
   // Existing pattern
   export const PositionSchema = z.tuple([
     z.number().int().min(0),
     z.number().int().min(0),
   ]).nullable();
   ```

5. **Validate at boundaries, trust internally**
   - Validate when receiving URL payloads
   - Don't re-validate when passing to internal functions

### Integrating Phase 3 Schemas

Add to `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`:

```typescript
// ============================================================================
// URL Payload Schemas (Phase 3) - See PRPs/phase-3-url-state-sync-flows.md
// ============================================================================

/**
 * Delta payload - single move update.
 * Used for normal gameplay after initial state is established.
 */
export const DeltaPayloadSchema = z.object({
  type: z.literal('delta'),
  move: z.object({
    from: z.tuple([z.number().int().min(0).max(2), z.number().int().min(0).max(2)]),
    to: z.union([
      z.tuple([z.number().int().min(0).max(2), z.number().int().min(0).max(2)]),
      z.literal('off_board')
    ]),
  }),
  turn: z.number().int().min(0),
  checksum: z.string().length(64), // SHA-256 hex
  playerName: z.string().min(1).max(20).optional(),
});

export type DeltaPayload = z.infer<typeof DeltaPayloadSchema>;

/**
 * Full state payload - complete game state.
 * Used for initial game setup or resync responses.
 */
export const FullStatePayloadSchema = z.object({
  type: z.literal('full_state'),
  gameState: GameStateSchema,
  notification: z.string().optional(),
  divergenceInfo: z.object({
    turn: z.number().int(),
    myChecksum: z.string(),
    theirChecksum: z.string(),
  }).optional(),
});

export type FullStatePayload = z.infer<typeof FullStatePayloadSchema>;

/**
 * Resync request payload - request full state from opponent.
 * Used when state divergence detected or localStorage lost.
 */
export const ResyncRequestPayloadSchema = z.object({
  type: z.literal('resync_request'),
  reason: z.enum([
    'checksum_mismatch',
    'localStorage_lost',
    'illegal_move_detected'
  ]),
  attemptedMove: z.object({
    from: z.tuple([z.number().int().min(0).max(2), z.number().int().min(0).max(2)]),
    to: z.union([
      z.tuple([z.number().int().min(0).max(2), z.number().int().min(0).max(2)]),
      z.literal('off_board')
    ]),
  }),
  turn: z.number().int().min(0),
  lastKnownChecksum: z.string().optional(),
});

export type ResyncRequestPayload = z.infer<typeof ResyncRequestPayloadSchema>;

/**
 * URL payload discriminated union.
 *
 * Validates all three payload types with efficient O(1) discriminator lookup.
 * Use this for all URL validation in Phase 3.
 */
export const UrlPayloadSchema = z.discriminatedUnion('type', [
  DeltaPayloadSchema,
  FullStatePayloadSchema,
  ResyncRequestPayloadSchema,
]);

export type UrlPayload = z.infer<typeof UrlPayloadSchema>;

// ============================================================================
// URL Payload Validation Helpers
// ============================================================================

/**
 * Validates URL payload and throws on error.
 *
 * @param data - Unknown data to validate
 * @returns Validated UrlPayload
 * @throws {z.ZodError} If validation fails
 */
export function validateUrlPayload(data: unknown): UrlPayload {
  return UrlPayloadSchema.parse(data);
}

/**
 * Safely validates URL payload without throwing.
 * PREFERRED for all URL validation in Phase 3.
 *
 * @param data - Unknown data to validate
 * @returns Success or error result
 */
export function safeValidateUrlPayload(
  data: unknown
): z.SafeParseReturnType<unknown, UrlPayload> {
  return UrlPayloadSchema.safeParse(data);
}
```

---

## 6. Phase 3 Implementation Strategy

### Step-by-Step Implementation

#### Step 1: Add Schemas to `schemas.ts`

Add the payload schemas from Section 5 to `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/schemas.ts`.

#### Step 2: Create URL Validation Module

Create `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/urlPayloadValidator.ts`:

```typescript
import { fromError } from 'zod-validation-error';
import * as LZString from 'lz-string';
import {
  safeValidateUrlPayload,
  type UrlPayload,
  type DeltaPayload,
  type FullStatePayload,
  type ResyncRequestPayload,
} from './schemas';

/**
 * Error thrown when URL validation fails.
 */
export class UrlValidationError extends Error {
  constructor(
    message: string,
    public readonly details: string,
    public readonly technical?: string
  ) {
    super(message);
    this.name = 'UrlValidationError';
  }
}

/**
 * Decompresses and validates URL hash fragment.
 *
 * @param hashFragment - Compressed data from URL hash (without '#d=')
 * @returns Validated payload or null on failure
 *
 * @example
 * ```typescript
 * const payload = parseUrlHashFragment(window.location.hash.slice(3));
 * if (payload) {
 *   if (payload.type === 'delta') {
 *     applyDeltaMove(payload);
 *   }
 * }
 * ```
 */
export function parseUrlHashFragment(hashFragment: string): UrlPayload | null {
  if (!hashFragment) {
    console.warn('Empty hash fragment');
    return null;
  }

  // Step 1: Decompress
  let decompressed: string | null;
  try {
    decompressed = LZString.decompressFromEncodedURIComponent(hashFragment);
  } catch (error) {
    console.error('Decompression failed:', error);
    throw new UrlValidationError(
      'Corrupted URL',
      'Unable to decompress the game data.',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  if (!decompressed) {
    throw new UrlValidationError(
      'Corrupted URL',
      'Decompression returned null - data may be corrupted.',
      'LZString.decompressFromEncodedURIComponent returned null'
    );
  }

  // Step 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(decompressed);
  } catch (error) {
    console.error('JSON parse failed:', error);
    throw new UrlValidationError(
      'Invalid URL Format',
      'The URL contains malformed JSON data.',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  // Step 3: Validate with Zod
  const result = safeValidateUrlPayload(parsed);

  if (result.success) {
    console.log('[URL] Validation successful:', result.data.type);
    return result.data;
  }

  // Step 4: Handle validation errors
  console.error('[URL] Validation failed:', result.error.issues);

  const validationError = fromError(result.error);

  throw new UrlValidationError(
    'Invalid Game Data',
    validationError.message,
    JSON.stringify(result.error.issues, null, 2)
  );
}

/**
 * Type guard for delta payload.
 */
export function isDeltaPayload(payload: UrlPayload): payload is DeltaPayload {
  return payload.type === 'delta';
}

/**
 * Type guard for full state payload.
 */
export function isFullStatePayload(payload: UrlPayload): payload is FullStatePayload {
  return payload.type === 'full_state';
}

/**
 * Type guard for resync request payload.
 */
export function isResyncRequestPayload(payload: UrlPayload): payload is ResyncRequestPayload {
  return payload.type === 'resync_request';
}
```

#### Step 3: Add Tests

Create `/home/ryankhetlyr/Development/kings-cooking/src/lib/validation/urlPayloadValidator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import * as LZString from 'lz-string';
import {
  parseUrlHashFragment,
  UrlValidationError,
  isDeltaPayload,
  isFullStatePayload,
  isResyncRequestPayload,
} from './urlPayloadValidator';
import type { DeltaPayload, FullStatePayload, ResyncRequestPayload } from './schemas';

describe('URL Payload Validator', () => {
  describe('parseUrlHashFragment', () => {
    it('should parse valid delta payload', () => {
      const deltaPayload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [0, 0],
          to: [1, 0],
        },
        turn: 1,
        checksum: 'a'.repeat(64),
        playerName: 'Alice',
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(deltaPayload)
      );

      const result = parseUrlHashFragment(compressed);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('delta');
      expect(isDeltaPayload(result!)).toBe(true);
      expect(result).toEqual(deltaPayload);
    });

    it('should parse valid full_state payload', () => {
      const fullStatePayload: FullStatePayload = {
        type: 'full_state',
        gameState: {
          version: '1.0.0',
          gameId: '550e8400-e29b-41d4-a716-446655440000' as any,
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
            id: '550e8400-e29b-41d4-a716-446655440001' as any,
            name: 'Alice',
          },
          blackPlayer: {
            id: '550e8400-e29b-41d4-a716-446655440002' as any,
            name: 'Bob',
          },
          status: 'playing',
          winner: null,
          moveHistory: [],
          checksum: 'abc123',
        },
        notification: 'Game started',
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(fullStatePayload)
      );

      const result = parseUrlHashFragment(compressed);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('full_state');
      expect(isFullStatePayload(result!)).toBe(true);
    });

    it('should parse valid resync_request payload', () => {
      const resyncPayload: ResyncRequestPayload = {
        type: 'resync_request',
        reason: 'checksum_mismatch',
        attemptedMove: {
          from: [2, 1],
          to: [1, 1],
        },
        turn: 5,
        lastKnownChecksum: 'b'.repeat(64),
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(resyncPayload)
      );

      const result = parseUrlHashFragment(compressed);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('resync_request');
      expect(isResyncRequestPayload(result!)).toBe(true);
      expect(result).toEqual(resyncPayload);
    });

    it('should throw on corrupted compression', () => {
      expect(() => {
        parseUrlHashFragment('invalid-compressed-data-!!!');
      }).toThrow(UrlValidationError);
    });

    it('should throw on invalid JSON', () => {
      const notJSON = LZString.compressToEncodedURIComponent(
        'not valid json {'
      );

      expect(() => {
        parseUrlHashFragment(notJSON);
      }).toThrow(UrlValidationError);
    });

    it('should throw on invalid payload type', () => {
      const invalidPayload = {
        type: 'unknown_type',
        data: 'something',
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(invalidPayload)
      );

      expect(() => {
        parseUrlHashFragment(compressed);
      }).toThrow(UrlValidationError);
    });

    it('should throw on missing required fields', () => {
      const incompletePayload = {
        type: 'delta',
        // Missing: move, turn, checksum
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(incompletePayload)
      );

      expect(() => {
        parseUrlHashFragment(compressed);
      }).toThrow(UrlValidationError);
    });

    it('should throw on invalid board position', () => {
      const invalidPositionPayload = {
        type: 'delta',
        move: {
          from: [5, 5], // Out of bounds (board is 3x3)
          to: [1, 1],
        },
        turn: 1,
        checksum: 'c'.repeat(64),
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(invalidPositionPayload)
      );

      expect(() => {
        parseUrlHashFragment(compressed);
      }).toThrow(UrlValidationError);
    });

    it('should accept off_board as valid destination', () => {
      const offBoardPayload: DeltaPayload = {
        type: 'delta',
        move: {
          from: [2, 0],
          to: 'off_board',
        },
        turn: 3,
        checksum: 'd'.repeat(64),
      };

      const compressed = LZString.compressToEncodedURIComponent(
        JSON.stringify(offBoardPayload)
      );

      const result = parseUrlHashFragment(compressed);

      expect(result).not.toBeNull();
      expect(isDeltaPayload(result!)).toBe(true);
      if (isDeltaPayload(result!)) {
        expect(result.move.to).toBe('off_board');
      }
    });
  });
});
```

#### Step 4: Integration Example

Example usage in game component:

```typescript
// In game page component
import { parseUrlHashFragment, UrlValidationError } from '@/lib/validation/urlPayloadValidator';

// On page load or hash change
function handleUrlChange() {
  const hash = window.location.hash;

  if (!hash.startsWith('#d=')) {
    console.log('No game data in URL');
    return;
  }

  const dataFragment = hash.slice(3); // Remove '#d='

  try {
    const payload = parseUrlHashFragment(dataFragment);

    if (!payload) {
      showError('Failed to parse game URL');
      return;
    }

    // Handle based on payload type
    switch (payload.type) {
      case 'delta':
        handleDeltaMove(payload);
        break;

      case 'full_state':
        handleFullState(payload);
        break;

      case 'resync_request':
        handleResyncRequest(payload);
        break;
    }
  } catch (error) {
    if (error instanceof UrlValidationError) {
      showErrorModal({
        title: error.message,
        details: error.details,
        technical: error.technical,
        action: 'Request fresh URL from opponent',
      });
    } else {
      console.error('Unexpected error:', error);
      showError('An unexpected error occurred');
    }
  }
}
```

---

## Summary: Phase 3 Validation Checklist

### Implementation Checklist

- [ ] Add payload schemas to `schemas.ts`
  - [ ] `DeltaPayloadSchema`
  - [ ] `FullStatePayloadSchema`
  - [ ] `ResyncRequestPayloadSchema`
  - [ ] `UrlPayloadSchema` (discriminated union)
- [ ] Create `urlPayloadValidator.ts`
  - [ ] `parseUrlHashFragment()` function
  - [ ] Type guards (`isDeltaPayload`, etc.)
  - [ ] `UrlValidationError` class
- [ ] Write comprehensive tests
  - [ ] Valid delta payload
  - [ ] Valid full_state payload
  - [ ] Valid resync_request payload
  - [ ] Corrupted compression
  - [ ] Invalid JSON
  - [ ] Invalid payload type
  - [ ] Missing required fields
  - [ ] Out-of-bounds positions
  - [ ] `off_board` destination
- [ ] Install `zod-validation-error`
  - [ ] `pnpm add zod-validation-error`
- [ ] Integrate with game components
  - [ ] Handle delta moves
  - [ ] Handle full state sync
  - [ ] Handle resync requests
- [ ] Add error UI components
  - [ ] Error modal with details
  - [ ] Technical info (expandable)
  - [ ] Action buttons

### Key Patterns to Use

✅ **Discriminated unions** for efficient payload type checking
✅ **safeParse()** for graceful error handling
✅ **Custom error messages** for user-friendly feedback
✅ **Type guards** for TypeScript narrowing
✅ **Schema-level validation** for board positions (0-2 range)
✅ **fromError()** for user-friendly error messages
✅ **Define schemas at module level** for performance
✅ **Validate at boundaries only** (don't re-validate trusted data)

### Gotchas to Avoid

❌ Don't use regular unions (slower, worse errors)
❌ Don't use `.parse()` for URL validation (use `.safeParse()`)
❌ Don't recreate schemas inside functions
❌ Don't validate data that's already been validated
❌ Don't catch errors silently (log and show to user)
❌ Don't forget to handle decompression failures separately

---

## Additional Resources

### Zod Documentation
- **Main Site:** https://zod.dev/
- **API Reference:** https://zod.dev/api
- **Discriminated Unions:** https://zod.dev/api?id=discriminated-unions
- **Error Formatting:** https://zod.dev/error-formatting
- **Error Customization:** https://zod.dev/error-customization

### Advanced Patterns
- **Discriminated Unions Tutorial:** https://timkapitein.nl/blog/parsing-discriminated-unions-with-zod
- **Union Types Guide:** https://dev.to/shaharke/zod-zero-to-hero-chapter-4-513c
- **Refine Deep Dive:** https://basicutils.com/learn/zod/zod-refine-custom-validation
- **Transform Deep Dive:** https://basicutils.com/learn/zod/zod-transform-data-transformation
- **Super Refinements:** https://medium.com/@jeewanchaudhary6/refinements-and-super-refinements-in-zod-unlocking-advanced-validation-capabilities-cdeed0a55632

### Performance & Best Practices
- **Performance Optimization:** https://app.studyraid.com/en/read/11289/352206/optimizing-validation-performance
- **Schema Caching:** https://app.studyraid.com/en/read/11289/352205/schema-caching-strategies
- **Zod Performance Article:** https://numeric.substack.com/p/how-we-doubled-zod-performance-to
- **Parse vs SafeParse:** https://www.codu.co/articles/zod-parse-versus-safeparse-what-s-the-difference-7t_tjfne

### Related Libraries
- **zod-validation-error:** https://github.com/causaly/zod-validation-error
- **zod-storage:** https://github.com/sharry/zod-storage
- **zod-localstorage:** https://github.com/bigbeno37/zod-localstorage

---

**End of Research Document**

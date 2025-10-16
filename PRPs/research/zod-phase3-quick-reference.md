# Zod Phase 3 Quick Reference

**Quick lookup guide for common Zod patterns in Phase 3 implementation**

---

## Discriminated Union (3 Payload Types)

```typescript
import { z } from 'zod';

const UrlPayloadSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('delta'), /* ... */ }),
  z.object({ type: z.literal('full_state'), /* ... */ }),
  z.object({ type: z.literal('resync_request'), /* ... */ }),
]);

type UrlPayload = z.infer<typeof UrlPayloadSchema>;
```

**Why discriminated union?**
- 3x faster than regular union (O(1) vs O(n))
- Better error messages
- Automatic TypeScript narrowing

---

## Validation Pattern (Recommended)

```typescript
import { fromError } from 'zod-validation-error';

function parseUrlHash(hash: string): UrlPayload | null {
  // 1. Decompress
  const decompressed = LZString.decompressFromEncodedURIComponent(hash);
  if (!decompressed) return null;

  // 2. Parse JSON
  const parsed = JSON.parse(decompressed);

  // 3. Validate with safeParse
  const result = UrlPayloadSchema.safeParse(parsed);

  if (result.success) {
    return result.data; // Typed as UrlPayload
  }

  // 4. Handle error gracefully
  const error = fromError(result.error);
  console.error('Validation failed:', error.message);
  return null;
}
```

**Key points:**
- Use `.safeParse()` not `.parse()` (faster, no exceptions)
- Check `result.success` before accessing `result.data`
- Use `fromError()` for user-friendly messages

---

## Type Narrowing

```typescript
const payload = UrlPayloadSchema.parse(data);

if (payload.type === 'delta') {
  // TypeScript knows payload is DeltaPayload
  console.log(payload.move); // ✅ Works
  console.log(payload.gameState); // ❌ Type error
}

if (payload.type === 'full_state') {
  // TypeScript knows payload is FullStatePayload
  console.log(payload.gameState); // ✅ Works
}

if (payload.type === 'resync_request') {
  // TypeScript knows payload is ResyncRequestPayload
  console.log(payload.attemptedMove); // ✅ Works
}
```

---

## Error Handling

### Basic Error Check

```typescript
const result = schema.safeParse(data);

if (!result.success) {
  console.error('Errors:', result.error.issues);
  return;
}

// result.data is now typed and validated
```

### Formatted Errors (for UI)

```typescript
import { fromError } from 'zod-validation-error';

const result = schema.safeParse(data);

if (!result.success) {
  const error = fromError(result.error);
  showUserError(error.message); // User-friendly message
  console.log(result.error.issues); // Detailed errors for debugging
}
```

### Error Structure

```typescript
if (!result.success) {
  result.error.issues.forEach(issue => {
    console.log({
      code: issue.code,        // 'invalid_type', 'invalid_literal', etc.
      path: issue.path,        // ['move', 'from', 0]
      message: issue.message,  // Human-readable
      expected: issue.expected, // Expected value
      received: issue.received, // Actual value
    });
  });
}
```

---

## Custom Validation (Refinements)

### Simple Refinement

```typescript
const schema = z.object({
  checksum: z.string(),
  data: z.string(),
}).refine(
  (val) => calculateChecksum(val.data) === val.checksum,
  { message: "Checksum mismatch", path: ["checksum"] }
);
```

### Multiple Validations (superRefine)

```typescript
const MoveSchema = z.object({
  from: z.tuple([z.number(), z.number()]),
  to: z.union([z.tuple([z.number(), z.number()]), z.literal('off_board')]),
}).superRefine((val, ctx) => {
  // Validation 1: Check from position
  if (val.from[0] < 0 || val.from[0] > 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "from position out of bounds",
      path: ["from"],
    });
  }

  // Validation 2: Check to position
  if (val.to !== 'off_board' && val.to[0] < 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "to position out of bounds",
      path: ["to"],
    });
  }
});
```

---

## Data Transformation

### Basic Transform

```typescript
const TrimmedString = z.string().transform(val => val.trim());

TrimmedString.parse("  hello  "); // Returns: "hello"
```

### Chained Transforms

```typescript
const PlayerName = z.string()
  .transform(val => val.trim())
  .transform(val => val.slice(0, 20))
  .transform(val => val || 'Anonymous');
```

### Transform + Validation

```typescript
const CompressedPayload = z.string()
  .transform(compressed => LZString.decompress(compressed))
  .transform(json => JSON.parse(json))
  .pipe(UrlPayloadSchema); // Validate the result
```

---

## Common Patterns

### Board Position (0-2 range)

```typescript
const PositionSchema = z.tuple([
  z.number().int().min(0).max(2),
  z.number().int().min(0).max(2),
]);
```

### Optional Field with Default

```typescript
const schema = z.object({
  playerName: z.string().optional().default('Guest'),
  debug: z.boolean().optional().default(false),
});
```

### Union of Literal and Tuple

```typescript
const MoveDestination = z.union([
  z.tuple([z.number(), z.number()]),
  z.literal('off_board')
]);
```

### Enum

```typescript
const Reason = z.enum([
  'checksum_mismatch',
  'localStorage_lost',
  'illegal_move_detected'
]);
```

### Checksum (SHA-256 hex = 64 chars)

```typescript
const Checksum = z.string().length(64);
```

---

## Performance Tips

### ✅ Do This

```typescript
// Define schema once at module level
const PayloadSchema = z.object({ /* ... */ });

export function validate(data: unknown) {
  return PayloadSchema.safeParse(data);
}
```

### ❌ Don't Do This

```typescript
// Recreating schema every call (slow!)
export function validate(data: unknown) {
  const schema = z.object({ /* ... */ });
  return schema.safeParse(data);
}
```

### Validate Once at Boundary

```typescript
// ✅ Good
export function loadPayload(hash: string): Payload {
  const validated = PayloadSchema.parse(decompress(hash));
  processPayload(validated); // No re-validation needed
  return validated;
}

// ❌ Bad
function processPayload(data: unknown) {
  const validated = PayloadSchema.parse(data); // Redundant!
  // ...
}
```

---

## Testing Patterns

### Valid Payload Test

```typescript
it('should parse valid delta payload', () => {
  const payload = {
    type: 'delta',
    move: { from: [0, 0], to: [1, 0] },
    turn: 1,
    checksum: 'a'.repeat(64),
  };

  const result = DeltaPayloadSchema.safeParse(payload);

  expect(result.success).toBe(true);
  if (result.success) {
    expect(result.data.type).toBe('delta');
  }
});
```

### Invalid Payload Test

```typescript
it('should reject invalid position', () => {
  const payload = {
    type: 'delta',
    move: { from: [5, 5], to: [1, 1] }, // Out of bounds
    turn: 1,
    checksum: 'a'.repeat(64),
  };

  const result = DeltaPayloadSchema.safeParse(payload);

  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error.issues.length).toBeGreaterThan(0);
  }
});
```

---

## Type Guards

```typescript
export function isDeltaPayload(payload: UrlPayload): payload is DeltaPayload {
  return payload.type === 'delta';
}

export function isFullStatePayload(payload: UrlPayload): payload is FullStatePayload {
  return payload.type === 'full_state';
}

export function isResyncRequestPayload(payload: UrlPayload): payload is ResyncRequestPayload {
  return payload.type === 'resync_request';
}

// Usage
if (isDeltaPayload(payload)) {
  // TypeScript knows payload is DeltaPayload
  console.log(payload.move);
}
```

---

## Custom Error Messages

```typescript
const schema = z.object({
  type: z.literal('delta', {
    message: "Invalid payload type - expected 'delta'",
  }),
  turn: z.number().int().min(0, {
    message: "Turn must be non-negative",
  }),
  checksum: z.string().length(64, {
    message: "Invalid checksum - must be 64 characters (SHA-256)",
  }),
});
```

---

## When to Use safeParse vs parse

### Use `.safeParse()` (Recommended)

```typescript
const result = schema.safeParse(data);
if (result.success) {
  // Use result.data
} else {
  // Handle result.error
}
```

**When:**
- Untrusted data (URLs, localStorage)
- Expected failures (user input)
- Need graceful error handling
- Performance matters (no exceptions)

### Use `.parse()` (Rare)

```typescript
try {
  const validated = schema.parse(data);
} catch (error) {
  // Handle error
}
```

**When:**
- Trusted data (should never fail)
- Want to stop execution on failure
- Using centralized error handling

---

## Common Gotchas

### ❌ Forgetting to Check success

```typescript
const result = schema.safeParse(data);
console.log(result.data); // ❌ TypeScript error if !success
```

### ✅ Always Check success

```typescript
const result = schema.safeParse(data);
if (result.success) {
  console.log(result.data); // ✅ Safe
}
```

### ❌ Re-validating Trusted Data

```typescript
function process(data: unknown) {
  const validated = schema.parse(data); // Wasteful if already validated!
}
```

### ✅ Validate Once at Boundary

```typescript
function loadData(raw: unknown): ValidatedData {
  return schema.parse(raw); // Validate once
}

function process(data: ValidatedData) {
  // No validation needed - already typed
}
```

---

## Links

**Full Guide:** `/PRPs/research/zod-advanced-patterns-phase3.md`
**Existing Patterns:** `/src/lib/validation/schemas.ts`
**Phase 3 Spec:** `/PRPs/phase-3-url-state-sync-flows.md`

**Official Docs:**
- https://zod.dev/
- https://zod.dev/api
- https://github.com/colinhacks/zod

**Libraries:**
- `pnpm add zod-validation-error` - User-friendly errors

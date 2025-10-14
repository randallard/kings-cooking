# Zod Schema Validation Patterns - Research Document

**Research Date:** 2025-10-02
**Context:** Prisoner's Dilemma game using Zod 3.22 for runtime validation
**Primary Use Cases:** URL parameters, localStorage, untrusted data validation

---

## Table of Contents

1. [Zod Basics](#zod-basics)
2. [Advanced Patterns](#advanced-patterns)
3. [Runtime Validation Best Practices](#runtime-validation-best-practices)
4. [localStorage Validation](#localstorage-validation)
5. [URL Parameter Validation](#url-parameter-validation)
6. [Type Safety Patterns](#type-safety-patterns)
7. [Schema Composition](#schema-composition)
8. [Error Handling](#error-handling)
9. [Performance Considerations](#performance-considerations)
10. [Common Pitfalls & Anti-Patterns](#common-pitfalls--anti-patterns)
11. [Code Examples from Your Codebase](#code-examples-from-your-codebase)

---

## 1. Zod Basics

### Official Documentation
- **Main Site:** https://zod.dev/
- **API Reference:** https://zod.dev/api
- **Basic Usage:** https://zod.dev/basics
- **GitHub:** https://github.com/colinhacks/zod

### Schema Definition

```typescript
import { z } from 'zod';

// Basic types
const StringSchema = z.string();
const NumberSchema = z.number();
const BooleanSchema = z.boolean();

// Object schema
const UserSchema = z.object({
  username: z.string(),
  age: z.number().positive(),
  email: z.string().email().optional(),
});

// Type inference
type User = z.infer<typeof UserSchema>;
// Result: { username: string; age: number; email?: string; }
```

### Validation Methods

**Two primary methods for validation:**

1. **`.parse()`** - Throws on failure
```typescript
try {
  const user = UserSchema.parse(unknownData);
  // user is validated and type-safe
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation failed:', error.issues);
  }
}
```

2. **`.safeParse()`** - Returns result object (recommended for most cases)
```typescript
const result = UserSchema.safeParse(unknownData);

if (result.success) {
  // result.data contains validated data
  const user = result.data;
} else {
  // result.error contains ZodError
  console.error(result.error.issues);
}
```

**Key Difference:** Using `parse()` in a try/catch might be slower than `safeParse()` because throwing exceptions is expensive. If you expect failures to be common or you're doing many validations, `safeParse()` is more efficient.

---

## 2. Advanced Patterns

### Branded Types

**Purpose:** Prevent structural type compatibility at compile time. Branded types provide type safety without runtime overhead.

```typescript
// Define branded types
const PlayerIdSchema = z.string().min(1).brand<'PlayerId'>();
type PlayerId = z.infer<typeof PlayerIdSchema>;

const GameIdSchema = z.string().uuid().brand<'GameId'>();
type GameId = z.infer<typeof GameIdSchema>;

// Prevents accidental misuse
function getPlayer(id: PlayerId) { /* ... */ }
const gameId: GameId = "123e4567-e89b-12d3-a456-426614174000" as GameId;
getPlayer(gameId); // ❌ Type error - GameId not assignable to PlayerId

// Must validate to create branded type
const playerId = PlayerIdSchema.parse('p1'); // ✅ Creates branded PlayerId
```

**Important:** Branded types do NOT affect runtime validation - they are static-only constructs for compile-time safety.

**Reference:** https://zod.dev/api (search for "brand")

### Custom Error Messages

```typescript
// Method 1: Simple message
const password = z.string().min(8, "Password must be at least 8 characters");

// Method 2: Using refine with custom message
const passwordForm = z.object({
  password: z.string(),
  confirm: z.string(),
}).refine((data) => data.password === data.confirm, {
  message: "Passwords don't match",
  path: ["confirm"], // Specify which field the error applies to
});

// Method 3: Error map function for conditional messages
const field = z.string({
  error: (iss) => {
    return iss.input === undefined
      ? "Field is required"
      : "Invalid input";
  }
});
```

**Reference:** https://zod.dev/error-customization

### Transformations

```typescript
// Basic transformation
const stringToLength = z.string().transform(val => val.length);
stringToLength.parse("hello"); // Returns: 5

// Async transformation
const idToUser = z.string().uuid().transform(async (id) => {
  return await db.getUserById(id);
});

// Chain transformations
const uppercaseTrimmed = z.string()
  .transform(val => val.trim())
  .transform(val => val.toUpperCase());
```

**Reference:** https://zod.dev/api (search for "transform")

### Schema Refinements

```typescript
// Basic refinement
const shortString = z.string().refine(
  (val) => val.length <= 255,
  { message: "String too long" }
);

// Complex validation with superRefine
const UniqueStringArray = z.array(z.string()).superRefine((val, ctx) => {
  const seen = new Set();
  val.forEach((item, idx) => {
    if (seen.has(item)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate value: ${item}`,
        path: [idx],
      });
    }
    seen.add(item);
  });

  if (val.length > 3) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: 3,
      type: 'array',
      inclusive: true,
      message: "Too many items"
    });
  }
});
```

**Reference:** https://zod.dev/api (search for "refine" and "superRefine")

---

## 3. Runtime Validation Best Practices

### When to Validate (CRITICAL)

**✅ DO VALIDATE:**

1. **Untrusted Inputs**
   - User form submissions
   - URL parameters (query strings, route params)
   - localStorage/sessionStorage data
   - CLI arguments
   - Public API endpoints
   - WebSocket messages
   - Third-party API responses

2. **External Data Sources**
   - APIs you don't control (GitHub, YouTube, etc.)
   - APIs from other organizational teams
   - Data that could change unexpectedly

**❌ DON'T VALIDATE:**

1. **Trusted, Controlled Data**
   - Internal function parameters within your codebase
   - Data you've already validated once (avoid redundant validation)
   - Type-safe database query results from your own schema

**Reference:** https://www.totaltypescript.com/when-should-you-use-zod

### Validation Strategy Principles

```typescript
// ✅ GOOD: Validate at API boundary
export async function fetchGameState(encryptedData: string): Promise<GameState> {
  const decrypted = decrypt(encryptedData);
  const validated = GameStateSchema.parse(decrypted); // Validate once here
  return validated; // Now trusted throughout the app
}

// ❌ BAD: Re-validating trusted data
function updateGame(state: GameState) {
  const revalidated = GameStateSchema.parse(state); // Unnecessary!
  // state was already validated at the boundary
}
```

**Key Principle:** "Validate at your API boundary - you can consider that data trusted within your system afterward."

**Reference:** https://stevekinney.com/courses/full-stack-typescript/zod-best-practices

### Enable Strict Mode

Always enable strict mode in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

This is a best practice for all TypeScript projects and ensures Zod's type inference works correctly.

---

## 4. localStorage Validation

### Why Validate localStorage?

- **Runtime Type Safety:** TypeScript type checking disappears after build - Zod provides runtime validation
- **Data Corruption:** localStorage can be modified by users or browser extensions
- **Schema Evolution:** Your app's data structure may change between versions
- **Security:** Prevent malicious data injection

**References:**
- https://medium.com/@michu2k/validate-data-in-browser-storage-with-zod-be254f465a40
- https://github.com/bigbeno37/zod-localstorage
- https://github.com/sharry/zod-storage

### Basic localStorage Validation Pattern

```typescript
import { z } from 'zod';

const GameHistorySchema = z.object({
  playerName: z.string(),
  sessionId: z.string(),
  games: z.array(z.object({
    gameId: z.string().uuid(),
    result: z.enum(['win', 'loss', 'tie']),
    completedAt: z.string().datetime(),
  })),
});

type GameHistory = z.infer<typeof GameHistorySchema>;

function loadGameHistory(): GameHistory | null {
  try {
    const stored = localStorage.getItem('game-history');

    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);
    const result = GameHistorySchema.safeParse(parsed);

    if (result.success) {
      // Data is valid - safe to use
      return result.data;
    } else {
      // Data is invalid - remove corrupted data
      console.error('Invalid localStorage data:', result.error);
      localStorage.removeItem('game-history');
      return null;
    }
  } catch (error) {
    console.error('Failed to load game history:', error);
    localStorage.removeItem('game-history');
    return null;
  }
}

function saveGameHistory(history: GameHistory): void {
  try {
    // Validate before saving (optional but recommended)
    const validated = GameHistorySchema.parse(history);
    localStorage.setItem('game-history', JSON.stringify(validated));
  } catch (error) {
    console.error('Failed to save game history:', error);
    throw new Error('Invalid game history data');
  }
}
```

### Handling Invalid/Corrupt Data

**Best Practice:** When validation fails, remove the corrupted data to prevent repeated errors:

```typescript
const result = schema.safeParse(data);

if (!result.success) {
  // Log for debugging
  console.warn('Removing invalid localStorage data:', result.error.issues);

  // Remove corrupted data
  localStorage.removeItem(storageKey);

  // Return safe default
  return createDefaultData();
}
```

### Dedicated Libraries

For production apps, consider these battle-tested libraries:

1. **zod-storage** - Runtime validation with intellisense
   ```typescript
   import { createStorage } from 'zod-storage';

   const storage = createStorage(localStorage, {
     playerName: z.string().default(''),
     settings: z.object({
       theme: z.enum(['light', 'dark']).default('light'),
     }),
   });

   storage.playerName.set('Alice'); // Type-safe
   const name = storage.playerName.get(); // Returns validated string
   ```

2. **zod-localstorage** - Type-safe localStorage access
   ```typescript
   import { createLocalStorage } from 'zod-localstorage';

   const storage = createLocalStorage({
     gameState: GameStateSchema,
   });

   storage.set('gameState', validatedState);
   const state = storage.get('gameState'); // Validated on retrieval
   ```

**References:**
- https://github.com/sharry/zod-storage
- https://github.com/bigbeno37/zod-localstorage

---

## 5. URL Parameter Validation

### Why Validate URL Parameters?

- **Always Strings:** URL params are always strings (or undefined) - need type coercion
- **User Manipulation:** Users can modify URLs directly
- **Sharing:** URLs are shared between users with different contexts
- **Security:** Prevent injection attacks and malicious payloads

**References:**
- https://dev.to/rgolawski/parsing-url-search-parameters-with-zod-4kef
- https://phelipetls.github.io/posts/url-search-params-zod/

### Basic URL Parameter Validation

```typescript
import { z } from 'zod';

// Define schema for URL parameters
const UrlParamsSchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  sort: z.enum(['asc', 'desc']).catch('asc'),
  filter: z.string().optional().catch(''),
  ids: z.array(z.string().uuid()).optional(),
});

type UrlParams = z.infer<typeof UrlParamsSchema>;

// Parse URL parameters
function parseUrlParams(): UrlParams {
  const searchParams = new URLSearchParams(window.location.search);

  const params = UrlParamsSchema.parse({
    page: searchParams.get('page'),
    sort: searchParams.get('sort'),
    filter: searchParams.get('filter'),
    ids: searchParams.get('ids')?.split(','),
  });

  return params;
}

// Usage
const params = parseUrlParams();
// params.page is a number (not string!)
// params.sort is 'asc' | 'desc' (validated)
// Invalid values fallback to defaults via .catch()
```

### Type Coercion Patterns

**`.coerce` - Automatic type conversion (Zod 3.20+):**

```typescript
// Number coercion
z.coerce.number() // "123" → 123
z.coerce.number().int().positive() // Validates after coercion

// Boolean coercion
z.coerce.boolean() // "true" → true, "false" → false

// Date coercion
z.coerce.date() // "2025-10-02" → Date object
```

**Manual coercion (pre-3.20 or for custom logic):**

```typescript
const pageSchema = z.string()
  .transform(val => Number(val))
  .pipe(z.number().int().positive().catch(1));

const boolSchema = z.string()
  .transform(val => val.toLowerCase() === 'true')
  .pipe(z.boolean());
```

### Default Values with `.catch()`

**`.catch()` provides a fallback value when validation fails:**

```typescript
// Basic default
const page = z.coerce.number().catch(1);
page.parse("invalid"); // Returns: 1

// Different fallback types
z.number().catch(0)                    // Fallback to 0
z.number().nullable().catch(null)       // Fallback to null
z.number().optional().catch(undefined)  // Fallback to undefined

// Function-based fallback
z.number().catch((ctx) => {
  console.error('Invalid number:', ctx.error);
  return 0;
});
```

### Sanitization Pattern

**Remove unexpected query parameters:**

```typescript
const AllowedParamsSchema = z.object({
  gameId: z.string().uuid(),
  playerId: z.string(),
}).strict(); // Reject unknown keys

// URL: ?gameId=123&playerId=p1&malicious=<script>alert()</script>
const result = AllowedParamsSchema.safeParse(params);

if (result.success) {
  // result.data only contains gameId and playerId
  // malicious param is stripped
}
```

### Complete URL Validation Example

```typescript
// Schema with validation and defaults
const GameUrlParamsSchema = z.object({
  // Required UUID
  gameId: z.string().uuid({ message: "Invalid game ID" }),

  // Optional player ID with default
  playerId: z.string().min(1).optional().catch('guest'),

  // Number with range validation
  round: z.coerce.number().int().min(1).max(5).catch(1),

  // Enum with default
  view: z.enum(['board', 'history', 'settings']).catch('board'),

  // Boolean flag
  debug: z.coerce.boolean().catch(false),
});

type GameUrlParams = z.infer<typeof GameUrlParamsSchema>;

function parseGameUrl(): GameUrlParams {
  const searchParams = new URLSearchParams(window.location.search);

  const rawParams = {
    gameId: searchParams.get('gameId'),
    playerId: searchParams.get('playerId'),
    round: searchParams.get('round'),
    view: searchParams.get('view'),
    debug: searchParams.get('debug'),
  };

  const result = GameUrlParamsSchema.safeParse(rawParams);

  if (!result.success) {
    console.error('Invalid URL parameters:', result.error);
    // Redirect to safe default or show error
    throw new Error('Invalid URL parameters');
  }

  return result.data;
}
```

**Reference:** https://vueschool.io/articles/vuejs-tutorials/zod-and-query-string-variables-in-nuxt/

---

## 6. Type Safety Patterns

### Type Inference with `z.infer<>`

**Always use `z.infer<>` to derive types from schemas (single source of truth):**

```typescript
// ✅ GOOD: Schema is source of truth
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().positive(),
});

type User = z.infer<typeof UserSchema>;

// ❌ BAD: Duplicate type definition
interface User {
  id: string;
  name: string;
  age: number;
}
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  age: z.number().int().positive(),
});
// These can drift apart!
```

### Branded Types for Type Safety

**Use branded types to prevent ID confusion:**

```typescript
// Without branded types - unsafe!
const userId: string = "123";
const gameId: string = "456";

function getUser(id: string) { /* ... */ }
getUser(gameId); // ❌ Compiles but wrong!

// With branded types - safe!
const UserIdSchema = z.string().uuid().brand<'UserId'>();
const GameIdSchema = z.string().uuid().brand<'GameId'>();

type UserId = z.infer<typeof UserIdSchema>;
type GameId = z.infer<typeof GameIdSchema>;

function getUser(id: UserId) { /* ... */ }
const gameId: GameId = GameIdSchema.parse("123e4567-e89b-12d3-a456-426614174000");
getUser(gameId); // ✅ Compile error!

// Must validate to create branded type
const validUserId = UserIdSchema.parse("user-123");
getUser(validUserId); // ✅ Works!
```

### Input vs Output Types

```typescript
// Schema with transformations
const UserInputSchema = z.object({
  name: z.string(),
  birthDate: z.string().datetime(),
}).transform(data => ({
  name: data.name.trim().toLowerCase(),
  birthDate: new Date(data.birthDate),
  age: calculateAge(new Date(data.birthDate)),
}));

// Input type (before transformation)
type UserInput = z.input<typeof UserInputSchema>;
// { name: string; birthDate: string; }

// Output type (after transformation)
type UserOutput = z.output<typeof UserInputSchema>;
// { name: string; birthDate: Date; age: number; }

// Inferred type is the output type
type User = z.infer<typeof UserInputSchema>;
// Same as UserOutput
```

---

## 7. Schema Composition

### Extend

**Add properties to existing schema:**

```typescript
const BaseUserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

const AdminUserSchema = BaseUserSchema.extend({
  role: z.literal('admin'),
  permissions: z.array(z.string()),
});

type AdminUser = z.infer<typeof AdminUserSchema>;
// { id: string; name: string; role: 'admin'; permissions: string[]; }
```

**Reference:** https://zod.dev/api (search for "extend")

### Merge

**Combine multiple schemas:**

```typescript
const PersonSchema = z.object({
  name: z.string(),
  age: z.number(),
});

const ContactSchema = z.object({
  email: z.string().email(),
  phone: z.string().optional(),
});

const UserSchema = PersonSchema.merge(ContactSchema);

type User = z.infer<typeof UserSchema>;
// { name: string; age: number; email: string; phone?: string; }
```

**Important:** Prefer `.extend()` over `.merge()` when one schema is a clear extension. Use `.merge()` when combining independent schemas.

**Reference:** https://stackoverflow.com/questions/77427502/how-to-merge-multiple-zod-object-schema

### Pick

**Select specific properties:**

```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
  role: z.enum(['user', 'admin']),
});

const PublicUserSchema = UserSchema.pick({
  id: true,
  name: true,
  email: true,
});

type PublicUser = z.infer<typeof PublicUserSchema>;
// { id: string; name: string; email: string; }
```

### Omit

**Exclude specific properties:**

```typescript
const UserWithPasswordSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

const SafeUserSchema = UserWithPasswordSchema.omit({
  password: true,
});

type SafeUser = z.infer<typeof SafeUserSchema>;
// { id: string; name: string; email: string; }
```

### Partial

**Make all or some properties optional:**

```typescript
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  bio: z.string(),
});

// Make all optional
const PartialUserSchema = UserSchema.partial();
type PartialUser = z.infer<typeof PartialUserSchema>;
// { id?: string; name?: string; email?: string; bio?: string; }

// Make specific properties optional
const UserUpdateSchema = UserSchema.partial({
  name: true,
  bio: true,
});
type UserUpdate = z.infer<typeof UserUpdateSchema>;
// { id: string; email: string; name?: string; bio?: string; }
```

### Intersection vs Extend

```typescript
const A = z.object({ a: z.string() });
const B = z.object({ b: z.number() });

// ❌ Avoid intersection for objects
const AB1 = z.intersection(A, B); // Returns ZodIntersection (lacks methods)

// ✅ Prefer extend or merge
const AB2 = A.extend({ b: z.number() }); // Returns ZodObject (has methods)
const AB3 = A.merge(B); // Returns ZodObject (has methods)

// AB2 and AB3 have .pick(), .omit(), etc.
// AB1 does NOT have these methods
```

**Reference:** https://zod.dev/api (search for "intersection")

---

## 8. Error Handling

### ZodError Structure

```typescript
import { z } from 'zod';

try {
  schema.parse(invalidData);
} catch (error) {
  if (error instanceof z.ZodError) {
    // error.issues is an array of validation errors
    error.issues.forEach(issue => {
      console.log({
        code: issue.code,        // 'invalid_type', 'too_small', etc.
        path: issue.path,        // ['user', 'email'] - path to error
        message: issue.message,  // Human-readable message
        expected: issue.expected, // Expected type
        received: issue.received, // Actual type
      });
    });
  }
}
```

**Reference:** https://zod.dev/error-formatting

### Error Formatting Methods

**1. `.format()` - Nested object structure:**

```typescript
const FormSchema = z.object({
  username: z.string(),
  favoriteNumbers: z.array(z.number()),
});

const result = FormSchema.safeParse({
  username: 42,
  favoriteNumbers: [1, "two", 3],
  extraKey: "ignored",
});

if (!result.success) {
  const formatted = result.error.format();
  /*
  {
    _errors: ['Unrecognized key: "extraKey"'],
    username: {
      _errors: ['Expected string, received number']
    },
    favoriteNumbers: {
      _errors: [],
      1: { _errors: ['Expected number, received string'] }
    }
  }
  */
}
```

**2. `.flatten()` - Flat structure for forms:**

```typescript
const flattened = result.error.flatten();
/*
{
  formErrors: ['Unrecognized key: "extraKey"'],
  fieldErrors: {
    username: ['Expected string, received number'],
    favoriteNumbers: ['Expected number, received string']
  }
}
*/
```

**3. Custom formatting with `prettifyError()` (from zod-validation-error):**

```typescript
import { fromError } from 'zod-validation-error';

try {
  schema.parse(data);
} catch (err) {
  const validationError = fromError(err);
  console.log(validationError.toString());
  // "Validation error: Expected string, received number at username"
}
```

**Reference:** https://github.com/causaly/zod-validation-error

### User-Friendly Error Messages

**Use the zod-validation-error library for production:**

```typescript
import { z } from 'zod';
import { fromError } from 'zod-validation-error';

const EmailSchema = z.string().email();

try {
  EmailSchema.parse('invalid-email');
} catch (err) {
  const validationError = fromError(err);

  // User-friendly message
  console.log(validationError.message);
  // "Invalid email"

  // Original error for debugging
  console.log(validationError.details);
  // Full ZodError with all issues
}
```

**Custom error messages:**

```typescript
const PasswordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number");

const FormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: PasswordSchema,
  confirmPassword: z.string(),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: "Passwords must match",
    path: ["confirmPassword"], // Show error on confirmPassword field
  }
);
```

**Reference:** https://zod.dev/error-customization

### Error Map for Global Customization

```typescript
import { z } from 'zod';

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.expected === "string") {
      return { message: "This field must be text" };
    }
  }

  if (issue.code === z.ZodIssueCode.too_small) {
    if (issue.type === "string") {
      return { message: `Must be at least ${issue.minimum} characters` };
    }
  }

  return { message: ctx.defaultError }; // Fallback to default
};

// Apply globally
z.setErrorMap(customErrorMap);

// Or per-schema
const schema = z.string().min(5);
schema.parse("abc", { errorMap: customErrorMap });
```

**Reference:** https://zod.dev/error-customization

### Production Error Handling Pattern

```typescript
import { z } from 'zod';
import { fromError } from 'zod-validation-error';

function validateAndHandleErrors<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T | null {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  // Log detailed error for debugging
  console.error(`Validation failed in ${context}:`, result.error.issues);

  // Show user-friendly error
  const userError = fromError(result.error);
  showErrorToUser(userError.message);

  // Track error for monitoring
  trackError({
    context,
    error: result.error,
    data: JSON.stringify(data),
  });

  return null;
}

// Usage
const gameState = validateAndHandleErrors(
  GameStateSchema,
  urlData,
  'URL parameter parsing'
);

if (!gameState) {
  // Redirect to error page or show fallback UI
  redirectToNewGame();
}
```

---

## 9. Performance Considerations

### Bundle Size

- **Zod is 12kb gzipped** - acceptable for most apps
- If bundle size is critical, consider alternatives or lazy-load validation

**Reference:** https://www.totaltypescript.com/when-should-you-use-zod

### Validation Overhead

- **Parsing 500,000 objects took ~2 seconds** in benchmarks
- For high-throughput scenarios, validation can cause event loop delays
- **Validation is slower than not validating** - but robustness usually outweighs cost

**Reference:** https://numeric.substack.com/p/how-we-doubled-zod-performance-to

### Performance Best Practices

**1. Define schemas once (module level):**

```typescript
// ✅ GOOD: Define once at module scope
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

export function validateUser(data: unknown) {
  return UserSchema.parse(data);
}

// ❌ BAD: Recreating schema on every call
export function validateUser(data: unknown) {
  const schema = z.object({
    name: z.string(),
    email: z.string().email(),
  });
  return schema.parse(data);
}
```

**2. Avoid redundant validations:**

```typescript
// ✅ GOOD: Validate once at boundary
export async function loadGameState(url: string): Promise<GameState> {
  const data = await fetchFromUrl(url);
  const validated = GameStateSchema.parse(data); // Validate once
  return validated;
}

function processGameState(state: GameState) {
  // state is already validated - no need to re-validate
  updateUI(state);
}

// ❌ BAD: Re-validating in every function
function processGameState(state: unknown) {
  const validated = GameStateSchema.parse(state); // Wasteful!
  updateUI(validated);
}
```

**3. Use `safeParse` for expected failures:**

```typescript
// ✅ GOOD: safeParse is faster when failures are common
function parseUserInput(input: string) {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  return null;
}

// ❌ SLOWER: try/catch with parse (exception throwing is expensive)
function parseUserInput(input: string) {
  try {
    return schema.parse(input);
  } catch {
    return null;
  }
}
```

**4. Validate arrays efficiently:**

```typescript
// ✅ GOOD: Validate entire array at once
const usersSchema = z.array(UserSchema);
const validatedUsers = usersSchema.parse(users);

// ❌ BAD: Validating in a loop
const validatedUsers = users.map(user => UserSchema.parse(user));
```

**5. Use `.passthrough()` for performance when safe:**

```typescript
// If you don't care about unknown properties
const schema = z.object({
  id: z.string(),
  name: z.string(),
}).passthrough(); // Skips key stripping (faster)

// vs strict mode (slower but safer)
const strictSchema = z.object({
  id: z.string(),
  name: z.string(),
}).strict(); // Throws on unknown keys
```

**6. Profile before optimizing:**

Most bottlenecks are in I/O or database, not validation. Use browser DevTools or Node.js profiler to identify actual bottlenecks before optimizing validation.

**References:**
- https://stevekinney.com/courses/full-stack-typescript/zod-best-practices
- https://app.studyraid.com/en/read/11289/352206/optimizing-validation-performance

---

## 10. Common Pitfalls & Anti-Patterns

### 1. Overusing Type Assertions Instead of Validation

```typescript
// ❌ BAD: Type assertion (no runtime safety)
const user = data as User;

// ✅ GOOD: Runtime validation
const user = UserSchema.parse(data);
```

**Reference:** https://medium.com/ekino-france/zod-why-youre-using-typescript-wrong-b0c1583df089

### 2. Validating Everything (Including Trusted Data)

```typescript
// ❌ BAD: Unnecessary validation
function calculateTotal(items: CartItem[]) {
  const validatedItems = CartItemSchema.array().parse(items);
  return validatedItems.reduce((sum, item) => sum + item.price, 0);
}

// ✅ GOOD: Trust already-validated data
function calculateTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

**When to skip validation:** "When your app has inputs you trust and control, validation with Zod is typically not necessary."

### 3. Duplicating Types and Schemas

```typescript
// ❌ BAD: Duplicate definitions (can drift)
interface User {
  name: string;
  email: string;
}

const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

// ✅ GOOD: Single source of truth
const UserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
});

type User = z.infer<typeof UserSchema>;
```

### 4. Not Handling Validation Errors

```typescript
// ❌ BAD: Silent failure
const user = UserSchema.parse(data); // Throws uncaught error!

// ✅ GOOD: Explicit error handling
const result = UserSchema.safeParse(data);
if (!result.success) {
  console.error('Validation failed:', result.error);
  showErrorToUser('Invalid user data');
  return;
}
const user = result.data;
```

### 5. Using Intersection for Objects

```typescript
// ❌ BAD: Intersection lacks object methods
const Combined = z.intersection(SchemaA, SchemaB);
Combined.pick({ ... }); // Error: pick doesn't exist!

// ✅ GOOD: Use extend or merge
const Combined = SchemaA.merge(SchemaB);
Combined.pick({ ... }); // Works!
```

### 6. Recreating Schemas in Loops or Functions

```typescript
// ❌ BAD: Creates new schema every call
function validateUser(data: unknown) {
  const schema = z.object({ name: z.string() }); // Wasteful!
  return schema.parse(data);
}

// ✅ GOOD: Define schema once at module level
const UserSchema = z.object({ name: z.string() });

function validateUser(data: unknown) {
  return UserSchema.parse(data);
}
```

### 7. Not Validating at API Boundaries

```typescript
// ❌ BAD: Passing unvalidated data through app
export function loadGame(urlParam: string) {
  const data = JSON.parse(atob(urlParam));
  return data; // Unknown type!
}

// ✅ GOOD: Validate at boundary
export function loadGame(urlParam: string): GameState {
  const data = JSON.parse(atob(urlParam));
  return GameStateSchema.parse(data); // Validated!
}
```

### 8. Ignoring Schema Versioning

```typescript
// ❌ BAD: No version field
const GameStateSchema = z.object({
  gameId: z.string(),
  // ...
});

// ✅ GOOD: Include version for schema evolution
const GameStateSchema = z.object({
  version: z.literal('1.0.0'),
  gameId: z.string(),
  // ...
});

// Handle migration
function migrateGameState(data: unknown): GameState {
  const result = z.object({ version: z.string() }).safeParse(data);

  if (result.success) {
    if (result.data.version === '1.0.0') {
      return GameStateSchemaV1.parse(data);
    }
    // Handle other versions
  }

  throw new Error('Unsupported game state version');
}
```

**Reference:** https://github.com/colinhacks/zod/issues/372

---

## 11. Code Examples from Your Codebase

### Current Implementation Analysis

Your codebase at `/home/ryankhetlyr/Development/correspondence-games/` already implements several Zod best practices:

#### 1. Comprehensive Schema Definition (`src/features/game/schemas/gameSchema.ts`)

**Strengths:**
- ✅ Uses branded types for IDs (`PlayerId`, `GameId`)
- ✅ Includes schema version (`version: z.literal('1.0.0')`)
- ✅ Provides both `parse()` and `safeParse()` wrappers
- ✅ Extensive JSDoc documentation
- ✅ Type inference with `z.infer<>`
- ✅ Validation constraints (min/max, datetime, UUID)

```typescript
// From gameSchema.ts
export const PlayerIdSchema = z.string().min(1).brand<'PlayerId'>();
export const GameIdSchema = z.string().uuid().brand<'GameId'>();

export const GameStateSchema = z.object({
  version: z.literal('1.0.0'), // ✅ Versioning
  gameId: GameIdSchema,
  // ... detailed schema
});

// ✅ Helper functions
export function validateGameState(data: unknown): GameState {
  return GameStateSchema.parse(data);
}

export function safeValidateGameState(data: unknown): z.SafeParseReturnType<unknown, GameState> {
  return GameStateSchema.safeParse(data);
}
```

#### 2. URL Parameter Validation (`src/features/game/utils/encryption.ts`)

**Strengths:**
- ✅ Validates after decryption
- ✅ Throws specific errors (`DecryptionError`, re-throws `ZodError`)
- ✅ Never trusts external data

```typescript
// From encryption.ts
export function decryptGameState(encoded: string): GameState {
  try {
    const encrypted = atob(encoded);
    const decrypted = CryptoJS.AES.decrypt(encrypted, GAME_SECRET).toString(CryptoJS.enc.Utf8);
    const json = LZString.decompressFromEncodedURIComponent(decrypted);
    const parsed = JSON.parse(json);

    // ✅ CRITICAL: NEVER trust external data without validation
    const validatedState = validateGameState(parsed);
    return validatedState;
  } catch (error) {
    if (error.name === 'ZodError') {
      throw error; // ✅ Re-throw for specific handling
    }
    throw new DecryptionError('Failed to decrypt game state', error);
  }
}
```

#### 3. localStorage Usage (`src/features/game/hooks/useLocalStorage.ts`)

**Areas for Improvement:**

```typescript
// ❌ CURRENT: No Zod validation
export function getGameHistory(): GameHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createNewHistory();
    }

    const parsed = JSON.parse(stored) as GameHistory; // ⚠️ Type assertion, no validation

    if (!parsed.sessionId) {
      parsed.sessionId = generateSessionId();
      saveGameHistory(parsed);
    }

    return parsed;
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    return createNewHistory();
  }
}
```

**✅ RECOMMENDED: Add Zod validation:**

```typescript
import { z } from 'zod';

// Define schema for GameHistory
const GameHistorySchema = z.object({
  playerName: z.string(),
  sessionId: z.string(),
  games: z.array(z.object({
    gameId: z.string().uuid(),
    winner: z.string().optional(),
    completedAt: z.string().datetime(),
    // ... other fields
  })),
});

type GameHistory = z.infer<typeof GameHistorySchema>;

export function getGameHistory(): GameHistory {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createNewHistory();
    }

    const parsed = JSON.parse(stored);

    // ✅ Validate with Zod
    const result = GameHistorySchema.safeParse(parsed);

    if (!result.success) {
      console.error('Invalid localStorage data:', result.error);
      localStorage.removeItem(STORAGE_KEY); // Remove corrupted data
      return createNewHistory();
    }

    // Ensure sessionId exists (backward compatibility)
    if (!result.data.sessionId) {
      result.data.sessionId = generateSessionId();
      saveGameHistory(result.data);
    }

    return result.data;
  } catch (error) {
    console.error('Failed to retrieve game history:', error);
    localStorage.removeItem(STORAGE_KEY);
    return createNewHistory();
  }
}

export function importGameHistory(jsonData: string): void {
  try {
    const parsed = JSON.parse(jsonData);

    // ✅ Validate before importing
    const validated = GameHistorySchema.parse(parsed);

    // Ensure sessionId exists
    if (!validated.sessionId) {
      validated.sessionId = generateSessionId();
    }

    saveGameHistory(validated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error('Invalid game history format: ' + error.message);
    }
    throw new Error('Failed to import game history: ' + (error as Error).message);
  }
}
```

### Recommended Additions

#### 1. Create a `GameHistorySchema` in a dedicated file

```typescript
// src/features/game/schemas/historySchema.ts
import { z } from 'zod';
import { GameIdSchema } from './gameSchema';

export const CompletedGameSchema = z.object({
  gameId: GameIdSchema,
  player1: z.object({
    id: z.string(),
    name: z.string().optional(),
    totalGold: z.number().int().min(0),
  }),
  player2: z.object({
    id: z.string(),
    name: z.string().optional(),
    totalGold: z.number().int().min(0),
  }),
  winner: z.string().optional(),
  completedAt: z.string().datetime(),
  rounds: z.array(z.object({
    roundNumber: z.number().int().min(1).max(5),
    p1Choice: z.enum(['silent', 'talk']),
    p2Choice: z.enum(['silent', 'talk']),
    p1Gold: z.number().int().min(0).max(5),
    p2Gold: z.number().int().min(0).max(5),
  })).length(5),
});

export const GameHistorySchema = z.object({
  playerName: z.string(),
  sessionId: z.string(),
  games: z.array(CompletedGameSchema),
});

export type CompletedGame = z.infer<typeof CompletedGameSchema>;
export type GameHistory = z.infer<typeof GameHistorySchema>;

export function validateGameHistory(data: unknown): GameHistory {
  return GameHistorySchema.parse(data);
}

export function safeValidateGameHistory(data: unknown): z.SafeParseReturnType<unknown, GameHistory> {
  return GameHistorySchema.safeParse(data);
}
```

#### 2. User-Friendly Error Handling

```typescript
// Install: npm install zod-validation-error
import { fromError } from 'zod-validation-error';

export function decryptGameState(encoded: string): GameState {
  try {
    // ... decryption logic
    const validatedState = validateGameState(parsed);
    return validatedState;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const userError = fromError(error);
      throw new DecryptionError(
        `Invalid game data: ${userError.message}`,
        error
      );
    }
    throw new DecryptionError('Failed to decrypt game state', error);
  }
}
```

#### 3. URL Parameter Helper

```typescript
// src/features/game/utils/urlParams.ts
import { z } from 'zod';

const GameUrlParamsSchema = z.object({
  s: z.string().optional(), // Encrypted game state
  debug: z.coerce.boolean().catch(false),
  view: z.enum(['game', 'history']).catch('game'),
});

export type GameUrlParams = z.infer<typeof GameUrlParamsSchema>;

export function parseGameUrlParams(): GameUrlParams {
  const searchParams = new URLSearchParams(window.location.search);

  const rawParams = {
    s: searchParams.get('s'),
    debug: searchParams.get('debug'),
    view: searchParams.get('view'),
  };

  const result = GameUrlParamsSchema.safeParse(rawParams);

  if (!result.success) {
    console.warn('Invalid URL parameters:', result.error);
    return { debug: false, view: 'game' }; // Safe defaults
  }

  return result.data;
}
```

---

## Summary: Key Takeaways

### Must-Follow Patterns

1. **✅ Validate all untrusted data** - URL params, localStorage, API responses
2. **✅ Use `.safeParse()` for user input** - Better error handling and performance
3. **✅ Use branded types for IDs** - Prevent mixing different ID types
4. **✅ Define schemas at module level** - Don't recreate in loops/functions
5. **✅ Use `z.infer<>` for types** - Single source of truth
6. **✅ Validate at API boundaries** - Trust data within your system afterward
7. **✅ Handle errors gracefully** - Use `fromError()` for user-friendly messages
8. **✅ Include schema version** - Support migration and backward compatibility
9. **✅ Remove corrupted localStorage data** - Don't let invalid data persist

### Anti-Patterns to Avoid

1. **❌ Don't validate trusted data** - Avoid redundant validation
2. **❌ Don't use type assertions** - Use Zod validation instead
3. **❌ Don't ignore validation errors** - Always handle `ZodError`
4. **❌ Don't recreate schemas** - Define once at module level
5. **❌ Don't use intersection for objects** - Use `.extend()` or `.merge()`
6. **❌ Don't skip validation at boundaries** - External data is never trusted

### Quick Reference Links

- **Official Docs:** https://zod.dev/
- **API Reference:** https://zod.dev/api
- **Error Customization:** https://zod.dev/error-customization
- **Error Formatting:** https://zod.dev/error-formatting
- **When to Use Zod:** https://www.totaltypescript.com/when-should-you-use-zod
- **Best Practices:** https://stevekinney.com/courses/full-stack-typescript/zod-best-practices
- **GitHub:** https://github.com/colinhacks/zod
- **zod-validation-error:** https://github.com/causaly/zod-validation-error
- **zod-storage:** https://github.com/sharry/zod-storage

---

## Additional Resources

### Related Libraries

1. **zod-validation-error** - User-friendly error messages
   - npm: `npm install zod-validation-error`
   - GitHub: https://github.com/causaly/zod-validation-error

2. **zod-storage** - Type-safe localStorage with Zod
   - GitHub: https://github.com/sharry/zod-storage

3. **zod-localstorage** - Alternative localStorage wrapper
   - GitHub: https://github.com/bigbeno37/zod-localstorage

### Articles & Tutorials

1. "Schema Validation with Zod in 2025" - https://www.turing.com/blog/data-integrity-through-zod-validation
2. "Understanding Zod: Comprehensive Guide" - https://dev.to/abhilaksharora/understanding-zod-a-comprehensive-guide-to-schema-validation-in-javascripttypescript-171k
3. "Master schema validation with Zod" - https://dev.to/_domenicocolandrea/master-schema-validation-in-typescript-with-zod-28dc
4. "Validating data from browser storage with Zod" - https://medium.com/@michu2k/validate-data-in-browser-storage-with-zod-be254f465a40
5. "Parsing URL Search Parameters with Zod" - https://dev.to/rgolawski/parsing-url-search-parameters-with-zod-4kef

### Performance & Advanced Topics

1. "How we doubled Zod performance" - https://numeric.substack.com/p/how-we-doubled-zod-performance-to
2. "Zod Best Practices" - https://stevekinney.com/courses/full-stack-typescript/zod-best-practices
3. "When should you use Zod?" - https://www.totaltypescript.com/when-should-you-use-zod

---

**End of Research Document**

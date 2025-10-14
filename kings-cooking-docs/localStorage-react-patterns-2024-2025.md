# Modern localStorage Patterns with React (2024-2025)

## Table of Contents
1. [localStorage + React Hooks](#localstorage--react-hooks)
2. [Data Synchronization](#data-synchronization)
3. [Error Handling](#error-handling)
4. [Type Safety](#type-safety)
5. [JSON Serialization](#json-serialization)
6. [Cross-Tab Synchronization](#cross-tab-synchronization)
7. [SSR Considerations](#ssr-considerations)
8. [Testing localStorage](#testing-localstorage)
9. [Common Pitfalls](#common-pitfalls)
10. [Security Concerns](#security-concerns)

---

## localStorage + React Hooks

### Basic Custom Hook Pattern

The most common pattern in 2024 is creating a reusable `useLocalStorage` hook:

```typescript
function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    // Lazy initialization - only runs once
    if (typeof window === 'undefined') return defaultValue;

    try {
      const saved = localStorage.getItem(key);
      return saved !== null ? JSON.parse(saved) : defaultValue;
    } catch (error) {
      console.error(`Error loading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue] as const;
}
```

**Key Features:**
- Lazy initialization (runs only once on mount)
- SSR-safe with `typeof window` check
- Error handling for both read and write
- Automatic JSON serialization/deserialization

**Source:** [LogRocket - Using localStorage with React Hooks](https://blog.logrocket.com/using-localstorage-react-hooks/)

### usehooks-ts Implementation

The popular `usehooks-ts` library provides a robust implementation:

```typescript
type UseLocalStorageOptions<T> = {
  serializer?: (value: T) => string
  deserializer?: (value: string) => T
  initializeWithValue?: boolean // Default: true
}

function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  options?: UseLocalStorageOptions<T>
): [T, Dispatch<SetStateAction<T>>, () => void]
```

**Advanced Features:**
- Custom serialization/deserialization functions
- Support for function-based initial values
- Removal function `removeValue()`
- Cross-tab synchronization via custom events
- TypeScript generics for type safety

**API:**
```typescript
const [value, setValue, removeValue] = useLocalStorage('test-key', 0);

// Functional updates (like useState)
setValue((x: number) => x + 1);

// Remove value
removeValue();
```

**Source:** [usehooks-ts - useLocalStorage](https://usehooks-ts.com/react-hook/use-local-storage)

---

## Data Synchronization

### useSyncExternalStore Pattern (React 18+)

Modern React 18+ applications should use `useSyncExternalStore` for external state:

```typescript
import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";
const THEME_STORAGE_KEY = "app-theme";

// Get current snapshot from localStorage
const getSnapshot = (): Theme => {
  return (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || "light";
};

// Subscribe to storage events
const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
  };
};

// Custom hook
const useThemeStore = (): [Theme, (newTheme: Theme) => void] => {
  const theme = useSyncExternalStore(subscribe, getSnapshot);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    // Manually dispatch event for same-tab updates
    window.dispatchEvent(new Event("storage"));
  };

  return [theme, setTheme];
};
```

**Benefits:**
- SSR-friendly with proper hydration
- Automatic synchronization across components
- Concurrent rendering compatible
- Prevents tearing in concurrent updates

**Important Note:** The `storage` event is NOT triggered in the same tab that made the change. You must manually dispatch a `storage` event to trigger updates in the current tab.

**Sources:**
- [56kode - Using useSyncExternalStore with LocalStorage](https://www.56kode.com/posts/using-usesyncexternalstore-with-localstorage/)
- [React Docs - useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)

---

## Error Handling

### QuotaExceededError Detection

```typescript
function isQuotaExceededError(err: unknown): boolean {
  return (
    err instanceof DOMException &&
    (err.code === 22 ||           // Everything except Firefox
     err.code === 1014 ||          // Firefox
     err.name === "QuotaExceededError" ||
     err.name === "NS_ERROR_DOM_QUOTA_REACHED") // Firefox
  );
}
```

### Storage Availability Check

```typescript
function isStorageSupported(
  webStorageType: "localStorage" | "sessionStorage" = "localStorage"
): boolean {
  let storage: Storage | undefined;

  try {
    storage = window[webStorageType];
    if (!storage) return false;

    // Test write capability
    const testKey = `__storage_test__`;
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch (err) {
    // Storage might be full but still supported
    const isValidQuotaExceededError =
      isQuotaExceededError(err) && storage && storage.length > 0;
    return isValidQuotaExceededError;
  }
}
```

### Safe Storage Wrapper

```typescript
function safeSetItem(key: string, value: string): boolean {
  if (!isStorageSupported()) {
    console.warn('localStorage not supported');
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (isQuotaExceededError(err)) {
      console.error('localStorage quota exceeded');
      // Implement cleanup strategy here
    } else {
      console.error('localStorage error:', err);
    }
    return false;
  }
}
```

**Common Errors:**
1. **QuotaExceededError** - Storage limit reached (5-10MB typical)
2. **SecurityError** - Private browsing mode restrictions
3. **DOMException** - localStorage disabled or unavailable

**Source:** [Matteo Mazzarolo - Handling localStorage errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/)

---

## Type Safety

### TypeScript Generic Hook

```typescript
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
}
```

### Type-Safe Storage Keys

```typescript
// Define allowed keys as constants
const STORAGE_KEYS = {
  THEME: 'app-theme',
  USER_PREFS: 'user-preferences',
  CART: 'shopping-cart',
} as const;

type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];

// Type-safe wrapper
class TypeSafeStorage {
  static setItem<T>(key: StorageKey, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  static getItem<T>(key: StorageKey, defaultValue: T): T {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  }
}
```

**Source:** [DEV.to - Consider Type-Safe localStorage](https://dev.to/yutakusuno/ts-consider-type-safe-localstorage-2p9m)

---

## JSON Serialization

### Safe Parsing Pattern

```typescript
function safeJsonParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue;

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

function safeJsonStringify<T>(value: T): string | null {
  try {
    return JSON.stringify(value);
  } catch (error) {
    console.error('JSON stringify error:', error);
    return null;
  }
}
```

### Custom Serializers

```typescript
const dateSerializer = {
  serialize: (date: Date) => date.toISOString(),
  deserialize: (str: string) => new Date(str),
};

function useLocalStorageWithSerializer<T>(
  key: string,
  initialValue: T,
  serializer = {
    serialize: JSON.stringify,
    deserialize: JSON.parse,
  }
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? serializer.deserialize(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, serializer.serialize(value));
    } catch (error) {
      console.error('Serialization error:', error);
    }
  }, [key, value, serializer]);

  return [value, setValue] as const;
}
```

**Best Practices:**
- Always wrap `JSON.parse()` in try-catch
- Validate parsed data structure
- Handle circular references (use specialized libraries if needed)
- Consider data size before stringifying

---

## Cross-Tab Synchronization

### Storage Event Pattern

```typescript
function useLocalStorageWithSync<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(value));

    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('local-storage'));
  }, [key, value]);

  useEffect(() => {
    // Handle storage events from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        setValue(JSON.parse(e.newValue));
      }
    };

    // Handle custom events from same tab
    const handleLocalStorageChange = () => {
      const item = localStorage.getItem(key);
      if (item) {
        setValue(JSON.parse(item));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage', handleLocalStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage', handleLocalStorageChange);
    };
  }, [key]);

  return [value, setValue] as const;
}
```

### BroadcastChannel Alternative

For more robust cross-tab communication:

```typescript
function useBroadcastChannel<T>(channelName: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    channelRef.current = new BroadcastChannel(channelName);

    channelRef.current.onmessage = (event) => {
      setValue(event.data);
    };

    return () => {
      channelRef.current?.close();
    };
  }, [channelName]);

  const broadcast = (newValue: T) => {
    setValue(newValue);
    channelRef.current?.postMessage(newValue);
  };

  return [value, broadcast] as const;
}
```

**Important Notes:**
- `storage` event only fires in OTHER tabs, not the one making the change
- Use custom events (`new Event('local-storage')`) for same-tab updates
- BroadcastChannel API is more efficient for real-time cross-tab communication

**Sources:**
- [Medium - Sync Local Storage across tabs](https://oakhtar147.medium.com/sync-local-storage-state-across-tabs-in-react-using-usesyncexternalstore-613d2c22819e)
- [DEV.to - Syncing React state across tabs](https://dev.to/cassiolacerda/how-to-syncing-react-state-across-multiple-tabs-with-usestate-hook-4bdm)

---

## SSR Considerations

### Next.js Compatible Hook

```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  // Initialize with default value (SSR-safe)
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Load from localStorage after mount (client-side only)
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.error(error);
    }
  }, []); // Run once on mount

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;

      setStoredValue(valueToStore);

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}
```

### Dynamic Import Pattern

For components heavily dependent on localStorage:

```typescript
import dynamic from 'next/dynamic';

const ClientOnlyComponent = dynamic(
  () => import('./ClientOnlyComponent'),
  { ssr: false }
);
```

### Cookie-Based Alternative for SSR

```typescript
import { parseCookies, setCookie } from 'nookies';

function useServerSafeStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      // Server-side: read from cookies
      const cookies = parseCookies();
      return cookies[key] ? JSON.parse(cookies[key]) : initialValue;
    } else {
      // Client-side: read from localStorage
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    }
  });

  const updateValue = (newValue: T) => {
    setValue(newValue);

    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(newValue));
    }

    setCookie(null, key, JSON.stringify(newValue), {
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    });
  };

  return [value, updateValue] as const;
}
```

**Best Practices for SSR:**
1. Always check `typeof window !== 'undefined'` before accessing localStorage
2. Initialize state with default values, load from storage in `useEffect`
3. Use cookies for data needed during SSR
4. Consider using `useSyncExternalStore` with proper server snapshot
5. Avoid hydration mismatches by keeping initial state consistent

**Sources:**
- [Stack Overflow - localStorage with Next.js SSR](https://stackoverflow.com/questions/78554615/how-to-handle-local-storage-with-nextjs-ssr)
- [Medium - useLocalStorage hook for Next.js](https://medium.com/@lean1190/uselocalstorage-hook-for-next-js-typed-and-ssr-friendly-4ddd178676df)

---

## Testing localStorage

### Jest Mock Setup

**Option 1: Using jest-localstorage-mock package**

```bash
npm install --save-dev jest-localstorage-mock
```

```javascript
// jest.config.js
module.exports = {
  setupFiles: ['jest-localstorage-mock'],
  testEnvironment: 'jsdom',
};
```

**Option 2: Manual Mock**

```javascript
// setupTests.js
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

global.localStorage = localStorageMock;
```

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should initialize with default value', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default')
    );

    expect(result.current[0]).toBe('default');
  });

  it('should persist value to localStorage', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );

    act(() => {
      result.current[1]('updated');
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify('updated')
    );
  });

  it('should load persisted value', () => {
    localStorage.getItem.mockReturnValue(JSON.stringify('persisted'));

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default')
    );

    expect(result.current[0]).toBe('persisted');
  });

  it('should handle JSON parse errors', () => {
    localStorage.getItem.mockReturnValue('invalid json');

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'default')
    );

    expect(result.current[0]).toBe('default');
  });
});
```

### Testing with jest.spyOn()

```javascript
describe('localStorage operations', () => {
  let getItemSpy;
  let setItemSpy;

  beforeEach(() => {
    getItemSpy = jest.spyOn(Storage.prototype, 'getItem');
    setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
  });

  afterEach(() => {
    getItemSpy.mockRestore();
    setItemSpy.mockRestore();
  });

  it('should call localStorage.setItem with correct arguments', () => {
    // Your test code
    localStorage.setItem('key', 'value');

    expect(setItemSpy).toHaveBeenCalledWith('key', 'value');
  });
});
```

### Important Testing Notes

- Jest 28+ no longer includes `jest-environment-jsdom` by default
- Add `@jest-environment jsdom` comment at top of test files if needed
- Mock storage events for cross-tab synchronization tests
- Test error handling paths (quota exceeded, parse errors)

**Sources:**
- [Stack Overflow - localStorage in Jest tests](https://stackoverflow.com/questions/32911630/how-do-i-deal-with-localstorage-in-jest-tests)
- [npm - jest-localstorage-mock](https://www.npmjs.com/package/jest-localstorage-mock)

---

## Common Pitfalls

### 1. String-Only Storage

**Problem:**
```javascript
// WRONG - stores "[object Object]"
localStorage.setItem('user', { name: 'John' });
```

**Solution:**
```javascript
// CORRECT
localStorage.setItem('user', JSON.stringify({ name: 'John' }));
const user = JSON.parse(localStorage.getItem('user'));
```

### 2. Not Triggering Re-renders

**Problem:**
```javascript
// WRONG - won't trigger re-render
function Component() {
  const value = localStorage.getItem('key');

  const updateValue = () => {
    localStorage.setItem('key', 'new value');
    // Component won't re-render!
  };
}
```

**Solution:**
```javascript
// CORRECT - use state
function Component() {
  const [value, setValue] = useLocalStorage('key', 'default');

  const updateValue = () => {
    setValue('new value'); // Triggers re-render and updates localStorage
  };
}
```

### 3. SSR/Hydration Mismatches

**Problem:**
```javascript
// WRONG - different values on server vs client
function Component() {
  const [theme] = useState(localStorage.getItem('theme') || 'light');
  return <div>{theme}</div>; // Hydration mismatch!
}
```

**Solution:**
```javascript
// CORRECT - consistent initial state
function Component() {
  const [theme, setTheme] = useState('light'); // Default for SSR

  useEffect(() => {
    setTheme(localStorage.getItem('theme') || 'light');
  }, []);

  return <div>{theme}</div>;
}
```

### 4. Ignoring Storage Limits

**Problem:**
```javascript
// WRONG - might exceed 5-10MB limit
localStorage.setItem('largeData', JSON.stringify(veryLargeArray));
```

**Solution:**
```javascript
// CORRECT - check size and handle errors
function saveLargeData(key: string, data: any): boolean {
  const jsonString = JSON.stringify(data);
  const sizeInBytes = new Blob([jsonString]).size;

  if (sizeInBytes > 4.5 * 1024 * 1024) { // 4.5MB limit
    console.warn('Data too large for localStorage');
    return false;
  }

  try {
    localStorage.setItem(key, jsonString);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      // Implement cleanup or alternative storage
    }
    return false;
  }
}
```

### 5. Same-Tab Synchronization

**Problem:**
```javascript
// WRONG - storage event doesn't fire in same tab
localStorage.setItem('key', 'value');
// Other components in same tab won't know about the change
```

**Solution:**
```javascript
// CORRECT - dispatch custom event for same tab
function setLocalStorageWithEvent(key: string, value: string) {
  localStorage.setItem(key, value);
  window.dispatchEvent(new Event('local-storage')); // Custom event
  window.dispatchEvent(new StorageEvent('storage', { key })); // For consistency
}
```

### 6. Global Namespace Pollution

**Problem:**
```javascript
// WRONG - generic keys might conflict
localStorage.setItem('user', userData);
localStorage.setItem('settings', settings);
```

**Solution:**
```javascript
// CORRECT - use namespaced keys
const APP_PREFIX = 'myapp_';
localStorage.setItem(`${APP_PREFIX}user`, userData);
localStorage.setItem(`${APP_PREFIX}settings`, settings);
```

### 7. Synchronous Performance Issues

**Problem:**
```javascript
// WRONG - blocking operation in render
function Component() {
  const data = JSON.parse(localStorage.getItem('largeData')); // Blocks UI!
  return <div>{data.count}</div>;
}
```

**Solution:**
```javascript
// CORRECT - use lazy initialization or useEffect
function Component() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('largeData');
    if (stored) {
      setData(JSON.parse(stored));
    }
  }, []);

  if (!data) return <div>Loading...</div>;
  return <div>{data.count}</div>;
}
```

**Sources:**
- [LogRocket - localStorage with React hooks](https://blog.logrocket.com/using-localstorage-react-hooks/)
- [Developer Way - Local Storage vs Context](https://www.developerway.com/posts/local-storage-instead-of-context)

---

## Security Concerns

### Critical Security Issues

**1. XSS Vulnerability**
- Any JavaScript on your page can access localStorage
- If an attacker can run JavaScript (via XSS), they can steal all localStorage data
- Particularly dangerous for authentication tokens

**Problem:**
```javascript
// DANGEROUS - vulnerable to XSS attacks
localStorage.setItem('jwt', authToken);
localStorage.setItem('apiKey', sensitiveKey);
```

**Solution:**
```javascript
// BETTER - use httpOnly cookies (not accessible via JavaScript)
// Set on server:
res.cookie('jwt', authToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000
});
```

### What NOT to Store in localStorage

**Never Store:**
- Authentication tokens (JWT, session tokens)
- API keys or secrets
- Personally identifiable information (PII)
- Credit card information
- Social security numbers
- Passwords (even hashed)

**Safe to Store:**
- UI preferences (theme, language)
- Non-sensitive user settings
- Cached public data
- Form draft data (non-sensitive)
- Feature flags
- Analytics/tracking IDs (non-identifying)

### Alternative Storage for Sensitive Data

**1. httpOnly Cookies (Recommended for Auth)**
```javascript
// Server-side only
app.post('/login', (req, res) => {
  const token = generateToken(user);
  res.cookie('auth_token', token, {
    httpOnly: true,    // Not accessible via JavaScript
    secure: true,      // HTTPS only
    sameSite: 'strict', // CSRF protection
    maxAge: 3600000    // 1 hour
  });
});
```

**2. IndexedDB (For Larger Data)**
```javascript
// For non-sensitive, larger datasets
import { openDB } from 'idb';

const db = await openDB('MyDatabase', 1, {
  upgrade(db) {
    db.createObjectStore('data');
  },
});

await db.put('data', value, key);
const data = await db.get('data', key);
```

**3. Session Storage (Tab-Specific)**
```javascript
// Cleared when tab closes
sessionStorage.setItem('tempData', value);
```

### Security Best Practices

```typescript
// 1. Validate data on retrieval
function getSecureItem<T>(key: string, schema: z.ZodType<T>): T | null {
  const item = localStorage.getItem(key);
  if (!item) return null;

  try {
    const parsed = JSON.parse(item);
    return schema.parse(parsed); // Validate with Zod
  } catch {
    localStorage.removeItem(key); // Remove corrupted data
    return null;
  }
}

// 2. Implement data encryption (for non-sensitive data only)
import CryptoJS from 'crypto-js';

function encryptData(data: string, secret: string): string {
  return CryptoJS.AES.encrypt(data, secret).toString();
}

function decryptData(encrypted: string, secret: string): string {
  const bytes = CryptoJS.AES.decrypt(encrypted, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// 3. Clear sensitive data on logout
function handleLogout() {
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();

  // Redirect to login
  window.location.href = '/login';
}

// 4. Implement Content Security Policy
// In your HTML or server headers:
// <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
```

### Privacy Considerations

```javascript
// 1. Respect user privacy settings
if (navigator.doNotTrack === '1') {
  console.log('User has Do Not Track enabled');
  // Don't store tracking data
}

// 2. Provide data export/deletion
function exportUserData(): object {
  const data: Record<string, any> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
}

function deleteAllUserData() {
  if (confirm('Delete all local data?')) {
    localStorage.clear();
  }
}

// 3. Implement data retention policies
const MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function cleanOldData() {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key) continue;

    const item = localStorage.getItem(key);
    if (!item) continue;

    try {
      const { timestamp } = JSON.parse(item);
      if (Date.now() - timestamp > MAX_AGE) {
        localStorage.removeItem(key);
      }
    } catch {
      // Invalid format, skip or remove
    }
  }
}
```

**Key Takeaways:**
- localStorage is NOT secure - anything stored can be read by JavaScript
- Use httpOnly cookies for authentication
- Never store sensitive data in localStorage
- Implement validation and sanitization
- Consider encryption for moderately sensitive data
- Respect user privacy and provide data controls

**Sources:**
- [DEV.to - Please Stop Using Local Storage](https://dev.to/rdegges/please-stop-using-local-storage-1i04)
- [Medium - The Hidden Risk of LocalStorage Tokens](https://medium.com/@dev_aman/the-hidden-risk-of-localstorage-tokens-in-react-how-i-fixed-it-dc6f6dccdde6)

---

## Summary: Best Practices Checklist

### Implementation ✅
- [ ] Use custom hooks (useLocalStorage) for encapsulation
- [ ] Implement lazy initialization with useState
- [ ] Add try-catch blocks for all localStorage operations
- [ ] Use TypeScript generics for type safety
- [ ] Implement proper JSON serialization/deserialization

### Error Handling ✅
- [ ] Check for QuotaExceededError
- [ ] Verify storage availability before use
- [ ] Handle JSON parsing errors gracefully
- [ ] Provide fallback values
- [ ] Log errors for debugging

### Performance ✅
- [ ] Use lazy initialization to avoid unnecessary reads
- [ ] Implement debouncing for frequent updates
- [ ] Consider data size (5-10MB limit)
- [ ] Use useEffect for async-like operations
- [ ] Avoid blocking operations in render

### SSR Compatibility ✅
- [ ] Check `typeof window !== 'undefined'`
- [ ] Initialize state with default values
- [ ] Load from localStorage in useEffect
- [ ] Prevent hydration mismatches
- [ ] Use cookies for SSR-required data

### Cross-Tab Sync ✅
- [ ] Listen to 'storage' events for other tabs
- [ ] Dispatch custom events for same-tab updates
- [ ] Consider BroadcastChannel API for complex scenarios
- [ ] Handle race conditions properly

### Security ✅
- [ ] Never store sensitive data (tokens, passwords)
- [ ] Use httpOnly cookies for authentication
- [ ] Validate and sanitize retrieved data
- [ ] Implement proper logout cleanup
- [ ] Consider data encryption for moderately sensitive data

### Testing ✅
- [ ] Use jest-localstorage-mock or manual mocks
- [ ] Test error scenarios (quota, parsing)
- [ ] Test cross-tab synchronization
- [ ] Use @testing-library/react for hook testing
- [ ] Mock storage events properly

---

## Additional Resources

### Libraries
- [usehooks-ts](https://usehooks-ts.com/react-hook/use-local-storage) - Production-ready hooks
- [idb](https://github.com/jakearchibald/idb) - IndexedDB wrapper
- [zustand](https://github.com/pmndrs/zustand) - State management with persist middleware

### Documentation
- [MDN - Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API)
- [React Docs - useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)
- [MDN - Storage Event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)

### Articles
- [LogRocket - Using localStorage with React Hooks](https://blog.logrocket.com/using-localstorage-react-hooks/)
- [Matteo Mazzarolo - Handling localStorage errors](https://mmazzarolo.com/blog/2022-06-25-local-storage-status/)
- [56kode - useSyncExternalStore with localStorage](https://www.56kode.com/posts/using-usesyncexternalstore-with-localstorage/)

---

*Last Updated: 2024-2025*
*Research compiled from modern React ecosystem best practices*

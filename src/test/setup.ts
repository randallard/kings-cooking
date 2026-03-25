/**
 * @fileoverview Vitest test setup and configuration
 * @module test/setup
 */

import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'

/**
 * Provide a working localStorage/sessionStorage for happy-dom v15+.
 * happy-dom v15 introduced file-backed storage which is incomplete in the vitest
 * environment — replace with a Map-backed in-memory implementation.
 */
function makeStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key(index: number) { return [...store.keys()][index] ?? null; },
    getItem(key: string) { return store.get(key) ?? null; },
    setItem(key: string, value: string) { store.set(key, value); },
    removeItem(key: string) { store.delete(key); },
    clear() { store.clear(); },
  };
}

beforeAll(() => {
  vi.stubGlobal('localStorage', makeStorage());
  vi.stubGlobal('sessionStorage', makeStorage());
  // Suppress noisy happy-dom network errors in tests
  configure({ asyncUtilTimeout: 2000 });
});

/**
 * Cleanup after each test to ensure test isolation.
 * Removes all rendered components from the DOM.
 */
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
})

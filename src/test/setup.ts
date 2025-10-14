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

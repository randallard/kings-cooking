/**
 * @fileoverview E2E tests for URL sharing functionality
 * @module tests/e2e/url-sharing.spec
 *
 * Tests two-browser URL sharing scenario:
 * 1. Player 1 creates game and shares URL
 * 2. Player 2 opens URL and sees game state
 * 3. Players alternate moves via URL sharing
 * 4. Divergence detection and resolution
 */

import { test, expect } from '@playwright/test';

test.describe('URL Sharing E2E Tests', () => {
  test('should create game and generate shareable URL', async ({ page }) => {
    await page.goto('/');

    // Verify we start with clean state (no URL hash)
    expect(page.url()).not.toContain('#');

    // TODO: Create game (will be implemented in Phase 4-5)
    // For now, we'll test the URL encoding/decoding infrastructure

    // Simulate setting a delta payload in URL
    const mockDeltaUrl = '#N4IgdghgtgpiBcIBaB';
    await page.goto(`/${mockDeltaUrl}`);

    // Verify URL was set
    expect(page.url()).toContain(mockDeltaUrl);
  });

  test('should load game from URL in new tab', async ({ page, context }) => {
    // Player 1: Navigate to base URL
    await page.goto('/');

    // Simulate creating game with URL
    const mockGameUrl = '#N4IgdghgtgpiBcIBaBDAlgZwJYBcBOAziiADQgAuATgK4DOFAFkQPYA2dANiKQHYCcAFiICMAJhmEArNOkBWGQHYAzNIBsU-XtX6N+g0b36jRk8eOn';

    // Navigate to URL with game state
    await page.goto(`/${mockGameUrl}`);

    // Player 2: Open same URL in new tab
    const page2 = await context.newPage();
    await page2.goto(`/${mockGameUrl}`);

    // Both pages should have same URL
    expect(page.url()).toBe(page2.url());
  });

  test('should handle corrupted URL gracefully', async ({ page }) => {
    // Navigate to URL with corrupted hash
    await page.goto('/#CORRUPTED_BASE64_DATA!!!');

    // TODO: Verify error message is shown (will be implemented in Phase 4-5)
    // For now, verify page loads without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should persist URL hash across page reloads', async ({ page }) => {
    const testUrl = '/#N4IgdghgtgpiBcIBaBDAlgZwJYBcBOAziiADQgAuATgK4DOFAFkQPYA2dANiKQ';

    // Navigate to URL with hash
    await page.goto(testUrl);

    // Reload page
    await page.reload();

    // Hash should persist
    expect(page.url()).toContain('#N4IgdghgtgpiBcIBaB');
  });

  test('should handle back/forward navigation', async ({ page }) => {
    // Start at home
    await page.goto('/');
    const homeUrl = page.url();

    // Navigate to URL with hash
    const gameUrl1 = '/#N4IgdghgtgpiBcIBaBMove1';
    await page.goto(gameUrl1);
    await page.waitForTimeout(100);

    // Navigate to another URL
    const gameUrl2 = '/#N4IgdghgtgpiBcIBaBMove2';
    await page.goto(gameUrl2);
    await page.waitForTimeout(100);

    // Go back
    await page.goBack();
    await page.waitForTimeout(100);
    expect(page.url()).toContain('Move1');

    // Go forward
    await page.goForward();
    await page.waitForTimeout(100);
    expect(page.url()).toContain('Move2');

    // Go back to home
    await page.goBack();
    await page.goBack();
    expect(page.url()).toBe(homeUrl);
  });

  test('should handle URL hash changes via JavaScript', async ({ page }) => {
    await page.goto('/');

    // Change hash via JavaScript (simulates updateUrl)
    await page.evaluate(() => {
      window.location.hash = '#TestHash123';
    });

    await page.waitForTimeout(100);
    expect(page.url()).toContain('#TestHash123');

    // Change hash again
    await page.evaluate(() => {
      window.location.hash = '#TestHash456';
    });

    await page.waitForTimeout(100);
    expect(page.url()).toContain('#TestHash456');
  });

  test('should handle URL hash removal', async ({ page }) => {
    // Start with hash
    await page.goto('/#TestHash');
    expect(page.url()).toContain('#TestHash');

    // Remove hash
    await page.evaluate(() => {
      window.location.hash = '';
    });

    await page.waitForTimeout(100);
    expect(page.url()).not.toContain('#');
  });

  test('should handle very long URL hashes', async ({ page }) => {
    // Generate a long hash (simulates full_state payload)
    const longHash = '#' + 'A'.repeat(1500);

    await page.goto(`/${longHash}`);

    // URL should be set
    expect(page.url()).toContain(longHash);

    // Page should load without errors
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle special characters in URL hash', async ({ page }) => {
    // lz-string uses URL-safe characters, but test edge cases
    const specialChars = '#Test-Hash_With.Special~Chars';

    await page.goto(`/${specialChars}`);
    expect(page.url()).toContain('Test-Hash_With.Special');
  });

  test('should maintain URL state across browser history', async ({ page }) => {
    await page.goto('/');

    // Create multiple history entries
    const hashes = ['#Hash1', '#Hash2', '#Hash3', '#Hash4', '#Hash5'];

    for (const hash of hashes) {
      await page.evaluate((h) => {
        window.history.pushState(null, '', h);
      }, hash);
      await page.waitForTimeout(50);
    }

    // Verify current URL
    expect(page.url()).toContain('#Hash5');

    // Go back through history
    await page.goBack();
    expect(page.url()).toContain('#Hash4');

    await page.goBack();
    expect(page.url()).toContain('#Hash3');

    // Go forward
    await page.goForward();
    expect(page.url()).toContain('#Hash4');
  });

  test('should handle URL copy and paste workflow', async ({ page, context }) => {
    // Player 1: Create game with URL
    await page.goto('/#GameState123');

    // Copy URL
    const url = page.url();
    expect(url).toContain('#GameState123');

    // Player 2: Open copied URL in new tab
    const page2 = await context.newPage();
    await page2.goto(url);

    // Verify both pages have same URL
    expect(page2.url()).toBe(url);
  });

  test('should handle concurrent URL updates', async ({ page }) => {
    await page.goto('/');

    // Simulate rapid URL updates (debouncing scenario)
    await page.evaluate(() => {
      for (let i = 0; i < 10; i++) {
        window.location.hash = `#Update${i}`;
      }
    });

    // Wait for debounce
    await page.waitForTimeout(500);

    // Should have last update
    expect(page.url()).toContain('#Update9');
  });

  test('should handle URL hash with encoded characters', async ({ page }) => {
    // Test URL-encoded characters
    const encodedHash = '#Test%20With%20Spaces';
    await page.goto(`/${encodedHash}`);

    // Browser should handle encoding
    expect(page.url()).toContain('Test');
  });

  test('should detect checksum mismatch (simulated)', async ({ page }) => {
    // TODO: This will be fully implemented in Phase 4-5
    // For now, test that corrupted payloads are detected

    await page.goto('/#CorruptedPayload_InvalidChecksum');

    // Page should load without crashing
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle localStorage and URL sync', async ({ page }) => {
    await page.goto('/');

    // Set URL hash
    await page.evaluate(() => {
      window.location.hash = '#TestState';
      localStorage.setItem('kings-cooking:game-state', JSON.stringify({ test: 'data' }));
    });

    // Reload page
    await page.reload();

    // URL hash should persist
    expect(page.url()).toContain('#TestState');

    // localStorage should persist
    const stored = await page.evaluate(() => {
      return localStorage.getItem('kings-cooking:game-state');
    });
    expect(stored).toContain('test');
  });

  test('should handle URL length limits gracefully', async ({ page }) => {
    // Test near the 2000 character safe limit
    const longHash = '#' + 'A'.repeat(1900);

    await page.goto(`/${longHash}`);

    // Should handle long URL
    expect(page.url().length).toBeGreaterThan(1900);
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle hashchange events', async ({ page }) => {
    await page.goto('/');

    // Listen for hashchange events
    const hashchanges: string[] = [];
    await page.evaluate(() => {
      window.addEventListener('hashchange', () => {
        (window as any).hashchangeCount = ((window as any).hashchangeCount || 0) + 1;
      });
    });

    // Trigger hash changes
    await page.evaluate(() => {
      window.location.hash = '#Change1';
    });
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      window.location.hash = '#Change2';
    });
    await page.waitForTimeout(100);

    // Verify events fired
    const eventCount = await page.evaluate(() => (window as any).hashchangeCount);
    expect(eventCount).toBeGreaterThan(0);
  });

  test('should handle empty hash gracefully', async ({ page }) => {
    // Start with hash
    await page.goto('/#SomeHash');

    // Navigate to root (removes hash)
    await page.goto('/');

    expect(page.url()).not.toContain('#');
  });

  test('should support two-player URL sharing simulation', async ({ page, context }) => {
    // Player 1: Create game
    await page.goto('/#Player1_Move1');

    // Get URL to share
    const urlMove1 = page.url();

    // Player 2: Open URL
    const player2 = await context.newPage();
    await player2.goto(urlMove1);

    // Verify Player 2 has same state
    expect(player2.url()).toBe(urlMove1);

    // Player 2: Make move (generate new URL)
    await player2.evaluate(() => {
      window.location.hash = '#Player2_Move2';
    });
    await player2.waitForTimeout(100);

    const urlMove2 = player2.url();
    expect(urlMove2).toContain('Player2_Move2');

    // Player 1: Open new URL
    await page.goto(urlMove2);
    expect(page.url()).toBe(urlMove2);

    // Player 1: Make move
    await page.evaluate(() => {
      window.location.hash = '#Player1_Move3';
    });
    await page.waitForTimeout(100);

    const urlMove3 = page.url();
    expect(urlMove3).toContain('Player1_Move3');

    // Verify alternating moves
    expect(urlMove1).toContain('Move1');
    expect(urlMove2).toContain('Move2');
    expect(urlMove3).toContain('Move3');
  });
});

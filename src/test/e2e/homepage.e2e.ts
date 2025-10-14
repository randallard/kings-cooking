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

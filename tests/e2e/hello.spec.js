import { test, expect } from '@playwright/test';

test('displays Hello, World! on the page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Hello, World!');
});

import { expect, test } from '@playwright/test';

test.describe('layout regression checks', () => {
  test('home page renders localized cards without markdown leakage', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.locator('h1.intro-title')).toBeVisible();

    const firstCard = page.locator('.post-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('.post-card-desc')).not.toContainText(/`|>\s*-/);
  });

  test('posts pagination keeps enhanced button styling', async ({ page }) => {
    await page.goto('/posts/');

    const pagination = page.locator('.pagination');
    await expect(pagination).toBeVisible();

    const activeButton = page.locator('.page-btn--active').first();
    await expect(activeButton).toBeVisible();
    await expect(activeButton).toHaveCSS('border-radius', /.+/);
  });

  test('article breadcrumb uses arrow separators and pill styling', async ({ page }) => {
    await page.goto('/posts/cloudflare-tunnels-npm-cdn-guide/');

    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toBeVisible();
    await expect(page.locator('.breadcrumb-sep').first()).toHaveText('>');

    const firstLink = page.locator('.breadcrumb-link').first();
    await expect(firstLink).toBeVisible();
    await expect(firstLink).toHaveCSS('border-radius', /.+/);
    await expect(firstLink).not.toHaveText(/\//);
  });
});

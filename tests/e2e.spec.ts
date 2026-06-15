import { expect, test } from '@playwright/test';

test.describe('layout regression checks', () => {
  test('home page renders localized cards without markdown leakage', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1.intro-title')).toBeVisible();

    const firstCard = page.locator('.post-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('.post-card-desc')).not.toContainText(/`|>\s*-/);
  });

  test('traditional chinese locale remains available under zh-tw', async ({ page }) => {
    await page.goto('/zh-tw/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.locator('h1.intro-title')).toBeVisible();
    await expect(page.locator('.post-card').first()).toBeVisible();
  });

  test('posts pagination keeps enhanced button styling', async ({ page }) => {
    await page.goto('/posts/');

    const pagination = page.locator('.pagination');
    if ((await pagination.count()) > 0) {
      await expect(pagination).toBeVisible();

      const activeButton = page.locator('.page-btn--active').first();
      await expect(activeButton).toBeVisible();
      await expect(activeButton).toHaveCSS('border-radius', /.+/);
    } else {
      await expect(page.locator('.post-card').first()).toBeVisible();
    }
  });

  test('article breadcrumb uses arrow separators and pill styling', async ({ page }) => {
    await page.goto('/posts/');
    const firstPostLink = page.locator('.post-card a').first();
    const href = await firstPostLink.getAttribute('href');
    expect(href).toBeTruthy();

    await page.goto(href!);

    const breadcrumbs = page.locator('.breadcrumbs');
    await expect(breadcrumbs).toBeVisible();
    await expect(page.locator('.breadcrumb-sep').first()).toHaveText('>');

    const firstLink = page.locator('.breadcrumb-link').first();
    await expect(firstLink).toBeVisible();
    await expect(firstLink).toHaveCSS('border-radius', /.+/);
    await expect(firstLink).not.toHaveText(/\//);
  });

  test('navbar language and mobile controls stay interactive after initialization', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({
          hasSetCookies: true,
          rememberTimezone: false,
          enableAnalytics: false,
        })
      );
    });

    await page.goto('/');

    await page.locator('#lang-trigger-btn').click();
    await expect(page.locator('#lang-dropdown')).toHaveClass(/is-open/);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#mobile-toggle').click();
    await expect(page.locator('#mobile-menu')).toHaveClass(/is-open/);
    await expect(page.locator('#mobile-toggle')).toHaveAttribute('aria-expanded', 'true');
  });

  test('first-visit cookie save closes panel without navigation on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.removeItem('bb-privacy-v1');
    });

    await page.goto('/');
    await expect(page.locator('#site-prefs-layer')).toHaveClass(/is-visible/);

    const urlBefore = page.url();
    await page.locator('#site-prefs-save').click();

    await expect(page).toHaveURL(urlBefore);
    await expect(page.locator('#site-prefs-layer')).not.toHaveClass(/is-visible/);
    await expect(page.locator('#site-prefs-layer')).toHaveAttribute('aria-hidden', 'true');

    const settings = await page.evaluate(() => localStorage.getItem('bb-privacy-v1'));
    expect(settings).toContain('"hasSetCookies":true');
  });

  test('footer settings trigger opens the site preferences layer', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({
          hasSetCookies: true,
          rememberTimezone: false,
          enableAnalytics: false,
        })
      );
    });

    await page.goto('/');
    await page.locator('#footer-prefs-trigger').click();
    await expect(page.locator('#site-prefs-layer')).toHaveClass(/is-visible/);
    await expect(page.locator('#site-prefs-layer')).toHaveAttribute('aria-hidden', 'false');
  });

  test('mobile bookmark panel does not trap page scrolling at the bottom', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({
          hasSetCookies: true,
          rememberTimezone: false,
          enableAnalytics: false,
        })
      );
    });

    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));

    const before = await page.evaluate(() => window.scrollY);
    const panel = page.locator('.bookmark-panel');
    const box = await panel.boundingBox();
    expect(box).toBeTruthy();

    await page.mouse.move(box!.x + box!.width / 2, box!.y + Math.min(box!.height / 2, box!.height - 24));
    await page.mouse.wheel(0, -520);

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
      .toBeLessThan(before - 80);
  });
});

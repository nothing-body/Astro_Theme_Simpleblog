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

  test('hover feedback stays sharp on posts, categories, and tags', async ({ page }) => {
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
    await page.goto('/posts/');

    const postCard = page.locator('.post-card').first();
    const categoryLink = page.locator('.category-tree-link').first();
    const tagLink = page.locator('.tag-box').first();

    for (const target of [postCard, categoryLink, tagLink]) {
      await expect(target).toBeVisible();
      await target.hover();
      await expect(target).toHaveCSS('transform', 'none');
    }

    await postCard.hover();
    await expect(postCard).toHaveCSS('border-color', 'rgb(184, 90, 68)');
    await expect(postCard).toHaveCSS('outline-width', '3px');
    await expect(postCard).toHaveCSS('filter', 'none');
    await expect(postCard).toHaveCSS('backdrop-filter', 'none');
  });

  test('traditional chinese locale remains available under zh-tw', async ({ page }) => {
    await page.goto('/zh-tw/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    await expect(page.locator('h1.intro-title')).toBeVisible();
    await expect(page.locator('.post-card').first()).toBeVisible();
  });

  test('posts list keeps locale when switching language', async ({ page }) => {
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

    await page.goto('/posts/');
    await page.locator('#lang-trigger-btn').click();
    await page.locator('.lang-option', { hasText: '繁體中文' }).click();
    await expect(page).toHaveURL(/\/zh-tw\/posts\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
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

  test('article language switch stays on the translated article', async ({ page }) => {
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
    await page.goto('/posts/');
    const articlePath = await page.locator('.post-card a').first().getAttribute('href');
    expect(articlePath).toMatch(/^\/posts\/[^/]+\/?$/);
    await page.goto(articlePath!);
    await page.locator('#lang-trigger-btn').click();

    const traditionalChinese = page.locator('.lang-option[hreflang="zh-TW"]');
    const expectedPath = `/zh-tw${articlePath}`.replace(/\/$/, '');
    await expect(traditionalChinese).toHaveAttribute('href', expectedPath);
    await traditionalChinese.click();
    await expect.poll(() => new URL(page.url()).pathname.replace(/\/$/, '')).toBe(expectedPath);
  });

  test('localized category alternates exist and the page has one main landmark', async ({
    page,
    request,
  }) => {
    await page.goto('/posts/');
    const categoryPath = await page.locator('.category-tree-link').first().getAttribute('href');
    expect(categoryPath).toMatch(/^\/categories\/.+\/1\/?$/);
    await page.goto(categoryPath!);

    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
    const zhTwHref = await page
      .locator('link[rel="alternate"][hreflang="zh-TW"]')
      .getAttribute('href');
    expect(zhTwHref).toBeTruthy();
    expect(decodeURIComponent(zhTwHref!)).toContain('/zh-tw/categories/');
    expect((await request.get(new URL(zhTwHref!).pathname)).ok()).toBe(true);
  });

  test('stored privacy strings cannot enable analytics or timezone persistence', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({
          hasSetCookies: 'true',
          rememberTimezone: 'true',
          enableAnalytics: 'false',
        })
      );
    });

    await page.goto('/');
    const settings = await page.evaluate(() => window.__privacySettings);
    expect(settings).toEqual({
      hasSetCookies: false,
      rememberTimezone: false,
      enableAnalytics: false,
    });
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

  test('core layouts do not create page-level horizontal overflow', async ({ page }) => {
    await page.goto('/posts/');
    const categoryPath = await page.locator('.category-tree-link').first().getAttribute('href');
    const articlePath = await page.locator('.post-card a').first().getAttribute('href');
    expect(categoryPath).toBeTruthy();
    expect(articlePath).toBeTruthy();
    const paths = ['/', '/posts/', categoryPath!, articlePath!];
    for (const viewport of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) {
      await page.setViewportSize(viewport);
      for (const path of paths) {
        await page.goto(path);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth
        );
        expect(overflow, `${path} overflow at ${viewport.width}px`).toBeLessThanOrEqual(1);
      }
    }
  });

  test('constrained devices disable expensive visual effects', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 2 });
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({ hasSetCookies: true, rememberTimezone: false, enableAnalytics: false })
      );
    });
    await page.goto('/');
    await expect(page.locator('html')).toHaveClass(/is-low-power-device/);
    await expect(page.locator('#navbar')).toHaveCSS('backdrop-filter', 'none');
  });

  test('privacy dialog keeps keyboard focus inside the modal', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({ hasSetCookies: true, rememberTimezone: false, enableAnalytics: false })
      );
    });
    await page.goto('/');
    await page.locator('#footer-prefs-trigger').click();
    await page.locator('#site-prefs-close').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('.site-prefs-link')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('#site-prefs-close')).toBeFocused();
  });

  test('external notice rejects URLs containing credentials', async ({ page }) => {
    await page.goto('/leaving/?to=https%3A%2F%2Fuser%3Asecret%40example.com%2F');
    await expect(page.locator('#leaving-continue')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.locator('#leaving-warning')).toBeVisible();
    await expect(page.locator('#leaving-url')).toBeEmpty();
  });
});

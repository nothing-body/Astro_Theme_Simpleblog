import { expect, test } from '@playwright/test';

test.describe('layout regression checks', () => {
  test('localized Pagefind search stays internal and renders untrusted queries as text', async ({
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
    const searchLink = page.locator('.nav-search');
    const languageSwitcher = page.locator('.lang-switcher');
    await expect(searchLink).toHaveText('🔍');

    const searchBox = await searchLink.boundingBox();
    const languageBox = await languageSwitcher.boundingBox();
    expect(searchBox).not.toBeNull();
    expect(languageBox).not.toBeNull();
    expect(searchBox?.x ?? 0).toBeLessThan(languageBox?.x ?? 0);

    await searchLink.click();
    await expect(page).toHaveURL(/\/search\/?$/);
    const input = page.locator('[data-search-input]');
    await input.fill('Astro');
    const firstResult = page.locator('.search-result-title').first();
    await expect(firstResult).toBeVisible();
    await expect(firstResult).toHaveAttribute('href', /^\/posts\//);
    await expect(page.locator('[data-search-category]')).toBeEnabled();
    const categoryValues = await page
      .locator('[data-search-category] option')
      .evaluateAll(options => options.map(option => (option as HTMLOptionElement).value));
    expect(new Set(categoryValues).size).toBe(categoryValues.length);

    await input.fill('<img id="search-injection" src="x">');
    await expect(page.locator('[data-search-results] #search-injection')).toHaveCount(0);

    await page.goto('/zh-tw/search/?q=Astro');
    await expect(page.locator('.search-result-title').first()).toHaveAttribute(
      'href',
      /^\/zh-tw\/posts\//
    );
  });

  test('home page renders localized cards without markdown leakage', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1.intro-title')).toBeVisible();

    const firstCard = page.locator('.post-card').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard.locator('.post-card-desc')).not.toContainText(/`|>\s*-/);
  });

  test('public external links use the API-free localized leaving notice', async ({ page }) => {
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
    const apiRequests: string[] = [];
    page.on('request', request => {
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });

    await page.goto('/');
    const noticeHref = await page.locator('.bookmark-link').first().getAttribute('href');
    expect(noticeHref).toMatch(/^\/leaving#to=/);

    await page.goto(noticeHref!);
    await expect(page.locator('#leaving-host')).toHaveText('github.com');
    await expect(page.locator('#leaving-continue')).toHaveAttribute('href', 'https://github.com/');
    await expect(page.locator('#leaving-continue')).not.toHaveAttribute('aria-disabled');

    await page.locator('#lang-trigger-btn').click();
    await page.locator('.lang-option[hreflang="zh-TW"]').click();
    await expect(page).toHaveURL(/\/zh-tw\/leaving#to=/);
    await expect(page.locator('#leaving-host')).toHaveText('github.com');
    expect(apiRequests).toEqual([]);
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

  test('posts pagination keeps locale when switching language on page 2', async ({
    page,
    request,
  }) => {
    const pageTwoResponse = await request.get('/page/2/');
    test.skip(!pageTwoResponse.ok(), 'The current content set does not require a second page.');

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

    await page.goto('/page/2');
    await page.locator('#lang-trigger-btn').click();
    await page.locator('.lang-option', { hasText: '繁體中文' }).click();
    await expect(page).toHaveURL(/\/zh-tw\/page\/2\/?$/);
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');

    const pageThree = page.locator('.pagination .page-btn', { hasText: '3' }).first();
    if ((await pageThree.count()) > 0) {
      await pageThree.click();
      await expect(page).toHaveURL(/\/zh-tw\/page\/3\/?$/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
    }
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

  test('article language switch stays on the translated article', async ({ page, request }) => {
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
    const articleHref = await page
      .locator('.post-card a[href^="/posts/"]')
      .first()
      .getAttribute('href');
    expect(articleHref).toBeTruthy();
    await page.goto(articleHref!);
    await page.locator('#lang-trigger-btn').click();

    const traditionalChinese = page.locator('.lang-option[hreflang="zh-TW"]');
    const translatedHref = await traditionalChinese.getAttribute('href');
    expect(translatedHref).toBeTruthy();
    expect(translatedHref).toContain('/zh-tw/posts/');
    expect(translatedHref).not.toContain('/404');
    expect((await request.get(translatedHref!)).ok()).toBe(true);
    await traditionalChinese.click();
    await expect
      .poll(() => new URL(page.url()).pathname.replace(/\/$/, ''))
      .toBe(translatedHref!.replace(/\/$/, ''));
  });

  test('localized category alternates exist and the page has one main landmark', async ({
    page,
    request,
  }) => {
    await page.goto('/posts/');
    const categoryHref = await page.locator('a[href^="/categories/"]').first().getAttribute('href');
    expect(categoryHref).toBeTruthy();
    await page.goto(categoryHref!);

    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
    const zhTwHref = await page
      .locator('link[rel="alternate"][hreflang="zh-TW"]')
      .getAttribute('href');
    expect(zhTwHref).toBeTruthy();
    expect(decodeURIComponent(zhTwHref!)).toContain('/zh-tw/categories/');
    expect((await request.get(new URL(zhTwHref!).pathname)).ok()).toBe(true);
  });

  test('stored privacy strings cannot enable analytics or timezone persistence', async ({
    page,
  }) => {
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
    await expect(page.locator('script[src*="googletagmanager.com/gtag/js"]')).toHaveCount(0);
  });

  test('consented GA4 runs through Partytown', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({
          hasSetCookies: true,
          rememberTimezone: false,
          enableAnalytics: true,
        })
      );
    });

    await page.goto('/');
    const ga4Meta = page.locator('meta[name="bb-ga4-id"]');
    const ga4Id = (await ga4Meta.count()) > 0 ? await ga4Meta.getAttribute('content') : null;
    test.skip(!ga4Id || /^G-XXXX/i.test(ga4Id), 'The test build has no GA4 measurement ID.');

    const analyticsScript = page.locator('script[src*="googletagmanager.com/gtag/js"]');
    await expect(analyticsScript).toHaveCount(1);
    await expect
      .poll(() => analyticsScript.getAttribute('type'))
      .toMatch(/^text\/partytown(?:-x)?$/);

    const forwarded = await page.evaluate(() => window.partytown?.forward ?? []);
    expect(JSON.stringify(forwarded)).toContain('dataLayer.push');
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

    await page.mouse.move(
      box!.x + box!.width / 2,
      box!.y + Math.min(box!.height / 2, box!.height - 24)
    );
    await page.mouse.wheel(0, -520);

    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 2000 })
      .toBeLessThan(before - 80);
  });

  test('core layouts do not create page-level horizontal overflow', async ({ page }) => {
    const paths = [
      '/',
      '/posts/',
      '/categories/Network-and-Security/1/',
      '/posts/ai-api-relay-security-risks/',
    ];
    for (const viewport of [
      { width: 360, height: 740 },
      { width: 1280, height: 800 },
    ]) {
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

  test('localized 404 routes with trailing slashes do not redirect in a loop', async ({ page }) => {
    await page.goto('/zh-tw/404/');
    await expect(page).toHaveURL(/\/zh-tw\/404\/?$/);
    await expect(page.locator('h1')).toHaveText('找不到頁面');

    await page.goto('/zh-cn/404/');
    await expect(page).toHaveURL(/\/zh-cn\/404\/?$/);
    await expect(page.locator('h1')).toHaveText('找不到页面');
  });

  test('analytics blockers cannot break navigation, content, or search', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', error => pageErrors.push(error.message));
    await page.route(
      /(?:google-analytics|googletagmanager|cloudflareinsights|\/cdn-cgi\/rum)/,
      route => route.abort('blockedbyclient')
    );
    await page.addInitScript(() => {
      localStorage.setItem(
        'bb-privacy-v1',
        JSON.stringify({ hasSetCookies: true, rememberTimezone: false, enableAnalytics: true })
      );
    });

    await page.goto('/');
    await expect(page.locator('h1.intro-title')).toBeVisible();
    const indexedTitle = await page.locator('.post-card-title').first().innerText();
    await page.locator('.nav-search').click();
    await page.waitForLoadState('networkidle');
    await page.locator('[data-search-input]').focus();
    await page.locator('[data-search-input]').fill(indexedTitle);
    await expect(page.locator('.search-result-title').first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});

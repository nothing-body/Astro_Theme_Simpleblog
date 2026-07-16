import type { PrivacySettings } from '../types';
import { initAnalytics, loadAnalyticsIfConsented } from './analytics';
import { bootstrapPrivacySettings, clearSavedTimezone } from './privacy';

function markLowPowerDevice(): void {
  const device = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string; saveData?: boolean };
  };
  const constrainedNetwork = ['slow-2g', '2g'].includes(device.connection?.effectiveType ?? '');
  const lowPower =
    (typeof device.hardwareConcurrency === 'number' && device.hardwareConcurrency <= 2) ||
    (typeof device.deviceMemory === 'number' && device.deviceMemory <= 2) ||
    device.connection?.saveData === true ||
    constrainedNetwork;
  document.documentElement.classList.toggle('is-low-power-device', lowPower);
}

function initBackToTop(): void {
  const button = document.querySelector<HTMLButtonElement>('#back-to-top-btn');
  if (!button) return;

  let ticking = false;
  const update = () => {
    button.classList.toggle('is-visible', window.scrollY > 320);
    ticking = false;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(update);
  };

  button.addEventListener('click', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  update();
}

function initNavbar(): void {
  const navbar = document.querySelector<HTMLElement>('#navbar');
  const mobileToggle = document.querySelector<HTMLButtonElement>('#mobile-toggle');
  const mobileMenu = document.querySelector<HTMLElement>('#mobile-menu');
  const langTrigger = document.querySelector<HTMLButtonElement>('#lang-trigger-btn');
  const langDropdown = document.querySelector<HTMLElement>('#lang-dropdown');
  let lastScrollY = 0;
  let framePending = false;

  const closeMobileMenu = () => {
    mobileMenu?.classList.remove('is-open');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    mobileToggle?.classList.remove('is-open');
    mobileToggle?.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('is-mobile-menu-open');
  };
  const openMobileMenu = () => {
    mobileMenu?.classList.add('is-open');
    mobileMenu?.setAttribute('aria-hidden', 'false');
    mobileToggle?.classList.add('is-open');
    mobileToggle?.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('is-mobile-menu-open');
  };
  const closeLanguageMenu = () => {
    langDropdown?.classList.remove('is-open');
    langDropdown?.setAttribute('aria-hidden', 'true');
    langTrigger?.setAttribute('aria-expanded', 'false');
  };
  const onScroll = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      const scrollY = Math.max(window.scrollY, 0);
      navbar?.classList.toggle('nav-header--scrolled', scrollY > 10);
      navbar?.classList.toggle(
        'nav-header--hidden',
        Boolean(
          mobileMenu &&
          !mobileMenu.classList.contains('is-open') &&
          scrollY > lastScrollY &&
          scrollY > 80
        )
      );
      lastScrollY = scrollY;
      framePending = false;
    });
  };

  mobileToggle?.addEventListener('click', () => {
    if (mobileMenu?.classList.contains('is-open')) closeMobileMenu();
    else openMobileMenu();
  });
  mobileMenu?.addEventListener('click', event => {
    if (event.target instanceof HTMLAnchorElement) closeMobileMenu();
  });
  langTrigger?.addEventListener('click', event => {
    event.stopPropagation();
    const isOpen = langDropdown?.classList.toggle('is-open') ?? false;
    langDropdown?.setAttribute('aria-hidden', String(!isOpen));
    langTrigger.setAttribute('aria-expanded', String(isOpen));
  });
  document.addEventListener('click', closeLanguageMenu);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function focusWithoutScroll(element: HTMLElement | null): void {
  if (!element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function initPrivacyPanel(): void {
  const panel = document.querySelector<HTMLElement>('#site-prefs-layer');
  if (!panel) return;
  const timezone = document.querySelector<HTMLInputElement>('#pref-remember-tz');
  const analytics = document.querySelector<HTMLInputElement>('#pref-enable-stats');
  const save = document.querySelector<HTMLButtonElement>('#site-prefs-save');
  const close = document.querySelector<HTMLButtonElement>('#site-prefs-close');
  let returnFocus: HTMLElement | null = null;

  const settings = (): PrivacySettings =>
    window.__privacySettings ?? {
      hasSetCookies: false,
      rememberTimezone: false,
      enableAnalytics: false,
    };
  const sync = () => {
    const current = settings();
    if (timezone) timezone.checked = current.hasSetCookies && current.rememberTimezone;
    if (analytics) analytics.checked = current.hasSetCookies && current.enableAnalytics;
  };
  const openPanel = (trigger?: HTMLElement | null) => {
    returnFocus =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    sync();
    panel.hidden = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-visible');
    document.documentElement.classList.add('is-prefs-open');
    focusWithoutScroll(save);
  };
  const closePanel = () => {
    panel.setAttribute('aria-hidden', 'true');
    panel.classList.remove('is-visible');
    panel.hidden = true;
    document.documentElement.classList.remove('is-prefs-open');
    focusWithoutScroll(returnFocus);
    returnFocus = null;
  };

  document.addEventListener('open-site-prefs', event => {
    const triggerId = (event as CustomEvent<{ triggerId?: string }>).detail?.triggerId;
    openPanel(triggerId ? document.getElementById(triggerId) : null);
  });
  panel.addEventListener('click', event => {
    if (event.target === panel) closePanel();
  });
  close?.addEventListener('click', closePanel);
  save?.addEventListener('click', () => {
    window.updatePrivacySettings?.({
      hasSetCookies: true,
      rememberTimezone: timezone?.checked === true,
      enableAnalytics: analytics?.checked === true,
    });
    if (timezone?.checked !== true) clearSavedTimezone();
    loadAnalyticsIfConsented();
    closePanel();
  });
  document.addEventListener('keydown', event => {
    if (!panel.classList.contains('is-visible')) return;
    if (event.key === 'Escape') {
      closePanel();
      return;
    }
    if (event.key !== 'Tab') return;
    const focusable = [...panel.querySelectorAll<HTMLElement>('a[href], button, input')].filter(
      element => !element.hasAttribute('disabled') && !element.hidden
    );
    const first = focusable.at(0);
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (!settings().hasSetCookies) window.requestAnimationFrame(() => openPanel(null));
}

function initFooterPreferences(): void {
  document
    .querySelector<HTMLButtonElement>('#footer-prefs-trigger')
    ?.addEventListener('click', event => {
      const trigger = event.currentTarget;
      if (!(trigger instanceof HTMLButtonElement)) return;
      document.dispatchEvent(
        new CustomEvent('open-site-prefs', { detail: { triggerId: trigger.id } })
      );
    });
}

markLowPowerDevice();
bootstrapPrivacySettings();
initAnalytics();
initNavbar();
initBackToTop();
initPrivacyPanel();
initFooterPreferences();

import type { PrivacySettings } from '../types';

const GA4_PATTERN = /^G-[A-Z0-9]+$/i;
let loaded = false;

function getGa4Id(): string | null {
  const value = document.querySelector<HTMLMetaElement>('meta[name="bb-ga4-id"]')?.content.trim();
  return value && GA4_PATTERN.test(value) && !value.toUpperCase().startsWith('G-XXXX')
    ? value
    : null;
}

export function loadAnalyticsIfConsented(): void {
  if (loaded || window.__privacySettings?.enableAnalytics !== true) return;
  const ga4Id = getGa4Id();
  if (!ga4Id) return;

  loaded = true;
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`;
  script.async = true;
  script.referrerPolicy = 'strict-origin-when-cross-origin';
  document.head.append(script);

  window.dataLayer ??= [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', ga4Id, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

export function initAnalytics(): void {
  window.__loadGa4IfConsented = loadAnalyticsIfConsented;
  loadAnalyticsIfConsented();
  document.addEventListener('privacy-settings-updated', event => {
    const next = (event as CustomEvent<PrivacySettings>).detail;
    if (loaded && next?.enableAnalytics !== true) {
      window.location.reload();
      return;
    }
    loadAnalyticsIfConsented();
  });
}

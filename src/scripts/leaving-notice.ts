import { normalizeExternalHttpUrl } from '../lib/external-links';

const root = document.querySelector<HTMLElement>('[data-leaving-notice]');

if (root) {
  const rawTarget = new URLSearchParams(window.location.hash.slice(1)).get('to') ?? '';
  const host = document.querySelector<HTMLElement>('#leaving-host');
  const url = document.querySelector<HTMLElement>('#leaving-url');
  const warning = document.querySelector<HTMLElement>('#leaving-warning');
  const continueLink = document.querySelector<HTMLAnchorElement>('#leaving-continue');
  const invalidText = root.dataset.invalidText || 'Invalid or missing destination';
  const backHref = root.dataset.backHref || '/';

  const fail = () => {
    if (host) host.textContent = invalidText;
    if (url) url.textContent = '';
    if (warning) warning.hidden = false;
    if (continueLink) {
      continueLink.href = backHref;
      continueLink.setAttribute('aria-disabled', 'true');
    }
  };

  try {
    const target = normalizeExternalHttpUrl(rawTarget);
    if (target.origin === window.location.origin) {
      fail();
    } else {
      if (host) host.textContent = target.hostname;
      if (url) url.textContent = target.href;
      if (continueLink) {
        continueLink.href = target.href;
        continueLink.removeAttribute('aria-disabled');
      }
    }
  } catch {
    fail();
  }

  if (window.location.hash) {
    document
      .querySelectorAll<HTMLAnchorElement>('a[data-preserve-fragment="true"]')
      .forEach(link => {
        const target = new URL(link.href);
        target.hash = window.location.hash;
        link.href = target.href;
      });
  }
}

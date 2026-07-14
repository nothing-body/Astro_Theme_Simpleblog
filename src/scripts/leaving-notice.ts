const root = document.querySelector<HTMLElement>('[data-leaving-notice]');

if (root) {
  const rawTarget = new URLSearchParams(window.location.search).get('to') ?? '';
  const host = document.querySelector<HTMLElement>('#leaving-host');
  const url = document.querySelector<HTMLElement>('#leaving-url');
  const warning = document.querySelector<HTMLElement>('#leaving-warning');
  const continueLink = document.querySelector<HTMLAnchorElement>('#leaving-continue');
  const invalidText = root.dataset.invalidText || 'Invalid or missing link';
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
    const target = new URL(rawTarget);
    if (
      !['http:', 'https:'].includes(target.protocol) ||
      target.origin === window.location.origin ||
      target.username ||
      target.password
    ) {
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
}

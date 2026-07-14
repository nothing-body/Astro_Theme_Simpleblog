const target = document.querySelector<HTMLElement>('[data-no-category]')?.dataset.redirect;
if (target) {
  try {
    const redirectUrl = new URL(target, window.location.origin);
    if (redirectUrl.origin === window.location.origin) {
      window.setTimeout(() => window.location.assign(redirectUrl.href), 3000);
    }
  } catch {
    // Keep the manual server-rendered link when the configured target is invalid.
  }
}

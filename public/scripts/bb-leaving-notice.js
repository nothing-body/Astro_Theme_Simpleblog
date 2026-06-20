(function () {
  function initLeavingNotice() {
    var root = document.querySelector('[data-leaving-notice]');
    if (!root) return;

    var params = new URLSearchParams(window.location.search);
    var rawTarget = params.get('to') || '';
    var hostEl = document.getElementById('leaving-host');
    var urlEl = document.getElementById('leaving-url');
    var warningEl = document.getElementById('leaving-warning');
    var continueLink = document.getElementById('leaving-continue');
    var invalidText = root.getAttribute('data-invalid-text') || 'Invalid or missing link';
    var backHref = root.getAttribute('data-back-href') || '/';

    function fail() {
      if (hostEl) hostEl.textContent = invalidText;
      if (urlEl) urlEl.textContent = '';
      if (warningEl) warningEl.hidden = false;
      if (continueLink) {
        continueLink.setAttribute('href', backHref);
        continueLink.setAttribute('aria-disabled', 'true');
      }
    }

    try {
      var target = new URL(rawTarget);
      var allowedProtocol = target.protocol === 'http:' || target.protocol === 'https:';
      var isCurrentSite = target.origin === window.location.origin;

      if (!allowedProtocol || isCurrentSite) {
        fail();
        return;
      }

      if (hostEl) hostEl.textContent = target.hostname;
      if (urlEl) urlEl.textContent = target.href;
      if (continueLink) {
        continueLink.setAttribute('href', target.href);
        continueLink.removeAttribute('aria-disabled');
      }
    } catch (_error) {
      fail();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLeavingNotice, { once: true });
  } else {
    initLeavingNotice();
  }
})();

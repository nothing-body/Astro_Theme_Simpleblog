(function () {
  var KEY = 'bb-privacy-v1';
  var raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (_e) {}
  var settings = { hasSetCookies: false, rememberTimezone: false, enableAnalytics: false };
  if (raw) {
    try {
      settings = Object.assign(settings, JSON.parse(raw));
    } catch (_e) {}
  }
  window.__privacySettings = settings;
  window.updatePrivacySettings = function (updates) {
    var next = Object.assign({}, settings, updates);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_e) {}
    window.__privacySettings = next;
    settings = next;
    document.dispatchEvent(new CustomEvent('privacy-settings-updated', { detail: next }));
  };
})();

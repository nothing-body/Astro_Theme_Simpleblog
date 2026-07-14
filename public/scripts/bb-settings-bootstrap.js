(function () {
  var KEY = 'bb-privacy-v1';
  var raw = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (_e) {}

  function normalizeSettings(value, fallback) {
    var source = value && typeof value === 'object' ? value : {};
    var defaults = fallback || {
      hasSetCookies: false,
      rememberTimezone: false,
      enableAnalytics: false,
    };
    return {
      hasSetCookies:
        Object.prototype.hasOwnProperty.call(source, 'hasSetCookies')
          ? source.hasSetCookies === true
          : defaults.hasSetCookies,
      rememberTimezone:
        Object.prototype.hasOwnProperty.call(source, 'rememberTimezone')
          ? source.rememberTimezone === true
          : defaults.rememberTimezone,
      enableAnalytics:
        Object.prototype.hasOwnProperty.call(source, 'enableAnalytics')
          ? source.enableAnalytics === true
          : defaults.enableAnalytics,
    };
  }

  var settings = normalizeSettings(null);
  if (raw) {
    try {
      settings = normalizeSettings(JSON.parse(raw));
    } catch (_e) {}
  }
  window.__privacySettings = settings;
  window.updatePrivacySettings = function (updates) {
    var next = normalizeSettings(updates, settings);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch (_e) {}
    window.__privacySettings = next;
    settings = next;
    document.dispatchEvent(new CustomEvent('privacy-settings-updated', { detail: next }));
  };
})();

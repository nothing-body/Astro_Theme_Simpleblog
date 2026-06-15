(function () {
  var settings = window.__privacySettings || {
    rememberTimezone: false,
    enableAnalytics: false,
    hasSetCookies: false,
  };
  var tzToggle = document.getElementById('pref-inline-tz');
  var gaToggle = document.getElementById('pref-inline-stats');
  var saveBtn = document.getElementById('site-settings-inline-save');

  if (tzToggle) {
    tzToggle.checked = settings.hasSetCookies ? settings.rememberTimezone !== false : false;
  }
  if (gaToggle) {
    gaToggle.checked = settings.hasSetCookies ? settings.enableAnalytics !== false : false;
  }

  if (!saveBtn) return;

  saveBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window.updatePrivacySettings !== 'function') return;
    window.updatePrivacySettings({
      hasSetCookies: true,
      rememberTimezone: !!(tzToggle && tzToggle.checked),
      enableAnalytics: !!(gaToggle && gaToggle.checked),
    });
    if (tzToggle && !tzToggle.checked) {
      try {
        localStorage.removeItem('bb-tz');
      } catch (e) {}
    }
    if (typeof window.__loadGa4IfConsented === 'function') {
      window.__loadGa4IfConsented();
    }
  });
})();

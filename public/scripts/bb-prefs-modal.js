(function () {
  var panel = document.getElementById('site-prefs-layer');
  if (!panel) return;

  var tzCheckbox = document.getElementById('pref-remember-tz');
  var gaCheckbox = document.getElementById('pref-enable-stats');
  var saveBtn = document.getElementById('site-prefs-save');
  var closeBtn = document.getElementById('site-prefs-close');
  var lastTriggerId = '';

  function getSettings() {
    return (
      window.__privacySettings || {
        hasSetCookies: false,
        rememberTimezone: false,
        enableAnalytics: false,
      }
    );
  }

  function syncCheckboxes() {
    var s = getSettings();
    if (tzCheckbox) tzCheckbox.checked = s.rememberTimezone !== false;
    if (gaCheckbox) {
      gaCheckbox.checked = s.hasSetCookies ? s.enableAnalytics !== false : false;
    }
  }

  function focusWithoutScroll(element) {
    if (!element || typeof element.focus !== 'function') return;
    try {
      element.focus({ preventScroll: true });
    } catch (e) {
      element.focus();
    }
  }

  function openPanel(event) {
    lastTriggerId = event && event.detail && event.detail.triggerId ? event.detail.triggerId : '';
    panel.removeAttribute('hidden');
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('is-visible');
    syncCheckboxes();
    focusWithoutScroll(saveBtn);
  }

  function closePanel() {
    panel.setAttribute('aria-hidden', 'true');
    panel.classList.remove('is-visible');
    panel.setAttribute('hidden', '');

    if (!lastTriggerId) return;
    var trigger = document.getElementById(lastTriggerId);
    focusWithoutScroll(trigger);
    lastTriggerId = '';
  }

  function saveSettings(event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    var updates = {
      hasSetCookies: true,
      rememberTimezone: !!(tzCheckbox && tzCheckbox.checked),
      enableAnalytics: !!(gaCheckbox && gaCheckbox.checked),
    };
    if (typeof window.updatePrivacySettings === 'function') {
      window.updatePrivacySettings(updates);
    }

    if (!updates.rememberTimezone) {
      try {
        localStorage.removeItem('bb-tz');
      } catch (e) {}
    }

    if (typeof window.__loadGa4IfConsented === 'function') {
      window.__loadGa4IfConsented();
    }

    closePanel();
  }

  document.addEventListener('open-site-prefs', openPanel);

  panel.addEventListener('click', function (e) {
    if (e.target === panel) closePanel();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      closePanel();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveSettings);
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && panel.classList.contains('is-visible')) {
      closePanel();
    }
  });

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      if (!getSettings().hasSetCookies) openPanel();
    });
  });
})();

(function () {
  var script = document.currentScript;
  var dateLocale = (script && script.getAttribute('data-date-locale')) || 'en-GB';
  var tzValue = 'auto';
  var clockTimer = null;
  var TZ_KEY = 'bb-tz';

  function getPart(parts, type) {
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === type) return parts[i].value;
    }
    return '--';
  }

  function privacyAllowsTzPersist() {
    return (
      window.__privacySettings &&
      window.__privacySettings.rememberTimezone &&
      window.__privacySettings.hasSetCookies
    );
  }

  function updateClock() {
    var now = new Date();
    var tz = tzValue === 'auto' ? undefined : tzValue;
    var dateParts = new Intl.DateTimeFormat(dateLocale, {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).formatToParts(now);
    var timeParts = new Intl.DateTimeFormat(dateLocale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).formatToParts(now);
    var dateEl = document.getElementById('clock-date');
    var timeEl = document.getElementById('clock-time');
    if (dateEl) {
      dateEl.textContent =
        getPart(dateParts, 'day') +
        '/' +
        getPart(dateParts, 'month') +
        '/' +
        getPart(dateParts, 'year');
    }
    if (timeEl) {
      timeEl.textContent =
        getPart(timeParts, 'hour') +
        ':' +
        getPart(timeParts, 'minute') +
        ':' +
        getPart(timeParts, 'second');
    }
  }

  function startClock() {
    if (clockTimer !== null) return;
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
  }

  function stopClock() {
    if (clockTimer !== null) {
      clearInterval(clockTimer);
      clockTimer = null;
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stopClock();
    else startClock();
  });
  startClock();

  var tzSelect = document.getElementById('tz-select');
  if (!tzSelect) return;

  var tzList = ['UTC', 'Asia/Taipei', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      tzList = Intl.supportedValuesOf('timeZone');
    }
  } catch (_e) {}

  tzList.forEach(function (tz) {
    var opt = document.createElement('option');
    opt.value = tz;
    opt.textContent = tz;
    tzSelect.appendChild(opt);
  });

  function applySavedTimezone() {
    var savedTz = null;
    if (privacyAllowsTzPersist()) {
      try {
        savedTz = localStorage.getItem(TZ_KEY);
      } catch (_e) {}
    }
    if (savedTz) {
      tzValue = savedTz;
      tzSelect.value = savedTz;
      updateClock();
    }
  }

  applySavedTimezone();

  tzSelect.addEventListener('change', function () {
    tzValue = tzSelect.value;
    updateClock();
    if (privacyAllowsTzPersist()) {
      try {
        localStorage.setItem(TZ_KEY, tzValue);
      } catch (_e) {}
    } else {
      try {
        localStorage.removeItem(TZ_KEY);
      } catch (_e) {}
    }
  });

  document.addEventListener('privacy-settings-updated', function () {
    if (!privacyAllowsTzPersist()) {
      try {
        localStorage.removeItem(TZ_KEY);
      } catch (_e) {}
      return;
    }
    applySavedTimezone();
  });
})();

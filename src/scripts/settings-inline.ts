import { loadAnalyticsIfConsented } from './analytics';
import { clearSavedTimezone } from './privacy';

const timezone = document.querySelector<HTMLInputElement>('#pref-inline-tz');
const analytics = document.querySelector<HTMLInputElement>('#pref-inline-stats');
const save = document.querySelector<HTMLButtonElement>('#site-settings-inline-save');
const settings = window.__privacySettings;

if (settings) {
  if (timezone) timezone.checked = settings.hasSetCookies && settings.rememberTimezone;
  if (analytics) analytics.checked = settings.hasSetCookies && settings.enableAnalytics;
}

save?.addEventListener('click', () => {
  window.updatePrivacySettings?.({
    hasSetCookies: true,
    rememberTimezone: timezone?.checked === true,
    enableAnalytics: analytics?.checked === true,
  });
  if (timezone?.checked !== true) clearSavedTimezone();
  loadAnalyticsIfConsented();
});

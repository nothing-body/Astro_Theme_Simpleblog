import { canPersistTimezone, TIMEZONE_STORAGE_KEY } from './privacy';
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from './storage';

const root = document.querySelector<HTMLElement>('[data-home-clock]');
const timezoneSelect = document.querySelector<HTMLSelectElement>('#tz-select');
const dateElement = document.querySelector<HTMLElement>('#clock-date');
const timeElement = document.querySelector<HTMLElement>('#clock-time');

if (root && timezoneSelect && dateElement && timeElement) {
  const dateLocale = root.dataset.dateLocale || 'en-GB';
  const initialTimezones = ['UTC', 'Asia/Taipei', 'Asia/Tokyo', 'America/New_York', 'Europe/London'];
  let timezone = 'auto';
  let timer: number | undefined;
  let formatterTimezone = '';
  let dateFormatter: Intl.DateTimeFormat | undefined;
  let timeFormatter: Intl.DateTimeFormat | undefined;
  let expanded = false;

  const addTimezoneOption = (value: string) => {
    if (Array.from(timezoneSelect.options).some(option => option.value === value)) return;
    timezoneSelect.add(new Option(value, value));
  };
  initialTimezones.forEach(addTimezoneOption);

  const updateClock = () => {
    try {
      if (!dateFormatter || !timeFormatter || formatterTimezone !== timezone) {
        const timeZone = timezone === 'auto' ? undefined : timezone;
        dateFormatter = new Intl.DateTimeFormat(dateLocale, {
          timeZone,
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
        timeFormatter = new Intl.DateTimeFormat(dateLocale, {
          timeZone,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        formatterTimezone = timezone;
      }
      const now = new Date();
      dateElement.textContent = dateFormatter.format(now);
      timeElement.textContent = timeFormatter.format(now);
    } catch {
      timezone = 'auto';
      formatterTimezone = '';
    }
  };
  const start = () => {
    if (timer !== undefined) return;
    updateClock();
    timer = window.setInterval(updateClock, 1000);
  };
  const stop = () => {
    if (timer === undefined) return;
    window.clearInterval(timer);
    timer = undefined;
  };
  const applySavedTimezone = () => {
    if (!canPersistTimezone()) return;
    const saved = readLocalStorage(TIMEZONE_STORAGE_KEY);
    if (!saved) return;
    addTimezoneOption(saved);
    timezone = saved;
    timezoneSelect.value = saved;
    updateClock();
  };
  const expandTimezoneOptions = () => {
    if (expanded) return;
    expanded = true;
    try {
      const supportedValuesOf = (Intl as typeof Intl & {
        supportedValuesOf?: (key: 'timeZone') => string[];
      }).supportedValuesOf;
      supportedValuesOf?.('timeZone').forEach(addTimezoneOption);
    } catch {
      // Keep the compact fallback list on older engines.
    }
  };

  timezoneSelect.addEventListener('pointerdown', expandTimezoneOptions, { once: true });
  timezoneSelect.addEventListener('focus', expandTimezoneOptions, { once: true });
  timezoneSelect.addEventListener('change', () => {
    timezone = timezoneSelect.value;
    updateClock();
    if (canPersistTimezone()) writeLocalStorage(TIMEZONE_STORAGE_KEY, timezone);
    else removeLocalStorage(TIMEZONE_STORAGE_KEY);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });
  document.addEventListener('privacy-settings-updated', () => {
    if (canPersistTimezone()) applySavedTimezone();
    else removeLocalStorage(TIMEZONE_STORAGE_KEY);
  });

  applySavedTimezone();
  start();
}

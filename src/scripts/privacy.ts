import type { PrivacySettings } from '../types';
import { readLocalStorage, removeLocalStorage, writeLocalStorage } from './storage';

const PRIVACY_STORAGE_KEY = 'bb-privacy-v1';
export const TIMEZONE_STORAGE_KEY = 'bb-tz';

const DEFAULT_SETTINGS: PrivacySettings = {
  hasSetCookies: false,
  rememberTimezone: false,
  enableAnalytics: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizePrivacySettings(
  value: unknown,
  fallback: PrivacySettings = DEFAULT_SETTINGS
): PrivacySettings {
  const source = isRecord(value) ? value : {};
  return {
    hasSetCookies:
      typeof source.hasSetCookies === 'boolean' ? source.hasSetCookies : fallback.hasSetCookies,
    rememberTimezone:
      typeof source.rememberTimezone === 'boolean'
        ? source.rememberTimezone
        : fallback.rememberTimezone,
    enableAnalytics:
      typeof source.enableAnalytics === 'boolean'
        ? source.enableAnalytics
        : fallback.enableAnalytics,
  };
}

export function bootstrapPrivacySettings(): PrivacySettings {
  let settings = normalizePrivacySettings(window.__privacySettings);
  const raw = readLocalStorage(PRIVACY_STORAGE_KEY);

  if (raw) {
    try {
      settings = normalizePrivacySettings(JSON.parse(raw));
    } catch {
      removeLocalStorage(PRIVACY_STORAGE_KEY);
    }
  }

  window.__privacySettings = settings;
  window.updatePrivacySettings = updates => {
    const next = normalizePrivacySettings(updates, settings);
    writeLocalStorage(PRIVACY_STORAGE_KEY, JSON.stringify(next));
    window.__privacySettings = next;
    settings = next;
    document.dispatchEvent(new CustomEvent<PrivacySettings>('privacy-settings-updated', { detail: next }));
  };

  return settings;
}

export function canPersistTimezone(): boolean {
  const settings = window.__privacySettings;
  return Boolean(settings?.hasSetCookies && settings.rememberTimezone);
}

export function clearSavedTimezone(): void {
  removeLocalStorage(TIMEZONE_STORAGE_KEY);
}

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PrivacySettings {
  hasSetCookies: boolean;
  rememberTimezone: boolean;
  enableAnalytics: boolean;
}

export interface LanguageRoute {
  path: string;
  canonicalPath: string;
  available: boolean;
}

declare global {
  interface Window {
    __privacySettings?: PrivacySettings;
    updatePrivacySettings?: (updates: Partial<PrivacySettings>) => void;
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __loadGa4IfConsented?: () => void;
  }
}

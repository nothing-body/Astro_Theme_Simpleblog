
export type Lang = 'zh-tw' | 'en' | 'zh-cn';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  prevUrl?: string;
  nextUrl?: string;
}

export interface PrivacySettings {
  hasSetCookies: boolean;
  rememberTimezone: boolean;
  enableAnalytics: boolean;
}

declare global {
  interface Window {
    __privacySettings?: PrivacySettings;
    updatePrivacySettings?: (updates: Partial<PrivacySettings>) => void;
    dataLayer?: unknown[];
  }
}

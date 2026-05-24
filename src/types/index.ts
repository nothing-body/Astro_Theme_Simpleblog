// src/types/index.ts — 全域 TypeScript 型別定義

/** 支援的語系 */
export type Lang = 'zh-tw' | 'en' | 'zh-cn';

/** 麵包屑項目 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/** 分頁資訊 */
export interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  prevUrl?: string;
  nextUrl?: string;
}

/** 隱私設定 */
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

export const languages = {
  en: 'English',
  'zh-tw': '繁體中文',
  'zh-cn': '简体中文',
} as const;

export const defaultLang = 'en' as const;
export type Lang = keyof typeof languages;

export function isLang(value: string): value is Lang {
  return Object.hasOwn(languages, value);
}

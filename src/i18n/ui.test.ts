import { ui } from './ui';
import { languages } from './locales';

describe('translation completeness', () => {
  for (const language of Object.keys(languages) as Array<keyof typeof ui>) {
    test(`${language} contains the same keys and interpolation variables as English`, () => {
      expect(Object.keys(ui[language]).sort()).toEqual(Object.keys(ui.en).sort());
      for (const key of Object.keys(ui.en) as Array<keyof typeof ui.en>) {
        const translated = ui[language][key];
        // Optional editorial copy may deliberately be empty.
        if (key !== 'welcome.introSecondaryLine1') expect(translated.trim()).not.toBe('');
        const parameters = (value: string) => [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/g)].map(match => match[1]).sort();
        expect(parameters(translated)).toEqual(parameters(ui.en[key]));
      }
    });
  }
});

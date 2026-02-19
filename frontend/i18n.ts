export const locales = ['en', 'tr', 'ar', 'fr', 'de', 'es', 'zh', 'ru'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export async function getTranslations(locale: string) {
  try {
    const messages = await import(`./public/locales/${locale}/common.json`);
    return messages.default;
  } catch {
    const messages = await import('./public/locales/en/common.json');
    return messages.default;
  }
}

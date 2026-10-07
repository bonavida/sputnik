import type { LocaleSetting } from '@shared/types';
import { en } from './en';
import type { MessageKey, Messages } from './es';
import { es } from './es';

export type Locale = 'es' | 'en';

/** Keys with plural forms, used without their suffix: t('tracks', { count }) */
type PluralKey = {
  [Key in MessageKey]: Key extends `${infer Base}_one` ? Base : never;
}[MessageKey];

export type TranslationKey =
  Exclude<MessageKey, `${string}_one` | `${string}_other`> | PluralKey;

export type Vars = Record<string, string | number>;

export type Translate = (key: TranslationKey, vars?: Vars) => string;

export const DICTIONARIES: Record<Locale, Messages> = { es, en };

const PLACEHOLDER = /\{(\w+)\}/g;

export const resolveLocale = (
  setting: LocaleSetting,
  systemLanguage: string
): Locale => {
  if (setting !== 'system') return setting;
  return systemLanguage.toLowerCase().startsWith('es') ? 'es' : 'en';
};

const isMessageKey = (messages: Messages, key: string): key is MessageKey =>
  Object.hasOwn(messages, key);

export const createTranslate = (locale: Locale): Translate => {
  const messages = DICTIONARIES[locale];
  const plurals = new Intl.PluralRules(locale);

  return (key, vars) => {
    const count = vars?.count;
    const pluralKey =
      typeof count === 'number' ? `${key}_${plurals.select(count)}` : key;
    // Spanish also has a `many` category (millions); it falls back to `other`
    const resolved = [pluralKey, `${key}_other`, key].find((candidate) =>
      isMessageKey(messages, candidate)
    );
    const template = resolved ? messages[resolved] : key;

    return template.replace(PLACEHOLDER, (match, name: string) => {
      const value = vars?.[name];
      return value === undefined ? match : String(value);
    });
  };
};

import { describe, expect, it } from 'vitest';
import { DICTIONARIES, createTranslate, resolveLocale } from './t';

const placeholders = (message: string) =>
  [...message.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).toSorted();

// Keyed by message, so a failure shows which translation is wrong
const placeholdersOf = (messages: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(messages).map(([key, message]) => [
      key,
      placeholders(message),
    ])
  );

describe('createTranslate', () => {
  const es = createTranslate('es');
  const en = createTranslate('en');

  it('translates plain keys', () => {
    expect(es('next')).toBe('Siguiente');
    expect(en('next')).toBe('Next');
  });

  it('interpolates variables', () => {
    expect(es('timeOf', { current: '1:24', total: '3:42' })).toBe(
      '1:24 de 3:42'
    );
  });

  it('leaves placeholders without a value untouched', () => {
    expect(en('timeOf', { current: '1:24' })).toBe('1:24 of {total}');
  });

  it.each([
    [0, '0 canciones', '0 songs'],
    [1, '1 canción', '1 song'],
    [12, '12 canciones', '12 songs'],
    [1_000_000, '1000000 canciones', '1000000 songs'],
  ])('picks the plural form for %i', (count, spanish, english) => {
    expect(es('tracks', { count })).toBe(spanish);
    expect(en('tracks', { count })).toBe(english);
  });
});

describe('resolveLocale', () => {
  it.each([
    ['system', 'es-AR', 'es'],
    ['system', 'es', 'es'],
    ['system', 'fr-FR', 'en'],
    ['system', 'en-US', 'en'],
    ['en', 'es-ES', 'en'],
    ['es', 'en-US', 'es'],
  ] as const)(
    '%s with system language %s → %s',
    (setting, system, expected) => {
      expect(resolveLocale(setting, system)).toBe(expected);
    }
  );
});

describe('dictionaries', () => {
  it.each(Object.entries(DICTIONARIES))(
    '%s has no empty messages',
    (_, messages) => {
      expect(
        Object.entries(messages).filter(([, message]) => message.trim() === '')
      ).toEqual([]);
    }
  );

  it('use the same placeholders in every language', () => {
    expect(placeholdersOf(DICTIONARIES.en)).toEqual(
      placeholdersOf(DICTIONARIES.es)
    );
  });
});

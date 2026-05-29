import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  configureLocalization,
  createLocaleDictionary,
  createTranslator,
  getLocalization,
  normalizeLocale,
  resetLocalization,
  resolveLocale,
} from '../locale/index.js';
import { configureBrowserLocalization, detectBrowserLocale } from '../ui/locale.js';

describe('localization helpers', () => {
  beforeEach(() => {
    resetLocalization();
  });

  it('declares English as default and supports English, Russian, and Spanish', () => {
    assert.equal(DEFAULT_LOCALE, 'en');
    assert.deepEqual(SUPPORTED_LOCALES, ['en', 'ru', 'es']);
  });

  it('normalizes region language tags to supported base locales', () => {
    assert.equal(normalizeLocale('en-US'), 'en');
    assert.equal(normalizeLocale('ru-RU'), 'ru');
    assert.equal(normalizeLocale('es_AR'), 'es');
    assert.equal(normalizeLocale('fr-FR'), 'en');
  });

  it('resolves the first supported locale preference', () => {
    assert.equal(resolveLocale(['fr-FR', 'es-AR', 'en-US']), 'es');
    assert.equal(resolveLocale(['de-DE']), 'en');
  });

  it('creates dictionaries with English fallback and custom overrides', () => {
    let dictionary = createLocaleDictionary('ru', {
      'chat.composer.placeholder': 'Своя строка',
    });

    assert.equal(dictionary['dialog.cancel'], 'Отмена');
    assert.equal(dictionary['chat.composer.placeholder'], 'Своя строка');
    assert.equal(dictionary['dialog.confirm'], 'Подтвердить');
  });

  it('translates with fallback, missing-key passthrough, and interpolation', () => {
    let t = createTranslator({ locale: 'es' });

    assert.equal(t('dialog.cancel'), 'Cancelar');
    assert.equal(t('missing.key'), 'missing.key');
    assert.equal(t('chat.message.workedFor', { elapsed: '15s' }), 'Trabajó durante 15s');
  });

  it('stores explicit runtime locale and message overrides', () => {
    configureLocalization({
      locale: 'ru-RU',
      messages: {
        ru: {
          'dialog.ok': 'Готово',
        },
      },
    });

    let localization = getLocalization();
    assert.equal(localization.locale, 'ru');
    assert.equal(localization.explicit, true);
    assert.equal(localization.t('dialog.ok'), 'Готово');
  });

  it('detects browser locale from navigator-like language preferences', () => {
    assert.equal(detectBrowserLocale({ languages: ['fr-FR', 'es-MX'], language: 'ru-RU' }), 'es');
    assert.equal(detectBrowserLocale({ language: 'ru-RU' }), 'ru');
  });

  it('configures browser locale without overriding explicit manual locale', () => {
    configureLocalization({ locale: 'ru' });
    let current = configureBrowserLocalization({
      navigator: { languages: ['es-AR'] },
    });

    assert.equal(current.locale, 'ru');

    let forced = configureBrowserLocalization({
      force: true,
      navigator: { languages: ['es-AR'] },
    });
    assert.equal(forced.locale, 'es');
    assert.equal(forced.explicit, false);
  });
});

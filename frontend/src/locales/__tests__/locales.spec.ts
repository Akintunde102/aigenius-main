import {
  LANGUAGE_CATALOG,
  resolveLanguageItem,
  getDictionary,
  hasUiDictionary,
  translate,
  DEFAULT_LANGUAGE_CODE,
} from '../index';

describe('locales internationalization module', () => {
  it('contains at least 40 supported languages in catalog', () => {
    expect(LANGUAGE_CATALOG.length).toBeGreaterThanOrEqual(40);
  });

  it('resolves default language when given null or invalid code', () => {
    expect(resolveLanguageItem(null).code).toBe(DEFAULT_LANGUAGE_CODE);
    expect(resolveLanguageItem(undefined).code).toBe(DEFAULT_LANGUAGE_CODE);
    expect(resolveLanguageItem('non-existent-xyz').code).toBe(DEFAULT_LANGUAGE_CODE);
  });

  it('resolves valid language codes and case-insensitively', () => {
    expect(resolveLanguageItem('ES').code).toBe('es');
    expect(resolveLanguageItem('fr').name).toBe('French');
    expect(resolveLanguageItem('de').nativeName).toBe('Deutsch');
    expect(resolveLanguageItem('ar').direction).toBe('rtl');
  });

  it('resolves regional subtag to base language when specific tag is absent', () => {
    expect(resolveLanguageItem('es-MX').code).toBe('es');
    expect(resolveLanguageItem('fr-CA').code).toBe('fr');
  });

  it('provides complete canonical English dictionary', () => {
    const dict = getDictionary('en');
    expect(dict.common.language).toBe('Language');
    expect(dict.sidebar.savedMessages).toBe('Saved messages');
    expect(dict.languageModal.title).toBe('Select Language');
  });

  it('merges Spanish overrides and falls back to English for any missing keys', () => {
    const dict = getDictionary('es');
    expect(dict.common.language).toBe('Idioma');
    expect(dict.sidebar.savedMessages).toBe('Mensajes guardados');
    expect(dict.sidebar.myFiles).toBe('Mis archivos');
    expect(dict.desktopProductMenu.opacity).toBe('Opacidad');
    // Common properties are all strings
    expect(typeof dict.common.save).toBe('string');
  });

  it('marks only languages with a UI dictionary as translated', () => {
    expect(hasUiDictionary('en')).toBe(true);
    expect(hasUiDictionary('de')).toBe(true);
    expect(hasUiDictionary('zh-CN')).toBe(true);
    expect(hasUiDictionary('ko')).toBe(true);
    expect(hasUiDictionary('it')).toBe(true);
    expect(hasUiDictionary('yo')).toBe(true);
    expect(getDictionary('zh-TW').common.settings).not.toBe(getDictionary('zh-CN').common.settings);
    expect(getDictionary('pt-BR').common.save).not.toBe(getDictionary('en').common.save);
    expect(getDictionary('de').chat.emptyState).not.toBe(getDictionary('en').chat.emptyState);
    expect(getDictionary('ja').desktopProductMenu.opacity).not.toBe('Opacity');
  });

  it('translates dotted paths and interpolates variables', () => {
    expect(translate('en', 'sidebar.language')).toBe('Language');
    expect(translate('es', 'sidebar.language')).toBe('Idioma');
    expect(translate('fr', 'sidebar.language')).toBe('Langue');
    expect(translate('de', 'sidebar.language')).toBe('Sprache');
    expect(translate('en', 'workflows.newWorkflow')).toBe('New workflow');
    expect(translate('en', 'wallet.addCredits')).toBe('Add credits');
    expect(typeof getDictionary('de').workflows.loading).toBe('string');
    expect(getDictionary('en').workflows.gateLoading).toContain('workflow');
    expect(getDictionary('en').composer.unsupportedFileAttachments).toContain('attachments');
    expect(getDictionary('en').modals.integrationsReauthorize).toContain('permissions');

    // Interpolation test
    expect(translate('en', 'nonexistent.key', 'Hello {name}!', { name: 'Alice' })).toBe('Hello Alice!');
  });
});

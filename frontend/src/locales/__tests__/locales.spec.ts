import {
  LANGUAGE_CATALOG,
  resolveLanguageItem,
  getDictionary,
  hasUiDictionary,
  translate,
  DEFAULT_LANGUAGE_CODE,
  preloadAllDictionaries,
} from '../index';

describe('locales internationalization module', () => {
  beforeAll(async () => {
    await preloadAllDictionaries();
  });
  it('contains all 110 supported Microsoft Store locales in catalog', () => {
    expect(LANGUAGE_CATALOG.length).toBe(110);
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
    expect(resolveLanguageItem('es-AR').code).toBe('es');
    expect(resolveLanguageItem('fr-BE').code).toBe('fr');
    expect(resolveLanguageItem('es-MX').code).toBe('es-MX');
    expect(resolveLanguageItem('fr-CA').code).toBe('fr-CA');
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

  it('provides Hausa UI strings for model picker chrome (no English merge for core keys)', () => {
    const dict = getDictionary('ha');
    expect(dict.modelPicker.collections).toBe('Tari');
    expect(dict.modelPicker.recentlyPicked).toBe('An zaɓa kwanan nan');
    expect(dict.modelPicker.subtitleBrowseAll).toContain('samfuran AI');
    expect(dict.modelPicker.perMessage).toBe('/ saƙo');
    expect(translate('ha', 'modelPicker.showingCount', '', { shown: 1, total: 2 })).toContain('1');
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

  it('enforces 100% key parity across all registered languages against canonical English', () => {
    const enDict = getDictionary('en');
    const enNamespaces = Object.keys(enDict);
    let totalEnKeys = 0;
    for (const ns of enNamespaces) {
      totalEnKeys += Object.keys((enDict as any)[ns]).length;
    }
    expect(totalEnKeys).toBeGreaterThanOrEqual(600);

    for (const item of LANGUAGE_CATALOG) {
      if (item.code === 'en') continue;
      const langDict = getDictionary(item.code);
      const missingKeys: string[] = [];
      for (const ns of enNamespaces) {
        for (const k of Object.keys((enDict as any)[ns])) {
          const val = (langDict as any)[ns]?.[k];
          if (val === undefined || val === null || typeof val !== 'string' || val.trim().length === 0) {
            missingKeys.push(`${ns}.${k}`);
          }
        }
      }
      expect({ lang: item.code, missing: missingKeys }).toEqual({ lang: item.code, missing: [] });
    }
  });
});

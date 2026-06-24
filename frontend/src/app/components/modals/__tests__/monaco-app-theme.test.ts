import { AIGENIUS_MONACO_THEME_DARK, AIGENIUS_MONACO_THEME_LIGHT, defineMonacoAppThemes, getMonacoThemeId } from '../monaco-app-theme';

describe('monaco-app-theme', () => {
  it('maps resolved themes to Monaco theme ids', () => {
    expect(getMonacoThemeId('dark')).toBe(AIGENIUS_MONACO_THEME_DARK);
    expect(getMonacoThemeId('light')).toBe(AIGENIUS_MONACO_THEME_LIGHT);
  });

  it('defines light and dark themes from app CSS variables', () => {
    const defineTheme = jest.fn();
    const monaco = {
      editor: { defineTheme },
    } as unknown as typeof import('monaco-editor');

    defineMonacoAppThemes(monaco);

    expect(defineTheme).toHaveBeenCalledTimes(2);
    expect(defineTheme).toHaveBeenCalledWith(
      AIGENIUS_MONACO_THEME_DARK,
      expect.objectContaining({
        base: 'vs-dark',
        colors: expect.objectContaining({
          'editor.background': expect.any(String),
          'editor.foreground': expect.any(String),
        }),
      }),
    );
    expect(defineTheme).toHaveBeenCalledWith(
      AIGENIUS_MONACO_THEME_LIGHT,
      expect.objectContaining({
        base: 'vs',
      }),
    );
  });
});

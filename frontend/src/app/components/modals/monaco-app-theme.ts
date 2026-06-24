import type { editor } from 'monaco-editor';

export const AIGENIUS_MONACO_THEME_DARK = 'aigenius-dark';
export const AIGENIUS_MONACO_THEME_LIGHT = 'aigenius-light';

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function buildMonacoTheme(mode: 'light' | 'dark'): editor.IStandaloneThemeData {
  const isDark = mode === 'dark';
  const bg = cssVar('--modal-bg', isDark ? '#18181c' : '#ffffff');
  const bgMuted = cssVar('--modal-bg-muted', isDark ? '#1e1e22' : '#f8f9fa');
  const fg = cssVar('--modal-fg', isDark ? '#ececef' : '#1c1d1f');
  const mutedFg = cssVar('--modal-muted-fg', isDark ? '#9ca3af' : '#6b7280');
  const accent = cssVar('--chat-accent', '#3b82f6');
  const border = cssVar('--modal-border', isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.1)');

  return {
    base: isDark ? 'vs-dark' : 'vs',
    inherit: true,
    rules: [
      { token: '', foreground: fg.replace('#', '') },
      { token: 'comment', foreground: isDark ? '6b7280' : '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: isDark ? '60a5fa' : '2563eb' },
      { token: 'string', foreground: isDark ? '6ee7b7' : '059669' },
      { token: 'number', foreground: isDark ? 'f9a8d4' : 'db2777' },
      { token: 'type', foreground: isDark ? '93c5fd' : '1d4ed8' },
      { token: 'identifier', foreground: fg.replace('#', '') },
      { token: 'delimiter', foreground: mutedFg.replace('#', '') },
      { token: 'html.tag', foreground: isDark ? '7dd3fc' : '0369a1' },
      { token: 'html.attribute', foreground: isDark ? 'fcd34d' : 'b45309' },
      { token: 'markdown.header', foreground: isDark ? 'f4f4f5' : '1c1d1f', fontStyle: 'bold' },
      { token: 'markdown.bold', foreground: fg.replace('#', ''), fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': bg,
      'editor.foreground': fg,
      'editor.lineHighlightBackground': bgMuted,
      'editorCursor.foreground': accent,
      'editor.selectionBackground': isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(59, 130, 246, 0.22)',
      'editorLineNumber.foreground': mutedFg,
      'editorLineNumber.activeForeground': fg,
      'editor.selectionHighlightBackground': isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)',
      'editorWidget.background': bgMuted,
      'editorWidget.border': border,
      'scrollbarSlider.background': isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.28)',
      'scrollbarSlider.hoverBackground': isDark ? 'rgba(148, 163, 184, 0.55)' : 'rgba(71, 85, 105, 0.4)',
      'minimap.background': bg,
    },
  };
}

type MonacoApi = {
  editor: {
    defineTheme: (themeName: string, themeData: editor.IStandaloneThemeData) => void;
  };
};

export function defineMonacoAppThemes(monaco: MonacoApi): void {
  monaco.editor.defineTheme(AIGENIUS_MONACO_THEME_DARK, buildMonacoTheme('dark'));
  monaco.editor.defineTheme(AIGENIUS_MONACO_THEME_LIGHT, buildMonacoTheme('light'));
}

export function getMonacoThemeId(resolvedTheme: 'light' | 'dark'): string {
  return resolvedTheme === 'dark' ? AIGENIUS_MONACO_THEME_DARK : AIGENIUS_MONACO_THEME_LIGHT;
}

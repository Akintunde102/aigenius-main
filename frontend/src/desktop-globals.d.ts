export {};

declare global {
  interface Window {
    aigeniusDesktop?: {
      isDesktop: true;
      shellChrome?: {
        titleBarTopPx: number;
        contentLeftPx: number;
        titleBarRightInsetPx: number;
      };
      openNewWindow?: (relativePath?: string) => Promise<void>;
      /** Present on full preload; optional for partial test doubles. */
      openExternal?: (url: string) => void;
      /** Fires when the Electron main window regains OS focus (e.g. after system-browser payment). */
      onMainWindowFocus?: (handler: () => void) => () => void;
      /** Badge + OS notification when a chat response finishes while the app is unfocused. */
      notifyChatCompletion?: (payload: {
        modelName?: string;
        preview: string;
      }) => Promise<{ notified: boolean }>;
      startWebSignIn?: () => Promise<{ token?: string | null } | null>;
      startOAuthSignIn?: (options?: { provider?: 'google' }) => Promise<{ token?: string | null } | null>;
      getDesktopRefreshToken?: () => Promise<string | null>;
      setDesktopRefreshToken?: (token: string) => Promise<{ ok: boolean }>;
      clearDesktopAuthSecrets?: () => Promise<{ ok: boolean }>;
      getUpstreamApiUrl?: () => Promise<string>;
      getChatRuntimeContext?: () => Promise<{
        desktopHost: { platform: string; arch: string; release: string; userHomeDir: string };
        retrievalMemoryCatalog: {
          generatedAtIso: string;
          entries: Array<{ slug: string; name: string; description: string; tags: string[] }>;
        };
        localToolCapabilities?: {
          reportedAtIso: string;
          policy: string;
          grep: {
            engine: 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';
            bundledRipgrep: boolean;
            systemRipgrep: boolean;
            builtinFallback: boolean;
            recommended: 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';
          };
          goToDefinition: {
            engine: 'tsmorph';
            languageServerOptional: boolean;
            recommended: 'tsmorph';
          };
          git: {
            available: boolean;
            engine: 'system-git' | 'unavailable';
            recommended: 'system-git' | null;
          };
        };
        structuralDigest?: string;
      }>;
      syncToolPermissionPreferences?: (prefs: {
        autoApproveAll: boolean;
        requireApprovalByTool: Record<string, boolean>;
      }) => Promise<{
        autoApproveAll: boolean;
        requireApprovalByTool: Record<string, boolean>;
      }>;
      setCodeProjectIndex?: (
        payload: { projectId: string; rootPath: string } | null,
      ) => Promise<{ ok: boolean }>;
      pickProjectDirectory?: () => Promise<{ path: string } | null>;
      runLocalDesktopTool?: (
        payload: { tool: string; arguments: Record<string, unknown> },
        options?: {
          onShellStreamChunk?: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void;
        },
      ) => Promise<{ ok: true; result: string } | { ok: false; error: string }>;
      /** Full desktop (desktopCapturer); batch may contain multiple PNGs on multi-monitor setups. */
      onQueueChatScreenshot?: (
        handler: (items: Array<{ base64: string; mimeType: string; basename: string }>) => void,
      ) => () => void;
      [key: string]: any;
    };
  }
}

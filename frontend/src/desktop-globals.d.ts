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
      startWebSignIn?: () => Promise<{ token?: string | null } | null>;
      getChatRuntimeContext?: () => Promise<{
        desktopHost: { platform: string; arch: string; release: string; userHomeDir: string };
        retrievalMemoryCatalog: {
          generatedAtIso: string;
          entries: Array<{ slug: string; name: string; description: string; tags: string[] }>;
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
    };
  }
}

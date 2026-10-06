import {
  dismissMissingFolderPrompt,
  isMissingFolderDismissed,
  resetMissingFolderDismissStorageForTests,
  shouldPromptMissingFolderModal,
  clearMissingFolderDismiss,
} from '../missing-project-folder-dismiss';

function installLocalStorageMock(): void {
  const store: Record<string, string> = {};
  const api = {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: api, configurable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'localStorage', { value: api, configurable: true });
  }
}

describe('missing-project-folder-dismiss', () => {
  beforeEach(() => {
    installLocalStorageMock();
    resetMissingFolderDismissStorageForTests();
  });

  it('tracks dismiss per project id', () => {
    expect(isMissingFolderDismissed('p1')).toBe(false);
    dismissMissingFolderPrompt('p1');
    expect(isMissingFolderDismissed('p1')).toBe(true);
    expect(isMissingFolderDismissed('p2')).toBe(false);
    clearMissingFolderDismiss('p1');
    expect(isMissingFolderDismissed('p1')).toBe(false);
  });

  it('shouldPromptMissingFolderModal only for active desktop missing roots', () => {
    expect(
      shouldPromptMissingFolderModal({
        projectId: 'p1',
        isDesktop: true,
        rootOk: false,
        isActiveProject: true,
        dismissed: false,
      }),
    ).toBe(true);
    expect(
      shouldPromptMissingFolderModal({
        projectId: 'p1',
        isDesktop: false,
        rootOk: false,
        isActiveProject: true,
        dismissed: false,
      }),
    ).toBe(false);
    expect(
      shouldPromptMissingFolderModal({
        projectId: 'p1',
        isDesktop: true,
        rootOk: true,
        isActiveProject: true,
        dismissed: false,
      }),
    ).toBe(false);
    expect(
      shouldPromptMissingFolderModal({
        projectId: 'p1',
        isDesktop: true,
        rootOk: false,
        isActiveProject: false,
        dismissed: false,
      }),
    ).toBe(false);
    expect(
      shouldPromptMissingFolderModal({
        projectId: 'p1',
        isDesktop: true,
        rootOk: false,
        isActiveProject: true,
        dismissed: true,
      }),
    ).toBe(false);
  });
});

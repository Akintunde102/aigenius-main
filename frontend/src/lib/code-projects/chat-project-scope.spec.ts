import {
  getActiveCodeProject,
  setActiveCodeProject,
  type ActiveCodeProjectSnapshot,
} from './active-code-project';
import {
  resetChatProjectScopeForTests,
  resolveProjectScopeForChatRequest,
  setChatProjectScopeId,
} from './chat-project-scope';

const PROJECT: ActiveCodeProjectSnapshot = {
  id: '69575bbe-914d-4ec3-bfb2-94cb43a13ed4',
  name: 'nobox-website',
  rootPath: 'C:\\Users\\me\\Desktop\\nobox-website',
};

const localStorageStore: Record<string, string> = {};

describe('resolveProjectScopeForChatRequest', () => {
  beforeEach(() => {
    Object.keys(localStorageStore).forEach((key) => delete localStorageStore[key]);
    (window.localStorage.getItem as jest.Mock).mockImplementation(
      (key: string) => localStorageStore[key] ?? null,
    );
    (window.localStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      localStorageStore[key] = value;
    });
    (window.localStorage.removeItem as jest.Mock).mockImplementation((key: string) => {
      delete localStorageStore[key];
    });

    resetChatProjectScopeForTests();
    setActiveCodeProject(null);
  });

  it('uses explicit chat scope when set', () => {
    setChatProjectScopeId(PROJECT.id, PROJECT);

    const resolved = resolveProjectScopeForChatRequest();

    expect(resolved.projectScopeId).toBe(PROJECT.id);
    expect(resolved.snapshot).toEqual(PROJECT);
  });

  it('returns null when chat scope is unset even if storage has a project', () => {
    setActiveCodeProject(PROJECT);

    const resolved = resolveProjectScopeForChatRequest();

    expect(resolved.projectScopeId).toBeNull();
    expect(resolved.snapshot).toBeNull();
  });

  it('falls back to storage snapshot when scope id set without snapshot', () => {
    setActiveCodeProject(PROJECT);
    setChatProjectScopeId(PROJECT.id);

    const resolved = resolveProjectScopeForChatRequest();

    expect(resolved.projectScopeId).toBe(PROJECT.id);
    expect(resolved.snapshot).toEqual(PROJECT);
  });
});

import {
  resetDesktopCodeProjectSyncStateForTests,
  syncCodeProjectToDesktop,
} from './sync-code-project-to-desktop';
import { resetChatProjectScopeForTests, setChatProjectScopeId } from './chat-project-scope';
import { setActiveCodeProject } from './active-code-project';

const setCodeProjectIndex = jest.fn().mockResolvedValue({ ok: true });

describe('syncCodeProjectToDesktop', () => {
  beforeEach(() => {
    resetDesktopCodeProjectSyncStateForTests();
    resetChatProjectScopeForTests();
    localStorage.clear();
    setCodeProjectIndex.mockClear();
    (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop = {
      isDesktop: true,
      setCodeProjectIndex,
    };
  });

  afterEach(() => {
    delete (window as Window & { aigeniusDesktop?: object }).aigeniusDesktop;
    localStorage.clear();
  });

  it('syncs active chat project scope to the desktop bridge', async () => {
    const snapshot = {
      id: 'proj-1',
      name: 'MomVersity',
      rootPath: 'C:\\Users\\me\\Desktop\\projects\\MomVersityRepo',
    };
    setChatProjectScopeId('proj-1', snapshot);
    setActiveCodeProject(snapshot);

    await syncCodeProjectToDesktop();
    expect(setCodeProjectIndex).toHaveBeenCalledWith({
      projectId: 'proj-1',
      rootPath: snapshot.rootPath,
    });
  });

  it('skips redundant IPC when project id and root are unchanged', async () => {
    const snapshot = {
      id: 'proj-1',
      name: 'MomVersity',
      rootPath: 'C:\\Users\\me\\projects\\MomVersityRepo',
    };
    setChatProjectScopeId('proj-1', snapshot);
    setActiveCodeProject(snapshot);

    await syncCodeProjectToDesktop();
    await syncCodeProjectToDesktop();

    expect(setCodeProjectIndex).toHaveBeenCalledTimes(1);
  });

  it('clears desktop project when chat scope is general', async () => {
    setChatProjectScopeId('proj-1', {
      id: 'proj-1',
      name: 'MomVersity',
      rootPath: 'C:\\Users\\me\\projects\\MomVersityRepo',
    });
    await syncCodeProjectToDesktop();
    setChatProjectScopeId(null);
    await syncCodeProjectToDesktop();

    expect(setCodeProjectIndex).toHaveBeenLastCalledWith(null);
  });
});

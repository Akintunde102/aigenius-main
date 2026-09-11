import { DESKTOP_APP_USER_MODEL_ID } from './desktop-app-identity';

describe('DESKTOP_APP_USER_MODEL_ID', () => {
  it('uses the stable Windows app id (not Electron default)', () => {
    expect(DESKTOP_APP_USER_MODEL_ID).toBe('chat.aigenius.desktop');
    expect(DESKTOP_APP_USER_MODEL_ID.toLowerCase()).not.toContain('electron');
  });
});

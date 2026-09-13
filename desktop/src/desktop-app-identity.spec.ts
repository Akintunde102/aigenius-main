import {
  DESKTOP_DEV_USER_DATA_DIR_NAME,
  DESKTOP_PACKAGED_USER_DATA_DIR_NAME,
  resolveDesktopUserDataDirName,
} from './desktop-app-identity';

describe('resolveDesktopUserDataDirName', () => {
  it('uses a separate AppData folder for unpackaged electron . / Tilt', () => {
    expect(resolveDesktopUserDataDirName(false)).toBe(DESKTOP_DEV_USER_DATA_DIR_NAME);
  });

  it('keeps the productName folder for installed and win-unpacked builds', () => {
    expect(resolveDesktopUserDataDirName(true)).toBe(DESKTOP_PACKAGED_USER_DATA_DIR_NAME);
  });
});

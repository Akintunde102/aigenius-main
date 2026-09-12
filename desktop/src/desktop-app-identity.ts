/** Must match `build.appId` in `package.json`. Windows uses this for taskbar grouping and the exe icon. */
export const DESKTOP_APP_USER_MODEL_ID = 'chat.aigenius.desktop';

/** Electron `productName` — packaged `userData` on Windows is `%APPDATA%\AIGenius`. */
export const DESKTOP_PACKAGED_USER_DATA_DIR_NAME = 'AIGenius';

/** Unpackaged `electron .` / Tilt must not share cookies and localStorage with the installed app. */
export const DESKTOP_DEV_USER_DATA_DIR_NAME = 'AIGenius-dev';

export function resolveDesktopUserDataDirName(isPackaged: boolean): string {
  return isPackaged ? DESKTOP_PACKAGED_USER_DATA_DIR_NAME : DESKTOP_DEV_USER_DATA_DIR_NAME;
}

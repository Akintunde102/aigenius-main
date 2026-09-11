import * as fs from 'fs';
import * as path from 'path';
import { approvalDialogWindowChrome } from '../approval-dialog-window-chrome';
import { approvalDialogBrowserWindowOptions } from '../secondary-browser-window';

jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => '/tmp/aigenius-test'),
  },
}));

jest.mock('../main-window', () => ({
  getWindowIcon: jest.fn(() => undefined),
}));

describe('approvalDialogWindowChrome', () => {
  const platform = process.platform;

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: platform });
  });

  it('keeps inset traffic lights on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const o = approvalDialogWindowChrome();
    expect(o.titleBarStyle).toBe('hiddenInset');
    expect(o.trafficLightPosition).toEqual({ x: 12, y: 10 });
    expect(o.frame).toBeUndefined();
    expect(o.titleBarOverlay).toBeUndefined();
  });

  it('uses a framed window on win32 so overlay cannot hide Run/Cancel', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const o = approvalDialogWindowChrome();
    expect(o.frame).toBe(true);
    expect(o.titleBarStyle).toBeUndefined();
    expect(o.titleBarOverlay).toBeUndefined();
    expect(o.autoHideMenuBar).toBe(true);
  });
});

describe('approvalDialogBrowserWindowOptions', () => {
  const platform = process.platform;

  afterAll(() => {
    Object.defineProperty(process, 'platform', { value: platform });
  });

  it('uses a non-modal framed child on win32 to avoid blank sheets over the main shell', () => {
    Object.defineProperty(process, 'platform', { value: 'win32' });
    const options = approvalDialogBrowserWindowOptions({} as never, { width: 520, height: 400 });
    expect(options.modal).toBe(false);
    expect(options.frame).toBe(true);
    expect(options.show).toBe(false);
  });

  it('keeps modal sheets on darwin', () => {
    Object.defineProperty(process, 'platform', { value: 'darwin' });
    const options = approvalDialogBrowserWindowOptions({} as never, { width: 520, height: 400 });
    expect(options.modal).toBe(true);
  });
});

describe('approval HTML titlebar spacer', () => {
  const files = ['shell-approval.html', 'patch-approval.html', 'external-link-approval.html'];

  it('caps titlebar-area-height so a Windows overlay cannot fill the dialog', () => {
    for (const file of files) {
      const html = fs.readFileSync(path.join(__dirname, '..', '..', 'resources', file), 'utf8');
      expect(html).toContain('max-height: 48px');
      expect(html).toMatch(/height:\s*min\(40px,\s*env\(titlebar-area-height/);
    }
  });
});

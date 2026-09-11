import { detectDesktopOsFamily, getRevealInFolderLabel, copyLocalItem } from '../file-preview-os-actions.utils';

describe('detectDesktopOsFamily', () => {
  it('detects Windows from the user agent', () => {
    expect(
      detectDesktopOsFamily(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ),
    ).toBe('win32');
  });

  it('detects macOS from the user agent', () => {
    expect(
      detectDesktopOsFamily(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0',
      ),
    ).toBe('darwin');
  });

  it('falls back to linux for other desktops', () => {
    expect(
      detectDesktopOsFamily(
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0',
      ),
    ).toBe('linux');
  });
});

describe('getRevealInFolderLabel', () => {
  it('names Finder on macOS', () => {
    expect(getRevealInFolderLabel('darwin')).toBe('Reveal in Finder');
  });

  it('names File Explorer on Windows', () => {
    expect(getRevealInFolderLabel('win32')).toBe('Reveal in File Explorer');
  });

  it('uses a generic file manager label on Linux', () => {
    expect(getRevealInFolderLabel('linux')).toBe('Reveal in file manager');
  });
});

describe('copyLocalItem', () => {
  it('rejects an empty path', async () => {
    const writeText = jest.fn();
    await expect(
      copyLocalItem('  ', { writeText }),
    ).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies a file or folder through the desktop clipboard IPC', async () => {
    const copyFileToClipboard = jest.fn().mockResolvedValue({ ok: true });
    const writeText = jest.fn();
    await expect(
      copyLocalItem('C:\\Users\\me\\resume.md', { copyFileToClipboard, writeText }),
    ).resolves.toBe(true);
    expect(copyFileToClipboard).toHaveBeenCalledWith('C:\\Users\\me\\resume.md');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('falls back to copying the path as text', async () => {
    const copyFileToClipboard = jest.fn().mockResolvedValue({ ok: false, error: 'unsupported' });
    const writeText = jest.fn().mockReturnValue(true);
    await expect(
      copyLocalItem('/home/me/docs', { copyFileToClipboard, writeText }),
    ).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('/home/me/docs');
  });
});

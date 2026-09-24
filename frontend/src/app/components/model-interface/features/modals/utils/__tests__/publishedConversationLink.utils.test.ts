import copy from 'copy-to-clipboard';
import {
  copyPublishedConversationUrl,
  openPublishedConversationUrl,
} from '../publishedConversationLink.utils';

jest.mock('copy-to-clipboard', () => jest.fn());

const publishedUrl = 'http://127.0.0.1:23001/published-conversations/abc';

describe('publishedConversationLink', () => {
  const copyMock = copy as jest.MockedFunction<typeof copy>;

  beforeEach(() => {
    jest.clearAllMocks();
    delete window.aigeniusDesktop;
  });

  it('copies the full published url', async () => {
    copyMock.mockReturnValue(true);

    await expect(copyPublishedConversationUrl(`  ${publishedUrl}  `)).resolves.toBe(true);
    expect(copyMock).toHaveBeenCalledWith(publishedUrl);
  });

  it('does not copy an empty url', async () => {
    await expect(copyPublishedConversationUrl('   ')).resolves.toBe(false);
    expect(copyMock).not.toHaveBeenCalled();
  });

  it('falls back to the clipboard API when execCommand fails', async () => {
    copyMock.mockReturnValue(false);
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    await expect(copyPublishedConversationUrl(publishedUrl)).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith(publishedUrl);
  });

  it('reports copy failure when both clipboard paths fail', async () => {
    copyMock.mockReturnValue(false);
    const writeText = jest.fn().mockRejectedValue(new Error('NotAllowedError'));
    Object.assign(navigator, { clipboard: { writeText } });

    await expect(copyPublishedConversationUrl(publishedUrl)).resolves.toBe(false);
  });

  it('opens the published page through the desktop system browser', () => {
    const openExternalUrl = jest.fn().mockResolvedValue({ ok: true });
    window.aigeniusDesktop = { isDesktop: true, openExternalUrl };
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    openPublishedConversationUrl(`  ${publishedUrl}  `);

    expect(openExternalUrl).toHaveBeenCalledWith(publishedUrl);
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('falls back to openExternal when openExternalUrl is missing', () => {
    const openExternal = jest.fn();
    window.aigeniusDesktop = { isDesktop: true, openExternal };
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    openPublishedConversationUrl(publishedUrl);

    expect(openExternal).toHaveBeenCalledWith(publishedUrl);
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('opens a new browser tab on the web', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    openPublishedConversationUrl(publishedUrl);

    expect(open).toHaveBeenCalledWith(publishedUrl, '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('ignores an empty url when opening', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    openPublishedConversationUrl('  ');

    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });
});

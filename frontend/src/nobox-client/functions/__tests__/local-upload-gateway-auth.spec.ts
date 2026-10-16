import { argumentsForLocalDesktopTool } from '../local-upload-gateway-auth';
import { getAccessToken } from '../../../lib/api/auth-client';
import { resolveGatewayApiRootUrl } from '../../../lib/api/resolve-gateway-api-root';

jest.mock('../../../lib/api/auth-client', () => ({
  getAccessToken: jest.fn(),
}));

jest.mock('../../../lib/api/resolve-gateway-api-root', () => ({
  resolveGatewayApiRootUrl: jest.fn(),
}));

describe('argumentsForLocalDesktopTool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (resolveGatewayApiRootUrl as jest.Mock).mockResolvedValue('http://127.0.0.1:28000');
  });

  it('passes non-gateway tools through unchanged', async () => {
    const args = { query: 'test' };
    const res = await argumentsForLocalDesktopTool('local_grep', args);
    expect(res).toEqual({ arguments: args });
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('returns an error when local_upload_file is called without an access token', async () => {
    (getAccessToken as jest.Mock).mockReturnValue(null);
    const args = { path: '/tmp/test.png' };
    const res = await argumentsForLocalDesktopTool('local_upload_file', args);
    expect(res.error).toBe('Sign in before uploading a local file.');
    expect(res.arguments).toEqual(args);
  });

  it('returns an error when publish_html is called without an access token', async () => {
    (getAccessToken as jest.Mock).mockReturnValue(null);
    const args = { filePath: 'C:/docs/app.html' };
    const res = await argumentsForLocalDesktopTool('publish_html', args);
    expect(res.error).toBe('Sign in before publishing an HTML page.');
    expect(res.arguments).toEqual(args);
  });

  it('attaches __gatewayUpload to publish_html when authenticated', async () => {
    (getAccessToken as jest.Mock).mockReturnValue('jwt-token-123');
    const args = {
      filePath: 'C:/docs/app.html',
      slug: 'my-app',
      conversation_id: '11111111-2222-3333-4444-555555555555',
    };
    const res = await argumentsForLocalDesktopTool('publish_html', args);

    expect(res.error).toBeUndefined();
    expect(res.arguments).toEqual({
      ...args,
      __gatewayUpload: {
        apiRoot: 'http://127.0.0.1:28000',
        accessToken: 'jwt-token-123',
        conversationId: '11111111-2222-3333-4444-555555555555',
      },
    });
  });

  it('returns an error when host_markdown is called without an access token', async () => {
    (getAccessToken as jest.Mock).mockReturnValue(null);
    const args = { action: 'publish', filePath: 'C:/docs/README.md' };
    const res = await argumentsForLocalDesktopTool('host_markdown', args);
    expect(res.error).toBe('Sign in before hosting a Markdown page.');
    expect(res.arguments).toEqual(args);
  });

  it('attaches __gatewayUpload to host_markdown when authenticated', async () => {
    (getAccessToken as jest.Mock).mockReturnValue('jwt-token-md');
    const args = { action: 'publish', filePath: 'C:/docs/README.md' };
    const res = await argumentsForLocalDesktopTool('host_markdown', args);

    expect(res.error).toBeUndefined();
    expect(res.arguments.__gatewayUpload).toEqual({
      apiRoot: 'http://127.0.0.1:28000',
      accessToken: 'jwt-token-md',
      conversationId: undefined,
    });
  });

  it('attaches __gatewayUpload to local_upload_file when authenticated', async () => {
    (getAccessToken as jest.Mock).mockReturnValue('jwt-token-abc');
    const args = { path: '/tmp/image.png' };
    const res = await argumentsForLocalDesktopTool('local_upload_file', args);

    expect(res.error).toBeUndefined();
    expect(res.arguments.__gatewayUpload).toEqual({
      apiRoot: 'http://127.0.0.1:28000',
      accessToken: 'jwt-token-abc',
      conversationId: undefined,
    });
  });
});

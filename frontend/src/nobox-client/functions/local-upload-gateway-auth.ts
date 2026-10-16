import { getAccessToken } from '../../lib/api/auth-client';
import { resolveGatewayApiRootUrl } from '../../lib/api/resolve-gateway-api-root';

const CHAT_ID_IN_PATH = /\/chat\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

export function chatConversationIdFromLocation(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const match = window.location.pathname.match(CHAT_ID_IN_PATH);
  return match?.[1];
}

const GATEWAY_AUTH_TOOLS = new Set(['local_upload_file', 'publish_html', 'host_markdown']);

/** Adds gateway credentials for local upload / publish tools without putting them in the model transcript. */
export async function argumentsForLocalDesktopTool(
  tool: string,
  args: Record<string, unknown> | undefined,
): Promise<{ arguments: Record<string, unknown>; error?: string }> {
  const base = { ...(args ?? {}) };
  if (!GATEWAY_AUTH_TOOLS.has(tool)) {
    return { arguments: base };
  }
  const accessToken = getAccessToken();
  if (!accessToken) {
    const signInMessage =
      tool === 'publish_html'
        ? 'Sign in before publishing an HTML page.'
        : tool === 'host_markdown'
          ? 'Sign in before hosting a Markdown page.'
          : 'Sign in before uploading a local file.';
    return {
      arguments: base,
      error: signInMessage,
    };
  }
  const apiRoot = await resolveGatewayApiRootUrl();
  const fromArgs = typeof base.conversation_id === 'string' ? base.conversation_id.trim() : '';
  return {
    arguments: {
      ...base,
      __gatewayUpload: {
        apiRoot,
        accessToken,
        conversationId: fromArgs || chatConversationIdFromLocation(),
      },
    },
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

export const OPENAI_CHAT_COMPLETIONS_PATH = '/gateway/*/openai/v1/chat/completions';
export const OPENAI_DESKTOP_TOOL_RESULT_PATH = '/gateway/*/openai/v1/chat/desktop-tool-result';
export const OPENAI_TOOL_APPROVAL_RESULT_PATH = '/gateway/*/openai/v1/chat/tool-approval-result';
export const CONTENT_TYPE_JSON = 'application/json';
export const AUTHORIZATION_BEARER_PREFIX = 'Bearer ';
export const STREAM_DONE_SIGNAL = '[DONE]';
export const HTTP_METHOD_POST = 'POST';
export const DEFAULT_EMPTY_CONTENT = '';
export const NEWLINE = '\n';

/** Must match backend `X_AIGENIUS_DESKTOP_HEADER` + `X_AIGENIUS_DESKTOP_HEADER_PRESENT_VALUE`. */
export const AIGENIUS_DESKTOP_CLIENT_HEADER = 'x-aigenius-desktop';
export const AIGENIUS_DESKTOP_CLIENT_HEADER_VALUE = '1';

/** Wait for preload IPC before handling `client_delegate` (aligns with long-running desktop tool approval). */
export const LOCAL_DESKTOP_BRIDGE_WAIT_MS = 30_000;

export const ERROR_MESSAGES = {
  HTTP_ERROR: (status: number) => `HTTP error! status: ${status}`,
  NO_RESPONSE_BODY: 'No response body for streaming',
  REQUEST_ABORTED: 'Request aborted',
  MISSING_JWT_TOKEN: 'JWT token not found',
  INVALID_RESPONSE: 'Invalid response from server',
} as const;

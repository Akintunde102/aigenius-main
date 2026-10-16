import fs from 'fs/promises';
import path from 'path';
import { resolveReadFilePath } from './utils/read-file/path-resolver';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  'mp3', 'wav', 'ogg', 'm4a',
  'mp4', 'mov', 'webm', 'avi', 'mkv',
  'pdf',
  'txt', 'csv', 'json', 'md', 'markdown', 'xml',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  avi: 'video/x-msvideo',
  mkv: 'video/x-matroska',
  pdf: 'application/pdf',
  txt: 'text/plain',
  csv: 'text/csv',
  json: 'application/json',
  md: 'text/markdown',
  markdown: 'text/markdown',
  xml: 'application/xml',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export type GatewayUploadAuth = {
  apiRoot: string;
  accessToken: string;
  conversationId?: string;
};

function extensionOf(fileName: string): string {
  if (!fileName.includes('.')) return '';
  return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
}

function readGatewayAuth(args: Record<string, unknown>): GatewayUploadAuth | { error: string } {
  const raw = args.__gatewayUpload;
  if (!raw || typeof raw !== 'object') {
    return { error: 'Upload auth is missing. Sign in and try again from the desktop app.' };
  }
  const auth = raw as Partial<GatewayUploadAuth>;
  if (typeof auth.apiRoot !== 'string' || !auth.apiRoot.trim()) {
    return { error: 'Upload API address is missing.' };
  }
  if (typeof auth.accessToken !== 'string' || !auth.accessToken.trim()) {
    return { error: 'Sign in before uploading a local file.' };
  }
  return {
    apiRoot: auth.apiRoot.trim(),
    accessToken: auth.accessToken.trim(),
    conversationId: typeof auth.conversationId === 'string' ? auth.conversationId.trim() : undefined,
  };
}

/**
 * Reads a local file and POSTs it to the existing gateway stream upload route,
 * tagged `uploadedBy=model`.
 */
export async function uploadLocalFileToUserLibrary(
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const pathArg = typeof rawArgs.path === 'string' && rawArgs.path.trim()
    ? rawArgs.path.trim()
    : typeof rawArgs.local_path === 'string'
      ? rawArgs.local_path.trim()
      : '';
  if (!pathArg) {
    return { ok: false, error: 'path is required' };
  }

  const auth = readGatewayAuth(rawArgs);
  if ('error' in auth) {
    return { ok: false, error: auth.error };
  }

  const resolved = await resolveReadFilePath(pathArg);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  const fileName = typeof rawArgs.file_name === 'string' && rawArgs.file_name.trim()
    ? rawArgs.file_name.trim()
    : path.basename(resolved.resolved);
  const extension = extensionOf(fileName);
  if (!extension || !ALLOWED_EXTENSIONS.has(extension)) {
    return { ok: false, error: 'Unsupported file extension' };
  }
  const mime = MIME_BY_EXTENSION[extension];
  if (!mime) {
    return { ok: false, error: 'Unsupported file type' };
  }

  const stat = await fs.stat(resolved.resolved);
  if (stat.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File is larger than the ${MAX_UPLOAD_BYTES} byte upload limit` };
  }
  if (stat.size === 0) {
    return { ok: false, error: 'File is empty' };
  }

  const body = await fs.readFile(resolved.resolved);
  const params = new URLSearchParams({
    fileName,
    uploadedBy: 'model',
  });
  const conversationId = typeof rawArgs.conversation_id === 'string' && rawArgs.conversation_id.trim()
    ? rawArgs.conversation_id.trim()
    : auth.conversationId;
  if (conversationId && /^[0-9a-f-]{36}$/i.test(conversationId)) {
    params.set('conversationId', conversationId);
  }

  const endpoint = `${auth.apiRoot.replace(/\/+$/, '')}/gateway/*/upload/stream?${params.toString()}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': mime,
    },
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    return { ok: false, error: text.trim() || `Upload failed (HTTP ${response.status})` };
  }

  return { ok: true, result: text || JSON.stringify({ success: true }) };
}

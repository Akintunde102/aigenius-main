import type { FilePreviewPayload } from '@/app/components/modals/FilePreviewManager';

export function localFileLinkLabel(path: string): string {
  if (!path) return '';
  return path.split(/[/\\]/).pop() || path;
}

export function toLocalFileHref(path: string): string {
  return `local-file://${encodeURIComponent(path)}`;
}

export function toLocalFileMarkdownLink(path: string, label?: string): string {
  if (!path) return '';
  const name = label ?? localFileLinkLabel(path);
  return `[${name}](${toLocalFileHref(path)})`;
}

export function inferLocalFilePreviewType(path: string): FilePreviewPayload['type'] {
  const hasExtension =
    path.includes('.') && !path.endsWith('.') && !path.endsWith('/');
  const ext = hasExtension ? path.split('.').pop()?.toLowerCase() || '' : '';

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  const pdfExts = ['pdf'];
  const videoExts = ['mp4', 'webm', 'ogg'];
  const audioExts = ['mp3', 'wav', 'ogg'];

  if (!hasExtension) return 'folder';
  if (imageExts.includes(ext)) return 'image';
  if (pdfExts.includes(ext)) return 'pdf';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'code';
}

export function buildLocalFilePreviewPayload(
  localPath: string,
  options?: { placement?: FilePreviewPayload['placement'] },
): FilePreviewPayload {
  const type = inferLocalFilePreviewType(localPath);
  const payload: FilePreviewPayload = {
    url: toLocalFileHref(localPath),
    name: localFileLinkLabel(localPath),
    type,
    localPath,
    placement: options?.placement ?? 'modal',
  };
  if (type === 'code') {
    payload.textContent = '// Loading code...';
  }
  return payload;
}

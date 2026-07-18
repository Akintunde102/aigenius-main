import { resolveMarkdownHrefForDesktop } from '@/lib/utils/localPathLinks';

function inferPreviewType(decodedPath: string): 'folder' | 'image' | 'pdf' | 'video' | 'audio' | 'code' {
  const hasExtension = decodedPath.includes('.') && !decodedPath.endsWith('.') && !decodedPath.endsWith('/');
  const ext = hasExtension ? decodedPath.split('.').pop()?.toLowerCase() || '' : '';

  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
  const pdfExts = ['pdf'];
  const videoExts = ['mp4', 'webm', 'ogg'];
  const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];

  if (!hasExtension) return 'folder';
  if (imageExts.includes(ext)) return 'image';
  if (pdfExts.includes(ext)) return 'pdf';
  if (videoExts.includes(ext)) return 'video';
  if (audioExts.includes(ext)) return 'audio';
  return 'code';
}

export function openLocalFilePreviewFromPath(decodedPath: string): void {
  const href = `local-file://${encodeURIComponent(decodedPath)}`;
  const type = inferPreviewType(decodedPath);
  const name = decodedPath.split(/[/\\]/).pop() || decodedPath;

  const triggerPreview = (textContent?: string) => {
    void import('@/app/components/modals/FilePreviewManager').then(({ openFilePreview }) => {
      openFilePreview({
        url: href,
        name,
        type: type as 'folder' | 'image' | 'pdf' | 'video' | 'audio' | 'code',
        localPath: decodedPath,
        textContent,
      });
    });
  };

  if (type === 'code') {
    triggerPreview('// Loading code...');
  } else {
    triggerPreview();
  }
}

export function handleDesktopMarkdownLinkClick(
  href: string,
  event: { preventDefault: () => void; stopPropagation: () => void },
): boolean {
  const resolved = resolveMarkdownHrefForDesktop(href);
  if (resolved.kind === 'local-file') {
    event.preventDefault();
    event.stopPropagation();
    openLocalFilePreviewFromPath(resolved.path);
    return true;
  }
  return false;
}

/**
 * Cross-platform local path → in-app preview links (mirrors frontend localPathLinks).
 */

export function toLocalFileHref(absolutePath: string): string {
  return `local-file://${encodeURIComponent(absolutePath)}`;
}

export function formatLocalPathMarkdownLink(absolutePath: string, label?: string): string {
  const name = label || absolutePath.split(/[/\\]/).pop() || absolutePath;
  return `[${name}](${toLocalFileHref(absolutePath)})`;
}

export function formatPathField(path: string): string {
  return `${formatLocalPathMarkdownLink(path, 'Open')} · \`${path}\``;
}

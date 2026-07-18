/**
 * Markdown links that open local files in the desktop chat preview panel.
 * Protocol is handled by the frontend MarkdownRenderer (`local-file://`).
 */

export function localFileLinkLabel(path: string): string {
  if (!path) return '';
  return path.split(/[\\/]/).pop() || path;
}

/** `[label](local-file://encoded-path)` for tool results and LLM-facing output. */
export function toLocalFileMarkdownLink(path: string, label?: string): string {
  if (!path) return '';
  const name = label ?? localFileLinkLabel(path);
  return `[${name}](local-file://${encodeURIComponent(path)})`;
}

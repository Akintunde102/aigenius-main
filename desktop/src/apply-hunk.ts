/**
 * Apply a single search/replace hunk to file content.
 * `search` must appear exactly once (or `replaceAll` for global replace).
 */
export function applySearchReplaceHunk(
  content: string,
  search: string,
  replace: string,
  replaceAll = false,
): { ok: true; content: string } | { ok: false; error: string } {
  if (!search) {
    return { ok: false, error: 'search must be non-empty' };
  }
  const count = content.split(search).length - 1;
  if (count === 0) {
    return { ok: false, error: 'search text not found in file' };
  }
  if (!replaceAll && count > 1) {
    return {
      ok: false,
      error: `search text appears ${count} times; provide more context or use replace_all`,
    };
  }
  const next = replaceAll
    ? content.split(search).join(replace)
    : content.replace(search, replace);
  return { ok: true, content: next };
}

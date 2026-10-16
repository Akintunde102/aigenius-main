/**
 * Apply a single search/replace hunk to file content.
 * Resilient to CRLF/LF line-ending differences and trailing whitespace variances.
 * Preserves the file's original line endings.
 */

function matchTrimmedLines(
  contentLines: string[],
  searchLines: string[],
): number[] {
  const matchIndices: number[] = [];
  if (searchLines.length === 0 || searchLines.length > contentLines.length) {
    return matchIndices;
  }

  for (let i = 0; i <= contentLines.length - searchLines.length; i++) {
    let matched = true;
    for (let j = 0; j < searchLines.length; j++) {
      if (contentLines[i + j].trimEnd() !== searchLines[j].trimEnd()) {
        matched = false;
        break;
      }
    }
    if (matched) {
      matchIndices.push(i);
    }
  }

  return matchIndices;
}

export function applySearchReplaceHunk(
  content: string,
  search: string,
  replace: string,
  replaceAll = false,
): { ok: true; content: string } | { ok: false; error: string } {
  if (!search) {
    return { ok: false, error: 'search must be non-empty' };
  }

  // Strategy 1: Exact match as-is
  const countExact = content.split(search).length - 1;
  if (countExact === 1 || (replaceAll && countExact > 0)) {
    const next = replaceAll
      ? content.split(search).join(replace)
      : content.replace(search, replace);
    return { ok: true, content: next };
  }

  if (!replaceAll && countExact > 1) {
    return {
      ok: false,
      error: `search text appears ${countExact} times; provide more context or use replace_all`,
    };
  }

  // Strategy 2: EOL-normalized match (\r\n vs \n)
  const isCrlf = content.includes('\r\n');
  const normContent = content.replace(/\r\n/g, '\n');
  const normSearch = search.replace(/\r\n/g, '\n');
  const normReplace = replace.replace(/\r\n/g, '\n');

  const countNorm = normContent.split(normSearch).length - 1;
  if (countNorm === 1 || (replaceAll && countNorm > 0)) {
    const replaced = replaceAll
      ? normContent.split(normSearch).join(normReplace)
      : normContent.replace(normSearch, normReplace);
    const finalContent = isCrlf ? replaced.replace(/\n/g, '\r\n') : replaced;
    return { ok: true, content: finalContent };
  }

  if (!replaceAll && countNorm > 1) {
    return {
      ok: false,
      error: `search text appears ${countNorm} times; provide more context or use replace_all`,
    };
  }

  // Strategy 3: Line-trimmed whitespace tolerant match
  const contentLines = normContent.split('\n');
  const searchLines = normSearch.split('\n');
  const matches = matchTrimmedLines(contentLines, searchLines);

  if (matches.length === 1 || (replaceAll && matches.length > 0)) {
    const replaceLines = normReplace.split('\n');
    let offset = 0;
    const workingLines = [...contentLines];

    for (const matchIndex of matches) {
      const adjustedIndex = matchIndex + offset;
      workingLines.splice(adjustedIndex, searchLines.length, ...replaceLines);
      offset += replaceLines.length - searchLines.length;
      if (!replaceAll) break;
    }

    const replaced = workingLines.join('\n');
    const finalContent = isCrlf ? replaced.replace(/\n/g, '\r\n') : replaced;
    return { ok: true, content: finalContent };
  }

  if (!replaceAll && matches.length > 1) {
    return {
      ok: false,
      error: `search text matches ${matches.length} locations when ignoring trailing whitespace; provide more context or use replace_all`,
    };
  }

  return { ok: false, error: 'search text not found in file' };
}

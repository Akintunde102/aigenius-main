export const DEFAULT_MAX_LINE_CHARS = 2_000;

export type TruncatedLine = {
  text: string;
  truncated: boolean;
};

/** Truncate a single line in place, marking overflow. */
export function truncateLongLine(line: string, maxChars = DEFAULT_MAX_LINE_CHARS): TruncatedLine {
  if (line.length <= maxChars) {
    return { text: line, truncated: false };
  }
  return {
    text: `${line.slice(0, maxChars)}… [line truncated at ${maxChars} chars]`,
    truncated: true,
  };
}

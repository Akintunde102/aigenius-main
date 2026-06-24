export type DiffLineKind = 'header' | 'add' | 'remove' | 'context' | 'hunk' | 'other';

export function classifyDiffLine(line: string): DiffLineKind {
  if (line.startsWith('+++ ') || line.startsWith('--- ')) return 'header';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'remove';
  if (line.startsWith(' ')) return 'context';
  return 'other';
}

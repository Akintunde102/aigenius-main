import { describe, expect, it } from '@jest/globals';
import { buildFileChunks } from './chunk-indexer';

describe('buildFileChunks', () => {
  it('creates symbol-bounded chunks', () => {
    const content = `export function alpha() {
  return 1;
}

export function beta() {
  return 2;
}
`;
    const chunks = buildFileChunks(content, 'ts');
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    expect(chunks[0]?.symbolName).toBe('alpha');
    expect(chunks[1]?.symbolName).toBe('beta');
  });

  it('falls back to windows for large plain text', () => {
    const lines = Array.from({ length: 2000 }, (_, i) => `line ${i} padding text here`).join('\n');
    const chunks = buildFileChunks(lines, 'txt');
    expect(chunks.length).toBeGreaterThan(1);
  });
});

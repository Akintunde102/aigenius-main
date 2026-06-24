import fs from 'fs';
import os from 'os';
import path from 'path';
import { extractText } from '../extractors/text-extractor.js';

describe('text-extractor', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `aigenius-test-${Date.now()}.txt`);
  });

  afterEach(() => {
    try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
  });

  it('returns file content and extension tag', async () => {
    // Arrange
    fs.writeFileSync(tmpFile, 'Hello world');

    // Act
    const { content, tags } = await extractText(tmpFile);

    // Assert
    expect(content).toContain('Hello world');
    expect(tags).toContain('txt');
  });

  it('truncates content over 500 KB', async () => {
    // Arrange — 600 KB of 'a'
    const big = Buffer.alloc(600_000, 'a');
    fs.writeFileSync(tmpFile, big);

    // Act
    const { content } = await extractText(tmpFile);

    // Assert
    expect(content.length).toBeLessThanOrEqual(500_000 + 10); // slight slack for whitespace normalisation
  });

  it('returns empty content for empty file', async () => {
    // Arrange
    fs.writeFileSync(tmpFile, '');

    // Act
    const { content } = await extractText(tmpFile);

    // Assert
    expect(content).toBe('');
  });

  it('derives tag from extension', async () => {
    // Arrange — use .md extension
    const mdFile = tmpFile.replace('.txt', '.md');
    fs.writeFileSync(mdFile, '# Heading');

    try {
      const { tags } = await extractText(mdFile);
      expect(tags).toContain('md');
    } finally {
      try { fs.unlinkSync(mdFile); } catch { /* ignore */ }
    }
  });
});

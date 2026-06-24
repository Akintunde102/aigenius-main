import fs from 'fs';
import path from 'path';
import { StringDecoder } from 'string_decoder';

const MAX_CONTENT_LENGTH = 500_000; // 500 KB of text per file

/** Reads a plain-text file and returns its content (truncated to 500 KB safely). */
export async function extractText(
  filePath: string,
): Promise<{ content: string; tags: string[] }> {
  const fh = await fs.promises.open(filePath, 'r');
  let content: string;
  try {
    const buf = Buffer.allocUnsafe(MAX_CONTENT_LENGTH);
    const { bytesRead } = await fh.read(buf, 0, MAX_CONTENT_LENGTH, 0);

    // StringDecoder handles incomplete UTF-8 at the byte cap
    const decoder = new StringDecoder('utf8');
    content = decoder.write(buf.subarray(0, bytesRead));
    content += decoder.end();
  } finally {
    await fh.close();
  }

  // Normalise whitespace: collapse repeated spaces/newlines
  content = content.replace(/\s{3,}/g, '\n\n').trim();

  // Derive simple tags from file extension and name
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const tags = ext ? [ext] : [];

  return { content, tags };
}

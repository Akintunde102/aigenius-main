import mammoth from 'mammoth';

/** Extracts raw text from a .docx file using mammoth. */
export async function extractDocx(
  filePath: string,
): Promise<{ content: string; tags: string[] }> {
  const { value: content } = await mammoth.extractRawText({ path: filePath });
  return { content: content.trim(), tags: ['docx', 'word'] };
}

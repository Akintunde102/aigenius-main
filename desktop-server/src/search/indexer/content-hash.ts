import crypto from 'crypto';

/** SHA-256 fingerprint of file contents for skip-if-unchanged indexing. */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

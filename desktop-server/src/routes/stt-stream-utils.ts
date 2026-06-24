import fs from 'fs';

/** Minimum bytes before attempting partial/final stream STT (fragmented WebM needs a header + data). */
export const MIN_STREAM_TRANSCRIBE_BYTES = 2048;

const EBML_MAGIC = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);

export function isLikelyValidStreamWebm(filePath: string): boolean {
  try {
    const { size } = fs.statSync(filePath);
    if (size < MIN_STREAM_TRANSCRIBE_BYTES) return false;
    const fd = fs.openSync(filePath, 'r');
    try {
      const head = Buffer.alloc(4);
      fs.readSync(fd, head, 0, 4, 0);
      return head.equals(EBML_MAGIC);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return false;
  }
}

/** Copy the live stream file so concurrent chunk appends cannot corrupt an in-flight transcribe. */
export function snapshotStreamFile(inputPath: string): string | null {
  if (!isLikelyValidStreamWebm(inputPath)) return null;
  const snap = `${inputPath}.snap.${Date.now()}.webm`;
  fs.copyFileSync(inputPath, snap);
  return snap;
}

export function unlinkIfExists(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* ignore */
  }
}

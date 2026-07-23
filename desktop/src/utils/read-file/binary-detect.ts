import fs from 'fs/promises';

const PROBE_BYTES = 8192;

/** Returns true when the file appears to be binary (null byte in first probe). */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  const fh = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(PROBE_BYTES);
    const { bytesRead } = await fh.read(buf, 0, PROBE_BYTES, 0);
    if (bytesRead === 0) return false;
    return buf.subarray(0, bytesRead).includes(0);
  } finally {
    await fh.close();
  }
}

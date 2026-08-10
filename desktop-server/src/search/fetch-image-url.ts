import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import { imageExtensionFromPath, isImageExtension } from './image-extensions.js';

const MAX_BYTES = 15 * 1024 * 1024;
const TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;

const CONTENT_TYPE_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/tiff': 'tiff',
  'image/gif': 'gif',
  'image/heic': 'heic',
  'image/heif': 'heif',
};

function isPrivateHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local')) return true;
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true;

  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;
  const parts = ipv4.slice(1).map(Number);
  if (parts.some((p) => p > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function validateImageUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('Only http(s) image URLs are supported');
  }
  if (isPrivateHostname(parsed.hostname)) {
    throw new Error('Private or local network URLs are not allowed');
  }
  return parsed;
}

function sniffImageExt(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'png';
  }
  if (buf.length >= 12 && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  if (buf.length >= 2 && buf[0] === 0x42 && buf[1] === 0x4d) return 'bmp';
  if (
    (buf.length >= 4 && (buf.subarray(0, 4).toString('ascii') === 'II*\0' || buf.subarray(0, 4).toString('ascii') === 'MM\0*'))
    || (buf.length >= 2 && (buf[0] === 0x49 && buf[1] === 0x49) || (buf[0] === 0x4d && buf[1] === 0x4d))
  ) {
    return 'tiff';
  }
  if (buf.length >= 6 && (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a')) {
    return 'gif';
  }
  if (buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buf.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.startsWith('hei') || brand === 'mif1' || brand === 'msf1') return 'heic';
  }
  return null;
}

function resolveExtension(contentType: string | null, url: URL, bytes: Buffer): string {
  const fromUrl = imageExtensionFromPath(url.pathname);
  if (isImageExtension(fromUrl)) return fromUrl;

  if (contentType) {
    const base = contentType.split(';')[0].trim().toLowerCase();
    const mapped = CONTENT_TYPE_EXT[base];
    if (mapped) return mapped;
  }

  const sniffed = sniffImageExt(bytes);
  if (sniffed) return sniffed;

  throw new Error('Response is not a recognized image format');
}

async function fetchWithRedirects(startUrl: URL): Promise<{ bytes: Buffer; contentType: string | null; finalUrl: URL }> {
  let current = startUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'image/*' },
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) throw new Error(`Redirect ${res.status} without Location header`);
        const next = new URL(location, current);
        validateImageUrl(next.toString());
        current = next;
        continue;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} fetching image`);
      }

      const contentType = res.headers.get('content-type');
      if (contentType && !contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`Expected image/* content-type, got ${contentType.split(';')[0]}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Empty response body');

      const chunks: Uint8Array[] = [];
      let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.byteLength;
        if (total > MAX_BYTES) {
          throw new Error(`Image exceeds ${MAX_BYTES} byte limit`);
        }
        chunks.push(value);
      }

      const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));
      if (bytes.length === 0) throw new Error('Empty image response');
      if (!contentType) {
        const sniffed = sniffImageExt(bytes);
        if (!sniffed) throw new Error('Response is not a recognized image format');
      }

      return { bytes, contentType, finalUrl: current };
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Too many redirects');
}

export type FetchedImageTemp = {
  filePath: string;
  url: string;
  extension: string;
  cleanup: () => Promise<void>;
};

/** Download an https/http image to a temp file for on-device analysis. */
export async function fetchImageToTempFile(rawUrl: string): Promise<FetchedImageTemp> {
  const startUrl = validateImageUrl(rawUrl);
  const { bytes, contentType, finalUrl } = await fetchWithRedirects(startUrl);
  const extension = resolveExtension(contentType, finalUrl, bytes);

  const filePath = path.join(
    os.tmpdir(),
    `aigenius-read-image-${randomBytes(8).toString('hex')}.${extension}`,
  );
  await fs.writeFile(filePath, bytes);

  return {
    filePath,
    url: finalUrl.toString(),
    extension,
    cleanup: async () => {
      await fs.unlink(filePath).catch(() => undefined);
    },
  };
}

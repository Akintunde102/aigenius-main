/** Process env reads for the desktop HTTP server (read once at import). */

/**
 * The Python voice sidecar inherits `process.env` from this process. STT-related examples:
 * - `AIGENIUS_STT_BACKEND`: `auto` (default: whisper.cpp when CLI+weights exist, else faster_whisper), `whisper_cpp`, or `faster_whisper`
 * - `WHISPER_CPP_CLI`, `WHISPER_CPP_MODEL`, `WHISPER_CPP_MODEL_DIR`, `WHISPER_CPP_THREADS`
 */

export const serverPort = parseInt(process.env.PORT ?? '8001', 10);
export const serverHostname = process.env.HOST ?? 'localhost';
export const upstreamApiUrl = process.env.AIGENIUS_UPSTREAM_API_URL ?? 'http://localhost:8000';

/** Required for `/search/*` when mounted with bearer middleware. */
export const aigeniusSecretToken = process.env.AIGENIUS_SECRET_TOKEN;

/** Comma-separated origins; default matches Electron dev UI (Tilt: 23001, legacy Next: 3001). */
export function corsAllowedOrigins(): string[] {
  const raw = process.env.AIGENIUS_DESKTOP_CORS_ORIGINS;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  const webPort = process.env.DEV_WEB_PORT ?? process.env.AIGENIUS_FRONTEND_PORT ?? '23001';
  return [
    `http://localhost:${webPort}`,
    `http://127.0.0.1:${webPort}`,
  ];
}

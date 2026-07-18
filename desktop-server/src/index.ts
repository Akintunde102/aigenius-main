import { serve } from '@hono/node-server';
import path from 'path';
import os from 'os';
import { registerSearchModule } from './search/index.js';
import { startVoiceSidecar } from './sidecar/index.js';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { serverHostname, serverPort, upstreamApiUrl } from './config/server-env.js';
import { registerAudioGateway } from './sidecar/audio.gateway.js';

const app = createApp();

/** Yield so pending HTTP (e.g. Electron /health) can run before sync work. */
function yieldEventLoop(ms = 0): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const server = serve(
  {
    fetch: app.fetch,
    port: serverPort,
    hostname: serverHostname,
  },
  (info) => {
    console.info(
      `[aigenius-desktop-server] http://${info.address}:${info.port} -> ${upstreamApiUrl}`,
    );

    // Do not run heavy init inline in the listen callback — sync search setup blocks
    // the event loop and Electron's waitForHttpOk times out on /health.
    void bootstrapAfterListen();
  },
);

function initSearchModule(): void {
  const dbPath = process.env.AIGENIUS_DB_PATH;

  if (!dbPath) {
    console.info('[aigenius-desktop-server] AIGENIUS_DB_PATH not set; search module skipped.');
    return;
  }

  console.info('[aigenius-desktop-server] Initialising search module...');
  try {
    const watchPathsRaw = process.env.AIGENIUS_SEARCH_WATCH_PATHS;
    const watchPaths = watchPathsRaw
      ? watchPathsRaw.split(',').map((p) => p.trim())
      : [os.homedir()];

    const modelsDir =
      process.env.AIGENIUS_MODELS_DIR ??
      path.join(process.cwd(), 'dist', 'search', 'models');

    registerSearchModule({
      watchPaths,
      dbPath,
      modelsDir,
      workerCount: parseInt(process.env.AIGENIUS_SEARCH_WORKERS ?? '4', 10),
      skipImageSearch: process.env.AIGENIUS_SEARCH_IMAGES !== '1',
    });
    console.info('[aigenius-desktop-server] Search module ready.');
  } catch (err) {
    console.error('[aigenius-desktop-server] Search module init failed:', err);
  }
}

async function bootstrapAfterListen(): Promise<void> {
  // Let /health answer before anything heavier runs.
  await yieldEventLoop(0);

  const io = new Server(server as any, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  registerAudioGateway(io);
  console.info('[aigenius-desktop-server] Audio Socket Gateway initialized.');

  if (process.env.AIGENIUS_ENABLE_TTS !== '0') {
    console.info('[aigenius-desktop-server] Initialising PocketTTS sidecar...');
    try {
      await startVoiceSidecar();
      console.info('[aigenius-desktop-server] PocketTTS sidecar ready.');
    } catch (err) {
      console.error('[aigenius-desktop-server] PocketTTS sidecar init failed:', err);
      console.error('[aigenius-desktop-server] TTS will fall back to Groq.');
    }
  } else {
    console.info('[aigenius-desktop-server] PocketTTS disabled via AIGENIUS_ENABLE_TTS=0');
  }

  // Schedule sync search init after a delay so Electron can pass waitForHttpOk.
  // registerSearchModule is CPU/IO heavy and blocks the event loop while it runs.
  const searchDelayMs = parseInt(process.env.AIGENIUS_SEARCH_INIT_DELAY_MS ?? '3000', 10);
  setTimeout(() => {
    initSearchModule();
  }, Number.isFinite(searchDelayMs) ? Math.max(0, searchDelayMs) : 3000);

  const { OllamaRelayClient } = await import('./sidecar/ollama-relay.client.js');
  OllamaRelayClient.getInstance().startOllamaServer().catch((err) => {
    console.error('[aigenius-desktop-server] Ollama autostart error:', err);
  });
}

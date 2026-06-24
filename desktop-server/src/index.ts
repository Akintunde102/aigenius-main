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

const server = serve(
  {
    fetch: app.fetch,
    port: serverPort,
    hostname: serverHostname,
  },
  async (info) => {
    console.info(
      `[aigenius-desktop-server] http://${info.address}:${info.port} -> ${upstreamApiUrl}`,
    );

    const dbPath = process.env.AIGENIUS_DB_PATH;

    if (dbPath) {
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
    } else {
      console.info('[aigenius-desktop-server] AIGENIUS_DB_PATH not set; search module skipped.');
    }

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

    // Initialize Socket.io for local conversational mode
    const io = new Server(server as any, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });
    registerAudioGateway(io);
    console.info('[aigenius-desktop-server] Audio Socket Gateway initialized.');

    // Autostart local Ollama server if installed
    const { OllamaRelayClient } = await import('./sidecar/ollama-relay.client.js');
    OllamaRelayClient.getInstance().startOllamaServer().catch((err) => {
      console.error('[aigenius-desktop-server] Ollama autostart error:', err);
    });
  },
);

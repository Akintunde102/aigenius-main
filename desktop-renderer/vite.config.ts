import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

const repoRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(repoRoot, 'frontend');
const frontendSrc = path.join(frontendRoot, 'src');
const shims = path.resolve(__dirname, 'src/shims');

export default defineConfig({
  root: __dirname,
  publicDir: path.join(frontendRoot, 'public'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': frontendSrc,
      '@shared': path.join(frontendSrc, 'shared'),
      'next/navigation': path.join(shims, 'next-navigation.ts'),
      'next/dynamic': path.join(shims, 'next-dynamic.tsx'),
      'next/link': path.join(shims, 'next-link.tsx'),
      'next/image': path.join(shims, 'next-image.tsx'),
      'next/font/local': path.join(shims, 'next-font-local.ts'),
      'next/script': path.join(shims, 'next-script.tsx'),
      'next/document': path.join(shims, 'next-document.tsx'),
    },
    dedupe: ['react', 'react-dom'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ['legacy-js-api'],
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/monaco-editor') || id.includes('@monaco-editor')) {
            return 'monaco';
          }
          if (id.includes('node_modules/@codemirror')) {
            return 'codemirror';
          }
        },
      },
    },
  },
  server: {
    port: 23001,
    strictPort: false,
    fs: {
      allow: [repoRoot],
    },
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL ?? 'http://127.0.0.1:8001',
    ),
    'process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL ?? '',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_AUDIO_CONVERSATION': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_AUDIO_CONVERSATION ?? '',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_INTEGRATIONS': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_INTEGRATIONS ?? '',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_WORKFLOWS': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_WORKFLOWS ?? '',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH ?? '',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH ?? 'true',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH ?? '',
    ),
    'process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN': JSON.stringify(
      process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN ?? '',
    ),
    'process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID': JSON.stringify(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '',
    ),
    'process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI': JSON.stringify(
      process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI ?? '',
    ),
    'process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL ?? '/auth/google',
    ),
    'process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL': JSON.stringify(
      process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL ?? '/auth/google/callback',
    ),
    'process.env.NEXT_PUBLIC_MINI_SERVER_PORT': JSON.stringify(
      process.env.NEXT_PUBLIC_MINI_SERVER_PORT ?? '8001',
    ),
    'process.env.NEXT_PUBLIC_DESKTOP_SIDECAR_PORT': JSON.stringify(
      process.env.NEXT_PUBLIC_DESKTOP_SIDECAR_PORT ?? '8001',
    ),
    'process.env.NEXT_PUBLIC_GATEWAY_FETCH_MAX_RETRIES': JSON.stringify(
      process.env.NEXT_PUBLIC_GATEWAY_FETCH_MAX_RETRIES ?? '',
    ),
    'process.env.NEXT_PUBLIC_MULTI_CHAT_SYNC_TABS': JSON.stringify(
      process.env.NEXT_PUBLIC_MULTI_CHAT_SYNC_TABS ?? '',
    ),
    'process.env.NEXT_PUBLIC_CLEAR_CACHE_ON_RELOAD': JSON.stringify(
      process.env.NEXT_PUBLIC_CLEAR_CACHE_ON_RELOAD ?? '',
    ),
    'process.env.NEXT_PUBLIC_AIGENIUS_VOICE_OBS': JSON.stringify(
      process.env.NEXT_PUBLIC_AIGENIUS_VOICE_OBS ?? '',
    ),
    'process.env.NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET': JSON.stringify(
      process.env.NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET ?? '',
    ),
  },
});

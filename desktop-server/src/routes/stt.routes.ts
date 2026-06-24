import path from 'path';
import os from 'os';
import fs from 'fs';
import { Hono } from 'hono';
import { getVoiceSidecar } from '../sidecar/index.js';
import { voiceObs } from '../utils/voice-obs.js';
import { clientError, handleRoute } from '../utils/route-json.js';
import {
  isLikelyValidStreamWebm,
  snapshotStreamFile,
  unlinkIfExists,
} from './stt-stream-utils.js';

/** Active streaming sessions: sessionId → accumulated audio file path. */
const activeSttSessions = new Map<string, string>();

/** Per HTTP STT session: monotonic chunk index for chronological ordering in logs. */
const sttChunkSeqBySession = new Map<string, number>();

function nextSttChunkSeq(sessionId: string): number {
  const next = (sttChunkSeqBySession.get(sessionId) ?? 0) + 1;
  sttChunkSeqBySession.set(sessionId, next);
  return next;
}

export function createSttRoutes(): Hono {
  const r = new Hono();

  r.post('/stream/start', (c) =>
    handleRoute(c, '[stt] POST /stt/stream/start', async () => {
      const sessionId = Math.random().toString(36).substring(2, 15);
      const tempDir = path.join(os.tmpdir(), 'aigenius-stt');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const inputPath = path.join(tempDir, `stream_${sessionId}_${Date.now()}.webm`);

      fs.writeFileSync(inputPath, Buffer.alloc(0));
      activeSttSessions.set(sessionId, inputPath);
      voiceObs('stream_start', { sessionId, pathTail: path.basename(inputPath) });

      return c.json({ sessionId });
    }),
  );

  r.post('/stream/chunk', (c) =>
    handleRoute(c, '[stt] POST /stt/stream/chunk', async () => {
      const sessionId = c.req.header('X-Session-ID');
      if (!sessionId || !activeSttSessions.has(sessionId)) {
        return clientError(c, 'Invalid or missing session ID', 400);
      }

      const inputPath = activeSttSessions.get(sessionId)!;
      const chunk = await c.req.arrayBuffer();

      fs.appendFileSync(inputPath, Buffer.from(chunk));
      let fileBytes = 0;
      try {
        fileBytes = fs.statSync(inputPath).size;
      } catch {
        /* ignore */
      }
      voiceObs('stream_chunk', {
        sessionId,
        chunkSeq: nextSttChunkSeq(sessionId),
        chunkBytes: chunk.byteLength,
        fileBytes,
      });

      return c.json({ ok: true });
    }),
  );

  r.post('/stream/transcribe', (c) =>
    handleRoute(c, '[stt] POST /stt/stream/transcribe', async () => {
      const sessionId = c.req.header('X-Session-ID');
      const { model_size: modelSize = 'base', beam_size: beamSize = 5 } = await c.req.json().catch(() => ({}));

      if (!sessionId || !activeSttSessions.has(sessionId)) {
        return clientError(c, 'Invalid or missing session ID', 400);
      }

      const inputPath = activeSttSessions.get(sessionId)!;
      let fileBytes = 0;
      try {
        fileBytes = fs.statSync(inputPath).size;
      } catch {
        /* ignore */
      }
      voiceObs('stream_transcribe', { sessionId, fileBytes, beamSize: Number(beamSize) });

      if (!isLikelyValidStreamWebm(inputPath)) {
        voiceObs('stream_transcribe_skip', { sessionId, fileBytes, reason: 'invalid_or_too_small' });
        return c.json({ text: '' });
      }

      const sidecar = getVoiceSidecar();

      if (!sidecar.isReady()) {
        return clientError(c, 'STT service not ready', 503);
      }

      const snapshotPath = snapshotStreamFile(inputPath);
      if (!snapshotPath) {
        voiceObs('stream_transcribe_skip', { sessionId, fileBytes, reason: 'snapshot_failed' });
        return c.json({ text: '' });
      }

      try {
        const result = await sidecar.transcribe({
          audioPath: snapshotPath,
          modelSize: modelSize as string,
          beamSize: Number(beamSize),
        });

        if (!result.success || result.text === undefined) {
          voiceObs('stream_transcribe_error', { sessionId, error: result.error ?? 'unknown' });
          return c.json({ error: result.error || 'STT transcription failed' }, 500);
        }

        voiceObs('stream_transcribe_ok', { sessionId, textChars: (result.text ?? '').length });
        return c.json({ text: result.text });
      } finally {
        unlinkIfExists(snapshotPath);
      }
    }),
  );

  r.post('/stream/end', (c) =>
    handleRoute(c, '[stt] POST /stt/stream/end', async () => {
      const sessionId = c.req.header('X-Session-ID');
      if (!sessionId || !activeSttSessions.has(sessionId)) {
        return clientError(c, 'Invalid session ID', 400);
      }

      const inputPath = activeSttSessions.get(sessionId)!;
      activeSttSessions.delete(sessionId);
      sttChunkSeqBySession.delete(sessionId);
      voiceObs('stream_end', { sessionId, pathTail: path.basename(inputPath) });

      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      } catch (e) {
        console.warn('[stt] POST /stt/stream/end: session file cleanup failed:', e);
      }

      return c.json({ ok: true });
    }),
  );

  r.get('/status', (c) =>
    handleRoute(c, '[stt] GET /stt/status', async () => {
      const sidecar = getVoiceSidecar();
      return c.json({ ready: sidecar.isReady() });
    }),
  );

  r.post('/transcribe', (c) =>
    handleRoute(c, '[stt] POST /stt/transcribe', async () => {
      const body = await c.req.parseBody();
      const file = body.file as File | Blob;
      const modelSize = (body.model_size as string) || 'base';
      const beamSize = parseInt(body.beam_size as string, 10) || 5;

      if (!file) {
        return clientError(c, 'Audio file is required', 400);
      }

      const sidecar = getVoiceSidecar();
      if (!sidecar.isReady()) {
        return clientError(c, 'STT service not ready', 503);
      }

      const tempDir = path.join(os.tmpdir(), 'aigenius-stt');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const arrayBuffer = await file.arrayBuffer();
      const bytes = Buffer.from(arrayBuffer);
      const isWav =
        bytes.length >= 4 &&
        bytes[0] === 0x52 &&
        bytes[1] === 0x49 &&
        bytes[2] === 0x46 &&
        bytes[3] === 0x46;
      const inputPath = path.join(tempDir, `stt_${Date.now()}${isWav ? '.wav' : '.webm'}`);
      fs.writeFileSync(inputPath, bytes);

      try {
        const result = await sidecar.transcribe({
          audioPath: inputPath,
          modelSize,
          beamSize,
        });

        if (!result.success || result.text === undefined) {
          return c.json({ error: result.error || 'STT transcription failed' }, 500);
        }

        return c.json({ text: result.text });
      } finally {
        try {
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        } catch (e) {
          console.warn('[stt] POST /stt/transcribe: temp file cleanup failed:', e);
        }
      }
    }),
  );

  return r;
}

import { Server, Socket } from 'socket.io';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { defaultTtsVoice } from '../config/voice-env.js';
import { getVoiceSidecar } from './index.js';

const MIN_PARTIAL_BYTES = 2048;

/** Pick a temp extension that matches buffer magic (VAD finalize sends WAV, chunks are WebM). */
function sttTempExtension(buffer: Buffer): string {
  if (buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return '.wav';
  }
  if (buffer.length >= 4 && buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return '.webm';
  }
  return '.webm';
}

/** Active audio buffers per client for local conversational mode. */
const audioBuffers = new Map<string, Buffer[]>();
/** Map of sessionId -> temp file path for the active local session. */
const activeSessionFiles = new Map<string, string>();
/** Track temp files for cleanup */
const tempFiles = new Set<string>();

// Cleanup temp files periodically
setInterval(() => {
  const tempDirs = [
    path.join(os.tmpdir(), 'aigenius-stt'),
    path.join(os.tmpdir(), 'aigenius-tts')
  ];
  
  for (const tempDir of tempDirs) {
    try {
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        
        for (const file of files) {
          const filePath = path.join(tempDir, file);
          const stats = fs.statSync(filePath);
          
          // Delete files older than 1 hour
          if (now - stats.mtime.getTime() > 3600000) {
            fs.unlinkSync(filePath);
            tempFiles.delete(filePath);
            console.log(`[audio-gateway] Cleaned up old temp file: ${filePath}`);
          }
        }
      }
    } catch (err) {
      console.warn(`[audio-gateway] Temp cleanup error:`, err);
    }
  }
}, 300000); // Every 5 minutes

function cleanupTempFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      tempFiles.delete(filePath);
    }
  } catch (err) {
    console.warn(`[audio-gateway] Failed to cleanup temp file ${filePath}:`, err);
  }
}

/** Promise chains to serialize heavy transcription & synthesis tasks per client socket. */
const transcribeChainByClient = new Map<string, Promise<void>>();
const synthesizeChainByClient = new Map<string, Promise<void>>();
/** Generation epochs per client to govern robust user interruptions. */
const clientEpochs = new Map<string, number>();

function enqueueTranscriptionWork(clientId: string, work: () => Promise<void>) {
  const prev = transcribeChainByClient.get(clientId) ?? Promise.resolve();
  const next = prev.then(() => work()).catch((err) => {
    console.warn(`[audio-gateway] Transcription queue error for ${clientId}:`, err?.message ?? err);
  });
  transcribeChainByClient.set(clientId, next);
}

function enqueueSynthesizeWork(clientId: string, work: () => Promise<void>) {
  const prev = synthesizeChainByClient.get(clientId) ?? Promise.resolve();
  const next = prev.then(() => work()).catch((err) => {
    console.warn(`[audio-gateway] Synthesis queue error for ${clientId}:`, err?.message ?? err);
  });
  synthesizeChainByClient.set(clientId, next);
}

/** 
 * Simple local Audio Gateway for desktop conversational mode.
 * Mirrors the cloud backend's AudioGateway but uses the local Python sidecar.
 */
export function registerAudioGateway(io: Server) {
  io.of('/audio').on('connection', (socket: Socket) => {
    const clientId = socket.id;
    console.log(`[audio-gateway] Client connected: ${clientId}`);
    audioBuffers.set(clientId, []);

    socket.on('disconnect', () => {
      console.log(`[audio-gateway] Client disconnected: ${clientId}`);
      audioBuffers.delete(clientId);
      transcribeChainByClient.delete(clientId);
      synthesizeChainByClient.delete(clientId);
      clientEpochs.delete(clientId);
      const sessionPath = activeSessionFiles.get(clientId);
      if (sessionPath) {
        try {
          if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
        } catch { /* ignore */ }
        activeSessionFiles.delete(clientId);
      }
    });

    socket.on('audio:chunk', (chunk: ArrayBuffer | Buffer) => {
      const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      const buffer = audioBuffers.get(clientId);
      if (buffer) {
        buffer.push(data);
        
        // Prevent memory leaks from excessive buffering
        const totalSize = buffer.reduce((sum, buf) => sum + buf.length, 0);
        const MAX_BUFFER_SIZE = 50 * 1024 * 1024; // 50MB limit
        
        if (totalSize > MAX_BUFFER_SIZE) {
          console.warn(`[audio-gateway] Buffer size exceeded for client ${clientId}, clearing oldest chunks`);
          // Keep only the last 75% of chunks
          const keepCount = Math.floor(buffer.length * 0.75);
          buffer.splice(0, buffer.length - keepCount);
        }
      }
    });

    socket.on('audio:partialFlush', () => {
      enqueueTranscriptionWork(clientId, async () => {
        const chunks = audioBuffers.get(clientId);
        if (!chunks?.length) {
          socket.emit('audio:partialIdle');
          return;
        }

        const snapshot = Buffer.concat(chunks);
        if (snapshot.length < MIN_PARTIAL_BYTES) {
          socket.emit('audio:partialIdle');
          return;
        }

        try {
          socket.emit('audio:status', { status: 'transcribing_partial' });
          
          // Write snapshot to a temp file for the sidecar
          const partialExt = sttTempExtension(snapshot);
          const tempPath = path.join(os.tmpdir(), 'aigenius-stt', `partial_${clientId}_${Date.now()}${partialExt}`);
          if (!fs.existsSync(path.dirname(tempPath))) fs.mkdirSync(path.dirname(tempPath), { recursive: true });
          fs.writeFileSync(tempPath, snapshot);
          tempFiles.add(tempPath);

          const sidecar = getVoiceSidecar();
          const result = await sidecar.transcribe({
            audioPath: tempPath,
            modelSize: 'base',
            beamSize: 1, // Fast partial
          });

          // Cleanup temp file
          cleanupTempFile(tempPath);

          if (result.success && result.text?.trim()) {
            socket.emit('audio:transcription', { text: result.text, partial: true });
          }
        } catch (err: any) {
          console.error(`[audio-gateway] Partial transcription failed: ${err.message}`);
        } finally {
          socket.emit('audio:partialIdle');
        }
      });
    });

    socket.on('audio:finalize', (finalBuffer?: any) => {
      enqueueTranscriptionWork(clientId, async () => {
        let completeBuffer: Buffer;

        if (finalBuffer) {
          completeBuffer = Buffer.isBuffer(finalBuffer) ? finalBuffer : Buffer.from(finalBuffer);
          audioBuffers.set(clientId, []);
        } else {
          const chunks = audioBuffers.get(clientId);
          if (!chunks || chunks.length === 0) {
            console.warn(`[audio-gateway] Finalize called but no chunks for client ${clientId}`);
            socket.emit('audio:transcription', { text: '', partial: false });
            return;
          }
          completeBuffer = Buffer.concat(chunks);
          audioBuffers.set(clientId, []); // Clear for next turn
        }

        try {
          socket.emit('audio:status', { status: 'transcribing' });
          
          const finalizeExt = sttTempExtension(completeBuffer);
          const tempPath = path.join(os.tmpdir(), 'aigenius-stt', `finalize_${clientId}_${Date.now()}${finalizeExt}`);
          if (!fs.existsSync(path.dirname(tempPath))) fs.mkdirSync(path.dirname(tempPath), { recursive: true });
          fs.writeFileSync(tempPath, completeBuffer);

          const sidecar = getVoiceSidecar();
          const result = await sidecar.transcribe({
            audioPath: tempPath,
            modelSize: 'base',
            beamSize: 5, // High quality for final
          });

          // Cleanup temp file
          try { if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath); } catch { /* ignore */ }

          if (result.success) {
            socket.emit('audio:transcription', { text: result.text, partial: false });
          } else {
            socket.emit('audio:error', { message: result.error || 'Transcription failed' });
          }
        } catch (err: any) {
          console.error(`[audio-gateway] Transcription failed: ${err.message}`);
          socket.emit('audio:error', { message: 'Transcription failed' });
        }
      });
    });

    socket.on('audio:interrupt', () => {
      const nextEpoch = (clientEpochs.get(clientId) ?? 0) + 1;
      clientEpochs.set(clientId, nextEpoch);

      // Purge active synthesis tasks
      synthesizeChainByClient.delete(clientId);

      console.log(`[audio-gateway] Client ${clientId} interrupted. Generation epoch bumped to ${nextEpoch}`);
      socket.emit('audio:status', { status: 'idle' });
    });

    socket.on('audio:synthesize', (data: { text: string; voice?: string }) => {
      const requestEpoch = clientEpochs.get(clientId) ?? 0;

      enqueueSynthesizeWork(clientId, async () => {
        // Drop synthesis task if an interrupt arrived while this sat in queue
        if ((clientEpochs.get(clientId) ?? 0) !== requestEpoch) {
          console.log(`[audio-gateway] Synthesis skipped for client ${clientId} (stale epoch: ${requestEpoch})`);
          return;
        }

        try {
          socket.emit('audio:status', { status: 'synthesizing' });
          
          const tempPath = path.join(os.tmpdir(), 'aigenius-tts', `synth_${clientId}_${Date.now()}.wav`);
          if (!fs.existsSync(path.dirname(tempPath))) fs.mkdirSync(path.dirname(tempPath), { recursive: true });

          const sidecar = getVoiceSidecar();
          const result = await sidecar.generate({
            text: data.text,
            voice: data.voice || defaultTtsVoice,
            outputPath: tempPath,
          });

          // Check if interrupted during synthesis
          if ((clientEpochs.get(clientId) ?? 0) !== requestEpoch) {
            console.log(`[audio-gateway] Post-synthesis execution discarded for client ${clientId} (interrupted during synthesis)`);
            try { if (result.path && fs.existsSync(result.path)) fs.unlinkSync(result.path); } catch { /* ignore */ }
            return;
          }

          if (result.success && result.path) {
            const audioBuffer = fs.readFileSync(result.path);
            socket.emit('audio:data', audioBuffer);
            socket.emit('audio:text', { text: data.text });
            
            // Cleanup
            try { if (fs.existsSync(result.path)) fs.unlinkSync(result.path); } catch { /* ignore */ }
          } else {
            socket.emit('audio:error', { message: result.error || 'Synthesis failed' });
          }
        } catch (err: any) {
          console.error(`[audio-gateway] Synthesis failed: ${err.message}`);
          socket.emit('audio:error', { message: 'Synthesis failed' });
        }
      });
    });
  });
}

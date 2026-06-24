import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

/**
 * Audio Recorder IPC Handler
 * Handles saving audio files from renderer process to prevent crashes
 */

interface SaveAudioPayload {
  audioBuffer: number[]; // Float32Array converted to regular array for IPC
  sampleRate: number;
  fileName?: string;
}

/**
 * Convert Float32Array audio buffer to WAV format
 * This runs in the main process to avoid renderer crashes
 */
function encodeWAV(samples: Float32Array, sampleRate: number): Buffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  // WAV Header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);

  // Write PCM samples
  floatTo16BitPCM(view, 44, samples);

  return Buffer.from(buffer);
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

/**
 * Register audio recording IPC handlers
 */
export function registerAudioRecorderHandlers(): void {
  // Save audio file with dialog
  ipcMain.handle('audio:save-with-dialog', async (_event, payload: SaveAudioPayload) => {
    try {
      const { audioBuffer, sampleRate, fileName } = payload;

      // Show save dialog
      const result = await dialog.showSaveDialog({
        title: 'Save Audio Recording',
        defaultPath: fileName || `recording-${Date.now()}.wav`,
        filters: [
          { name: 'WAV Audio', extensions: ['wav'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || !result.filePath) {
        return { ok: false as const, error: 'cancelled' };
      }

      // Convert array back to Float32Array
      const samples = new Float32Array(audioBuffer);

      // Encode to WAV
      const wavBuffer = encodeWAV(samples, sampleRate);

      // Write to file
      await fs.writeFile(result.filePath, wavBuffer);

      return {
        ok: true as const,
        filePath: result.filePath,
      };
    } catch (error) {
      console.error('[audio:save-with-dialog] Error:', error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  });

  // Save audio file to specific path
  ipcMain.handle('audio:save-to-path', async (_event, payload: SaveAudioPayload & { filePath: string }) => {
    try {
      const { audioBuffer, sampleRate, filePath } = payload;

      // Validate path
      if (!filePath || typeof filePath !== 'string') {
        return { ok: false as const, error: 'invalid path' };
      }

      // Ensure directory exists
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Convert array back to Float32Array
      const samples = new Float32Array(audioBuffer);

      // Encode to WAV
      const wavBuffer = encodeWAV(samples, sampleRate);

      // Write to file
      await fs.writeFile(filePath, wavBuffer);

      return {
        ok: true as const,
        filePath,
      };
    } catch (error) {
      console.error('[audio:save-to-path] Error:', error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  });
}

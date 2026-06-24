/**
 * Audio Recorder Preload Script
 * Exposes safe audio recording APIs to renderer process
 */

import { contextBridge, ipcRenderer } from 'electron';

export interface AudioRecorderAPI {
  saveWithDialog: (audioBuffer: Float32Array, sampleRate: number, fileName?: string) => Promise<{
    ok: true;
    filePath: string;
  } | {
    ok: false;
    error: string;
  }>;
  
  saveToPath: (audioBuffer: Float32Array, sampleRate: number, filePath: string) => Promise<{
    ok: true;
    filePath: string;
  } | {
    ok: false;
    error: string;
  }>;
}

/**
 * Expose audio recorder API to renderer
 */
export function exposeAudioRecorderAPI(): void {
  contextBridge.exposeInMainWorld('audioRecorder', {
    saveWithDialog: async (audioBuffer: Float32Array, sampleRate: number, fileName?: string) => {
      // Convert Float32Array to regular array for IPC serialization
      const audioArray = Array.from(audioBuffer);
      return ipcRenderer.invoke('audio:save-with-dialog', {
        audioBuffer: audioArray,
        sampleRate,
        fileName,
      });
    },
    
    saveToPath: async (audioBuffer: Float32Array, sampleRate: number, filePath: string) => {
      // Convert Float32Array to regular array for IPC serialization
      const audioArray = Array.from(audioBuffer);
      return ipcRenderer.invoke('audio:save-to-path', {
        audioBuffer: audioArray,
        sampleRate,
        filePath,
      });
    },
  } as AudioRecorderAPI);
}

// Type declaration for TypeScript
declare global {
  interface Window {
    audioRecorder: AudioRecorderAPI;
  }
}

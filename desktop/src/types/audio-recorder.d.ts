/**
 * Type definitions for Audio Recorder API
 */

export interface AudioRecorderAPI {
  /**
   * Save audio recording with a file dialog
   * @param audioBuffer - Float32Array containing audio samples
   * @param sampleRate - Sample rate of the audio (e.g., 44100, 48000)
   * @param fileName - Optional default filename
   * @returns Promise with result containing file path or error
   */
  saveWithDialog(
    audioBuffer: Float32Array,
    sampleRate: number,
    fileName?: string
  ): Promise<
    | { ok: true; filePath: string }
    | { ok: false; error: string }
  >;

  /**
   * Save audio recording to a specific path
   * @param audioBuffer - Float32Array containing audio samples
   * @param sampleRate - Sample rate of the audio (e.g., 44100, 48000)
   * @param filePath - Full path where to save the file
   * @returns Promise with result containing file path or error
   */
  saveToPath(
    audioBuffer: Float32Array,
    sampleRate: number,
    filePath: string
  ): Promise<
    | { ok: true; filePath: string }
    | { ok: false; error: string }
  >;
}

declare global {
  interface Window {
    /**
     * Audio Recorder API exposed by Electron preload
     */
    audioRecorder: AudioRecorderAPI;
  }
}

export {};

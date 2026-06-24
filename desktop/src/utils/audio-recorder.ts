/**
 * Audio Recorder Utility for Renderer Process
 * Safe audio recording with WAV export via IPC
 */

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;

  /**
   * Start recording audio from microphone
   */
  async startRecording(): Promise<void> {
    try {
      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Use audio/webm for better compatibility
      const mimeType = this.getSupportedMimeType();
      
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
      console.log('[AudioRecorder] Recording started with', mimeType);
    } catch (error) {
      console.error('[AudioRecorder] Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const audioBlob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] Recording error:', event);
        this.cleanup();
        reject(new Error('Recording failed'));
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Convert audio blob to WAV format and save via IPC
   */
  async saveAsWAV(audioBlob: Blob, fileName?: string): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    try {
      // Decode audio blob to raw PCM data
      const audioBuffer = await this.decodeAudioBlob(audioBlob);
      
      // Get mono channel data
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      // Save via IPC (main process handles WAV encoding)
      if (typeof window !== 'undefined' && window.audioRecorder) {
        const result = await window.audioRecorder.saveWithDialog(
          channelData,
          sampleRate,
          fileName || `recording-${Date.now()}.wav`
        );
        
        if (result.ok) {
          console.log('[AudioRecorder] Saved to:', result.filePath);
          return { ok: true, filePath: result.filePath };
        } else {
          return { ok: false, error: result.error };
        }
      } else {
        throw new Error('Audio recorder API not available');
      }
    } catch (error) {
      console.error('[AudioRecorder] Failed to save WAV:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }

  /**
   * Save to specific path
   */
  async saveToPath(audioBlob: Blob, filePath: string): Promise<{ ok: boolean; filePath?: string; error?: string }> {
    try {
      const audioBuffer = await this.decodeAudioBlob(audioBlob);
      const channelData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      if (typeof window !== 'undefined' && window.audioRecorder) {
        const result = await window.audioRecorder.saveToPath(channelData, sampleRate, filePath);
        
        if (result.ok) {
          console.log('[AudioRecorder] Saved to:', result.filePath);
          return { ok: true, filePath: result.filePath };
        } else {
          return { ok: false, error: result.error };
        }
      } else {
        throw new Error('Audio recorder API not available');
      }
    } catch (error) {
      console.error('[AudioRecorder] Failed to save to path:', error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'unknown error',
      };
    }
  }

  /**
   * Decode audio blob to AudioBuffer
   */
  private async decodeAudioBlob(blob: Blob): Promise<AudioBuffer> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    const arrayBuffer = await blob.arrayBuffer();
    return this.audioContext.decodeAudioData(arrayBuffer);
  }

  /**
   * Get supported MIME type for MediaRecorder
   */
  private getSupportedMimeType(): string {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm'; // Fallback
  }

  /**
   * Check if currently recording
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
  }

  /**
   * Dispose and cleanup all resources
   */
  dispose(): void {
    this.cleanup();
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

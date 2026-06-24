/**
 * Audio Recording Example
 * 
 * This example demonstrates how to use the AudioRecorder utility
 * to record audio and save it as WAV format in Electron.
 * 
 * Usage in your renderer process:
 */

import { AudioRecorder } from '../utils/audio-recorder';

// Example 1: Simple recording with save dialog
async function simpleRecordingExample() {
  const recorder = new AudioRecorder();

  try {
    // Start recording
    console.log('Starting recording...');
    await recorder.startRecording();

    // Record for 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Stop recording
    console.log('Stopping recording...');
    const audioBlob = await recorder.stopRecording();

    // Save with dialog
    const result = await recorder.saveAsWAV(audioBlob, 'my-recording.wav');
    
    if (result.ok) {
      console.log('Recording saved to:', result.filePath);
    } else {
      console.error('Failed to save:', result.error);
    }
  } catch (error) {
    console.error('Recording failed:', error);
  } finally {
    recorder.dispose();
  }
}

// Example 2: Recording with UI controls
class RecordingUI {
  private recorder: AudioRecorder;
  private startButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private statusText: HTMLElement;

  constructor() {
    this.recorder = new AudioRecorder();
    
    // Create UI elements
    this.startButton = document.createElement('button');
    this.startButton.textContent = 'Start Recording';
    this.startButton.onclick = () => this.startRecording();

    this.stopButton = document.createElement('button');
    this.stopButton.textContent = 'Stop Recording';
    this.stopButton.disabled = true;
    this.stopButton.onclick = () => this.stopRecording();

    this.statusText = document.createElement('div');
    this.statusText.textContent = 'Ready to record';

    // Add to page
    document.body.appendChild(this.startButton);
    document.body.appendChild(this.stopButton);
    document.body.appendChild(this.statusText);
  }

  private async startRecording() {
    try {
      await this.recorder.startRecording();
      this.startButton.disabled = true;
      this.stopButton.disabled = false;
      this.statusText.textContent = 'Recording...';
    } catch (error) {
      this.statusText.textContent = `Error: ${error}`;
    }
  }

  private async stopRecording() {
    try {
      this.statusText.textContent = 'Processing...';
      const audioBlob = await this.recorder.stopRecording();
      
      const result = await this.recorder.saveAsWAV(audioBlob);
      
      if (result.ok) {
        this.statusText.textContent = `Saved to: ${result.filePath}`;
      } else {
        this.statusText.textContent = `Error: ${result.error}`;
      }
    } catch (error) {
      this.statusText.textContent = `Error: ${error}`;
    } finally {
      this.startButton.disabled = false;
      this.stopButton.disabled = true;
    }
  }

  dispose() {
    this.recorder.dispose();
  }
}

// Example 3: Save to specific path
async function saveToSpecificPathExample() {
  const recorder = new AudioRecorder();

  try {
    await recorder.startRecording();
    await new Promise(resolve => setTimeout(resolve, 3000));
    const audioBlob = await recorder.stopRecording();

    // Save to specific path
    const filePath = '/home/user/recordings/my-audio.wav';
    const result = await recorder.saveToPath(audioBlob, filePath);
    
    if (result.ok) {
      console.log('Saved to:', result.filePath);
    } else {
      console.error('Failed:', result.error);
    }
  } finally {
    recorder.dispose();
  }
}

// Example 4: React component
/*
import React, { useState, useRef } from 'react';
import { AudioRecorder } from '../utils/audio-recorder';

export function AudioRecorderComponent() {
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState('Ready');
  const recorderRef = useRef<AudioRecorder | null>(null);

  const startRecording = async () => {
    try {
      recorderRef.current = new AudioRecorder();
      await recorderRef.current.startRecording();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (error) {
      setStatus(`Error: ${error}`);
    }
  };

  const stopRecording = async () => {
    if (!recorderRef.current) return;

    try {
      setStatus('Processing...');
      const audioBlob = await recorderRef.current.stopRecording();
      const result = await recorderRef.current.saveAsWAV(audioBlob);
      
      if (result.ok) {
        setStatus(`Saved to: ${result.filePath}`);
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${error}`);
    } finally {
      recorderRef.current.dispose();
      recorderRef.current = null;
      setIsRecording(false);
    }
  };

  return (
    <div>
      <button onClick={startRecording} disabled={isRecording}>
        Start Recording
      </button>
      <button onClick={stopRecording} disabled={!isRecording}>
        Stop Recording
      </button>
      <div>{status}</div>
    </div>
  );
}
*/

// Export examples
export {
  simpleRecordingExample,
  RecordingUI,
  saveToSpecificPathExample,
};

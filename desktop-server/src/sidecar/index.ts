import { spawn, ChildProcess, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { defaultTtsVoice } from '../config/voice-env.js';
import dotenv from 'dotenv';

// Load environment variables from .env file before starting the sidecar
dotenv.config();

// Function to read .env file manually if needed
function loadEnvFile(): Record<string, string> {
  const envPath = path.join(process.cwd(), '.env');
  const envVars: Record<string, string> = {};
  
  try {
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            envVars[key.trim()] = valueParts.join('=').trim();
          }
        }
      }
    }
  } catch (error) {
    console.warn('[sidecar] Could not read .env file:', error);
  }
  
  return envVars;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TTSGenerateParams {
  text: string;
  voice?: string;
  outputPath: string;
}

interface TTSGenerateResult {
  success: boolean;
  path?: string;
  error?: string;
}

interface STTTranscribeParams {
  audioPath: string;
  modelSize?: string;
  beamSize?: number;
}

interface STTTranscribeResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Manages the `python/voice_sidecar.py` child process for TTS (Pocket-TTS) and STT
 * (default whisper.cpp CLI; optional Faster-Whisper via `AIGENIUS_STT_BACKEND`). JSON over stdin/stdout.
 */
class VoiceSidecar {
  private pythonProcess: ChildProcess | null = null;
  private ready = false;
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck = Date.now();

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      if (!this.pythonProcess || this.pythonProcess.killed) {
        console.warn('[sidecar] Process health check failed - process not running');
        this.ready = false;
        return;
      }

      // Check if process is responsive (no response for 5 minutes = unhealthy)
      if (Date.now() - this.lastHealthCheck > 300_000) {
        console.warn('[sidecar] Process appears unresponsive, restarting...');
        this.restart();
      }
    }, 60_000); // Check every minute
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  private async restart(): Promise<void> {
    console.log('[sidecar] Restarting voice sidecar...');
    await this.stop();
    await this.start();
  }

  private getPythonScript(): string {
    const scriptRel = path.join('python', 'voice_sidecar.py');
    /**
     * `dist/sidecar/` → `dist/python/voice_sidecar.py` (copied at build time).
     * `src/sidecar/` (tsx) → repo `python/voice_sidecar.py`.
     */
    const candidates = [
      path.join(__dirname, '..', scriptRel),
      path.join(__dirname, '..', '..', scriptRel),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(`voice_sidecar.py not found. Searched:\n${candidates.join('\n')}`);
  }

  private resolvePythonCommand(): { command: string; argsPrefix: string[] } | null {
    const tryRun = (command: string, checkArgs: string[]): boolean => {
      try {
        return spawnSync(command, checkArgs, { stdio: 'ignore' }).status === 0;
      } catch {
        return false;
      }
    };

    const custom = process.env.PYTHON_PATH?.trim();
    if (custom && tryRun(custom, ['--version'])) {
      return { command: custom, argsPrefix: [] };
    }

    if (tryRun('python', ['--version'])) return { command: 'python', argsPrefix: [] };
    if (process.platform === 'win32' && tryRun('py', ['-3', '--version'])) {
      return { command: 'py', argsPrefix: ['-3'] };
    }
    if (tryRun('python3', ['--version'])) return { command: 'python3', argsPrefix: [] };
    return null;
  }

  async start(): Promise<void> {
    if (this.pythonProcess) {
      console.log('[sidecar] Already running');
      return;
    }

    const scriptPath = this.getPythonScript();
    const launch = this.resolvePythonCommand();

    if (!launch) {
      throw new Error('No Python interpreter found. Install Python 3 or set PYTHON_PATH.');
    }

    const args = [...launch.argsPrefix, scriptPath, '--server-json'];
    console.log('[sidecar] Starting:', launch.command, args.join(' '));

    // Load environment variables from .env file
    const envVars = loadEnvFile();
    
    // Debug: Log environment variables
    console.log('[sidecar] Environment variables:');
    console.log('  AIGENIUS_STT_MODEL_SIZE (process.env):', process.env.AIGENIUS_STT_MODEL_SIZE);
    console.log('  AIGENIUS_STT_MODEL_SIZE (.env file):', envVars.AIGENIUS_STT_MODEL_SIZE);
    console.log('  AIGENIUS_STT_BACKEND (process.env):', process.env.AIGENIUS_STT_BACKEND);
    console.log('  AIGENIUS_STT_BACKEND (.env file):', envVars.AIGENIUS_STT_BACKEND);
    
    this.pythonProcess = spawn(launch.command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...envVars, // Add manually loaded .env variables
        PYTHONUNBUFFERED: '1',
        HEY_HF_ALLOW_NETWORK: process.env.HEY_HF_ALLOW_NETWORK || '1',
        HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
        // Ensure STT environment variables are available with fallbacks
        AIGENIUS_STT_MODEL_SIZE: process.env.AIGENIUS_STT_MODEL_SIZE || envVars.AIGENIUS_STT_MODEL_SIZE || 'small',
        AIGENIUS_STT_BACKEND: process.env.AIGENIUS_STT_BACKEND || envVars.AIGENIUS_STT_BACKEND || 'whisper_cpp',
        AIGENIUS_VOICE_OBS: process.env.AIGENIUS_VOICE_OBS || envVars.AIGENIUS_VOICE_OBS || '1',
      },
      windowsHide: true,
    });

    this.pythonProcess.on('error', (err) => {
      console.error('[sidecar] Failed to spawn Python:', err.message);
      this.ready = false;
    });

    this.pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[sidecar]', output);
      
      // Update health check timestamp on any output
      this.lastHealthCheck = Date.now();

      try {
        const lines = output.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.startsWith('{')) {
            this.handleResponse(JSON.parse(line));
          }
        }
      } catch {
        // not JSON — regular log line
      }

      if (output.includes('Model ready')) {
        this.ready = true;
        this.startHealthMonitoring();
        console.log('[sidecar] ✅ Ready');
      }
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log('[sidecar:stderr]', output);

      if (output.includes('Model ready')) {
        this.ready = true;
        console.log('[sidecar] ✅ Ready');
      }
    });

    this.pythonProcess.on('close', (code) => {
      console.log(`[sidecar] Process exited with code ${code}`);
      this.ready = false;
      this.pythonProcess = null;
      this.stopHealthMonitoring();
      
      // Reject all pending requests
      for (const [requestId, pending] of this.pendingRequests) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Voice sidecar process terminated'));
      }
      this.pendingRequests.clear();
    });

    await this.waitForReady();
  }

  private async waitForReady(timeoutMs = 60_000): Promise<void> {
    const start = Date.now();
    while (!this.ready && Date.now() - start < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!this.ready) {
      throw new Error('Voice sidecar failed to start within timeout');
    }
  }

  private handleResponse(response: any): void {
    if (response.status === 'progress') {
      console.log(`[sidecar] Progress [${response.req_id}]: ${response.stage} ${response.percent}%`);
      return;
    }

    const requestId = response.req_id;
    if (!requestId) return; // broadcast or untracked message

    const pending = this.pendingRequests.get(requestId);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingRequests.delete(requestId);

    if (response.status === 'success') {
      pending.resolve({ success: true, ...response });
    } else if (response.status === 'error') {
      pending.reject(new Error(response.message || 'Operation failed'));
    }
  }

  async generate(params: TTSGenerateParams): Promise<TTSGenerateResult> {
    if (!this.ready || !this.pythonProcess) {
      throw new Error('Voice sidecar not ready');
    }

    const requestId = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const command =
      JSON.stringify({
        action: 'generate',
        req_id: requestId,
        text: params.text,
        voice: params.voice || defaultTtsVoice,
        output: params.outputPath,
      }) + '\n';

    return new Promise((resolve, reject) => {
      // Adaptive timeout based on text length (roughly 1 second per 10 characters + 30s base)
      const adaptiveTimeout = Math.max(30_000, Math.min(180_000, params.text.length * 100 + 30_000));
      
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`TTS generation timeout after ${adaptiveTimeout}ms for text: "${params.text.substring(0, 50)}..."`));
      }, adaptiveTimeout);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.pythonProcess!.stdin!.write(command);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(new Error(`Failed to send TTS command: ${err}`));
      }
    });
  }

  async transcribe(params: STTTranscribeParams): Promise<STTTranscribeResult> {
    if (!this.ready || !this.pythonProcess) {
      throw new Error('Voice sidecar not ready');
    }

    const requestId = `stt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const command =
      JSON.stringify({
        action: 'transcribe',
        req_id: requestId,
        audio: params.audioPath,
        model_size: params.modelSize || 'small.en-q5_1',
        beam_size: params.beamSize || 5,
      }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('STT transcription timeout'));
      }, 60_000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });

      try {
        this.pythonProcess!.stdin!.write(command);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(requestId);
        reject(err);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.pythonProcess) return;

    this.stopHealthMonitoring();

    try {
      this.pythonProcess.stdin?.write(JSON.stringify({ action: 'quit' }) + '\n');
    } catch {
      // process may already be dead
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (this.pythonProcess && !this.pythonProcess.killed) {
      this.pythonProcess.kill();
    }

    this.pythonProcess = null;
    this.ready = false;
    
    // Clear all pending requests
    for (const [requestId, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Voice sidecar stopped'));
    }
    this.pendingRequests.clear();
  }

  isReady(): boolean {
    return this.ready;
  }
}

let sidecarInstance: VoiceSidecar | null = null;

export function getVoiceSidecar(): VoiceSidecar {
  if (!sidecarInstance) {
    sidecarInstance = new VoiceSidecar();
  }
  return sidecarInstance;
}

export async function startVoiceSidecar(): Promise<void> {
  await getVoiceSidecar().start();
}

export async function stopVoiceSidecar(): Promise<void> {
  if (sidecarInstance) {
    await sidecarInstance.stop();
    sidecarInstance = null;
  }
}

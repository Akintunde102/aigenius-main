import { spawn, ChildProcess, spawnSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

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

class PocketTTSSidecar {
  private pythonProcess: ChildProcess | null = null;
  private ready = false;
  private pendingRequests = new Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  private getPythonScript(): string {
    /** Running from `dist/tts/` (build/packaged): `../hey.py`. From `src/tts/` (tsx): `../../hey.py`. */
    const candidates = [
      path.join(__dirname, '..', 'hey.py'),
      path.join(__dirname, '..', '..', 'hey.py'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) return p;
    }
    throw new Error(`hey.py not found. Searched:\n${candidates.join('\n')}`);
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
      console.log('[PocketTTS] Sidecar already running');
      return;
    }

    const scriptPath = this.getPythonScript();
    const launch = this.resolvePythonCommand();

    if (!launch) {
      throw new Error('No Python interpreter found. Install Python 3 or set PYTHON_PATH.');
    }

    const args = [...launch.argsPrefix, scriptPath, '--server-json'];
    console.log('[PocketTTS] Starting sidecar:', launch.command, args.join(' '));

    this.pythonProcess = spawn(launch.command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        HEY_HF_ALLOW_NETWORK: process.env.HEY_HF_ALLOW_NETWORK || '1',
        HF_HUB_DISABLE_SYMLINKS_WARNING: '1',
      },
      windowsHide: true,
    });

    this.pythonProcess.on('error', (err) => {
      console.error('[PocketTTS] Failed to spawn Python:', err.message);
      this.ready = false;
    });

    this.pythonProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[PocketTTS]:', output);

      // Parse JSON responses
      try {
        const lines = output.split('\n').filter((l: string) => l.trim());
        for (const line of lines) {
          if (line.startsWith('{')) {
            const response = JSON.parse(line);
            this.handleResponse(response);
          }
        }
      } catch (e) {
        // Not JSON, regular log
      }

      if (output.includes('Model ready')) {
        this.ready = true;
        console.log('[PocketTTS] ✅ Sidecar ready!');
      }
    });

    this.pythonProcess.stderr?.on('data', (data) => {
      const output = data.toString();
      console.log('[PocketTTS Error]:', output);

      if (output.includes('Model ready')) {
        this.ready = true;
        console.log('[PocketTTS] ✅ Sidecar ready!');
      }
    });

    this.pythonProcess.on('close', (code) => {
      console.log(`[PocketTTS] Process exited with code ${code}`);
      this.ready = false;
      this.pythonProcess = null;
    });

    // Wait for ready signal
    await this.waitForReady();
  }

  private async waitForReady(timeout = 60000): Promise<void> {
    const start = Date.now();
    while (!this.ready && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.ready) {
      throw new Error('PocketTTS sidecar failed to start within timeout');
    }
  }

  private handleResponse(response: any): void {
    if (response.status === 'progress') {
      console.log(`[PocketTTS] Progress [${response.req_id}]: ${response.stage} ${response.percent}%`);
      return;
    }

    const requestId = response.req_id;
    if (!requestId) {
      // Legacy or broadcast response
      return;
    }

    const request = this.pendingRequests.get(requestId);
    if (request) {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(requestId);

      if (response.status === 'success') {
        // Resolve with the whole response object for flexibility
        request.resolve({ success: true, ...response });
      } else if (response.status === 'error') {
        request.reject(new Error(response.message || 'Operation failed'));
      }
    }
  }

  async generate(params: TTSGenerateParams): Promise<TTSGenerateResult> {
    if (!this.ready || !this.pythonProcess) {
      throw new Error('PocketTTS sidecar not ready');
    }

    const requestId = `tts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const command = JSON.stringify({
      action: 'generate',
      req_id: requestId,
      text: params.text,
      voice: params.voice || 'alba',
      output: params.outputPath,
    }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('TTS generation timeout'));
      }, 120000); // 2 minutes

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

  async transcribe(params: STTTranscribeParams): Promise<STTTranscribeResult> {
    if (!this.ready || !this.pythonProcess) {
      throw new Error('PocketTTS sidecar not ready');
    }

    const requestId = `stt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const command = JSON.stringify({
      action: 'transcribe',
      req_id: requestId,
      audio: params.audioPath,
      model_size: params.modelSize || 'base',
      beam_size: params.beamSize || 5,
    }) + '\n';

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('STT transcription timeout'));
      }, 60000); // 1 minute

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
    if (this.pythonProcess) {
      const command = JSON.stringify({ action: 'quit' }) + '\n';
      try {
        this.pythonProcess.stdin?.write(command);
      } catch (e) {
        // Process might already be dead
      }
      
      // Give it a moment to shut down gracefully
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (this.pythonProcess && !this.pythonProcess.killed) {
        this.pythonProcess.kill();
      }
      
      this.pythonProcess = null;
      this.ready = false;
    }
  }

  isReady(): boolean {
    return this.ready;
  }
}

// Singleton instance
let sidecarInstance: PocketTTSSidecar | null = null;

export function getPocketTTSSidecar(): PocketTTSSidecar {
  if (!sidecarInstance) {
    sidecarInstance = new PocketTTSSidecar();
  }
  return sidecarInstance;
}

export async function startPocketTTSSidecar(): Promise<void> {
  const sidecar = getPocketTTSSidecar();
  await sidecar.start();
}

export async function stopPocketTTSSidecar(): Promise<void> {
  if (sidecarInstance) {
    await sidecarInstance.stop();
    sidecarInstance = null;
  }
}

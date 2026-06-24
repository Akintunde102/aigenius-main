import { io, Socket } from 'socket.io-client';
import { spawn, ChildProcess, execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { upstreamApiUrl } from '../config/server-env.js';
import {
    formatOllamaCloudError,
    getOllamaRegistryModelName,
    isOllamaCloudModel,
    OLLAMA_LOCAL_BASE_URL,
} from './ollama-cloud.js';
import {
    extractTextFromOllamaStreamLine,
    OLLAMA_RELAY_EVENTS,
} from './ollama-relay.events.js';

export class OllamaRelayClient {
    private static instance: OllamaRelayClient;
    private socket: Socket | null = null;
    private ollamaProcess: ChildProcess | null = null;
    private token: string | null = null;
    private userId: string | null = null;
    private latency: number = -1;
    private activeRequests = new Map<string, AbortController>();

    private constructor() {
        // Register shutdown hook
        process.on('exit', () => this.stopOllamaServer());
        process.on('SIGTERM', () => this.stopOllamaServer());
        process.on('SIGINT', () => this.stopOllamaServer());
    }

    public static getInstance(): OllamaRelayClient {
        if (!OllamaRelayClient.instance) {
            OllamaRelayClient.instance = new OllamaRelayClient();
        }
        return OllamaRelayClient.instance;
    }

    public isConnected(): boolean {
        return this.socket?.connected || false;
    }

    public getLatency(): number {
        return this.latency;
    }

    public findOllamaBinary(): string | null {
        // 1. Try PATH
        try {
            const cmd = process.platform === 'win32' ? 'where ollama' : 'which ollama';
            const stdout = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
            if (stdout) {
                const firstLine = stdout.split('\n')[0].trim();
                if (fs.existsSync(firstLine)) return firstLine;
            }
        } catch (e) {
            // Not in PATH
        }

        // 2. Check standard paths
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            const winPath = path.join(localAppData, 'Programs', 'Ollama', 'ollama.exe');
            if (fs.existsSync(winPath)) return winPath;
        } else if (process.platform === 'darwin') {
            const macPath1 = '/usr/local/bin/ollama';
            if (fs.existsSync(macPath1)) return macPath1;
            const macPath2 = '/Applications/Ollama.app/Contents/Resources/ollama';
            if (fs.existsSync(macPath2)) return macPath2;
        } else {
            const linuxPath1 = '/usr/bin/ollama';
            if (fs.existsSync(linuxPath1)) return linuxPath1;
            const linuxPath2 = '/usr/local/bin/ollama';
            if (fs.existsSync(linuxPath2)) return linuxPath2;
        }

        return null;
    }

    public async isOllamaRunning(): Promise<boolean> {
        try {
            const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/tags`);
            return res.ok;
        } catch {
            return false;
        }
    }

    public async startOllamaServer(): Promise<boolean> {
        if (await this.isOllamaRunning()) {
            console.log('[sidecar] Ollama server is already running.');
            return true;
        }

        const binary = this.findOllamaBinary();
        if (!binary) {
            console.warn('[sidecar] Ollama binary not found on this system.');
            return false;
        }

        console.log('[sidecar] Spawning Ollama server from:', binary);
        try {
            const child = spawn(binary, ['serve'], {
                detached: true,
                stdio: 'ignore',
            });
            child.unref();
            this.ollamaProcess = child;

            // Poll for server readiness (up to 5 seconds)
            for (let i = 0; i < 5; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (await this.isOllamaRunning()) {
                    console.log('[sidecar] Ollama server successfully started.');
                    // Trigger model sync on successful startup
                    await this.syncModels();
                    return true;
                }
            }
            console.warn('[sidecar] Ollama server spawned but failed to respond within timeout.');
            return false;
        } catch (err) {
            console.error('[sidecar] Failed to spawn Ollama process:', err);
            return false;
        }
    }

    public stopOllamaServer(): void {
        if (this.ollamaProcess && !this.ollamaProcess.killed) {
            console.log('[sidecar] Stopping local Ollama process...');
            this.ollamaProcess.kill('SIGTERM');
            this.ollamaProcess = null;
        }
    }

    public async connect(token: string, userId?: string): Promise<void> {
        this.token = token;
        this.userId = userId ?? null;

        // Ensure Ollama server runs if installed
        await this.startOllamaServer();

        // Disconnect existing connection
        if (this.socket) {
            this.socket.disconnect();
        }

        const wsUrl = upstreamApiUrl.replace(/^http/, 'ws');
        console.log(`[sidecar] Connecting outbound WebSocket to cloud relay: ${wsUrl}/ollama-relay`);

        this.socket = io(`${wsUrl}/ollama-relay`, {
            auth: { token, userId },
            reconnection: true,
            reconnectionDelay: 2000,
        });

        this.socket.on('connect', () => {
            console.log('[sidecar] WebSocket connected to cloud Ollama relay gateway.');
            this.syncModels();
            this.startLatencyMonitoring();
        });

        this.socket.on('disconnect', () => {
            console.log('[sidecar] WebSocket disconnected from cloud Ollama relay gateway.');
            this.latency = -1;
        });

        this.socket.on(OLLAMA_RELAY_EVENTS.inferenceRequest, async (data: { requestId: string; payload: any }) => {
            await this.handleInferenceRequest(data.requestId, data.payload);
        });

        this.socket.on(OLLAMA_RELAY_EVENTS.inferenceCancel, (data: { requestId: string }) => {
            const controller = this.activeRequests.get(data.requestId);
            if (controller) {
                console.log(`[sidecar] Cancelling active inference request: ${data.requestId}`);
                controller.abort();
                this.activeRequests.delete(data.requestId);
            }
        });

        if (this.socket.connected) {
            return;
        }

        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error('Timed out connecting to cloud Ollama relay gateway.'));
            }, 10000);

            const cleanup = () => {
                clearTimeout(timeout);
                this.socket?.off('connect', onConnect);
                this.socket?.off('connect_error', onConnectError);
            };

            const onConnect = () => {
                cleanup();
                resolve();
            };

            const onConnectError = (err: Error) => {
                cleanup();
                reject(err);
            };

            this.socket?.once('connect', onConnect);
            this.socket?.once('connect_error', onConnectError);
        });
    }

    private startLatencyMonitoring(): void {
        const pingInterval = setInterval(() => {
            if (!this.socket?.connected) {
                clearInterval(pingInterval);
                return;
            }
            const start = Date.now();
            this.socket.emit('ping-latency', () => {
                this.latency = Date.now() - start;
            });
        }, 10000);
    }

    public async syncModels(): Promise<void> {
        if (!this.socket?.connected) return;

        try {
            const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/tags`);
            if (res.ok) {
                const data = await res.json();
                const models = data.models || [];
                console.log(`[sidecar] Syncing ${models.length} local Ollama models with cloud.`);
                this.socket.emit(OLLAMA_RELAY_EVENTS.modelsSync, { models });
            }
        } catch (e) {
            console.warn('[sidecar] Could not fetch local Ollama models to sync:', e);
        }
    }

    private async ensureCloudModelAvailable(model: string): Promise<void> {
        if (!isOllamaCloudModel(model)) {
            return;
        }

        const registryModel = getOllamaRegistryModelName(model);
        const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: registryModel, stream: false }),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => '');
            const detail = body.trim() || res.statusText;
            throw new Error(`Could not prepare Ollama Cloud model "${registryModel}". Run "ollama signin" and try again. ${detail}`);
        }
    }

    private async readOllamaError(res: Response): Promise<string> {
        const body = typeof res.text === 'function' ? await res.text().catch(() => '') : '';
        return body.trim() || res.statusText;
    }

    private async handleInferenceRequest(requestId: string, payload: any): Promise<void> {
        if (!this.socket) return;

        const controller = new AbortController();
        this.activeRequests.set(requestId, controller);

        try {
            const model = typeof payload.model === 'string' ? payload.model : '';
            await this.ensureCloudModelAvailable(model);

            const resolvedModel = isOllamaCloudModel(model) ? getOllamaRegistryModelName(model) : model;
            const chatPayload = {
                model: resolvedModel,
                messages: Array.isArray(payload.messages) ? payload.messages : [],
                stream: payload.stream === true,
            };

            const res = await fetch(`${OLLAMA_LOCAL_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatPayload),
                signal: controller.signal,
            });

            if (!res.ok) {
                const detail = await this.readOllamaError(res);
                const message = isOllamaCloudModel(model)
                    ? formatOllamaCloudError(detail)
                    : detail;
                throw new Error(`Local Ollama error: ${message}`);
            }

            if (!res.body) {
                throw new Error('No response body from local Ollama');
            }

            if (payload.stream) {
                const reader = res.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffer = '';

                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || ''; // Keep the last partial line in the buffer

                        for (const line of lines) {
                            if (!line.trim()) {
                                continue;
                            }
                            try {
                                const parsed = JSON.parse(line) as Record<string, unknown>;
                                const text = extractTextFromOllamaStreamLine(parsed);
                                if (text) {
                                    this.socket.emit(OLLAMA_RELAY_EVENTS.inferenceChunk, {
                                        requestId,
                                        text,
                                    });
                                }
                            } catch (parseErr) {
                                const message = parseErr instanceof Error ? parseErr.message : String(parseErr);
                                throw new Error(message);
                            }
                        }
                    }
                    this.socket.emit(OLLAMA_RELAY_EVENTS.inferenceDone, { requestId });
                } finally {
                    reader.releaseLock();
                }
            } else {
                const data = await res.json();
                const content = data.message?.content || '';
                this.socket.emit(OLLAMA_RELAY_EVENTS.inferenceResponse, { requestId, content });
            }
        } catch (e: any) {
            if (e.name === 'AbortError') {
                // Request was cancelled, ignore
                return;
            }
            console.error('[sidecar] Ollama inference relay error:', e);
            if (payload.stream) {
                this.socket.emit(OLLAMA_RELAY_EVENTS.inferenceError, {
                    requestId,
                    error: e.message || 'Relay failed',
                });
            } else {
                this.socket.emit(OLLAMA_RELAY_EVENTS.inferenceResponse, {
                    requestId,
                    error: e.message || 'Relay failed',
                });
            }
        } finally {
            this.activeRequests.delete(requestId);
        }
    }
}

import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { getActiveCodeProjectRootPath } from './active-code-project';

type LspPosition = { line: number; character: number };
type LspRange = { start: LspPosition; end: LspPosition };
type LspLocation = { uri: string; range: LspRange };

const SESSION_TTL_MS = 5 * 60 * 1000;

function fileUri(absPath: string): string {
  return pathToFileURL(absPath).href;
}

function findTypeScriptProjectRoot(startFile: string): string {
  let dir = path.dirname(path.resolve(startFile));
  const root = path.parse(dir).root;
  while (dir && dir !== root) {
    for (const marker of ['tsconfig.json', 'jsconfig.json', 'package.json']) {
      if (fs.existsSync(path.join(dir, marker))) return dir;
    }
    dir = path.dirname(dir);
  }
  return path.dirname(path.resolve(startFile));
}

function languageIdForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.ts') return 'typescript';
  if (ext === '.tsx') return 'typescriptreact';
  if (ext === '.js') return 'javascript';
  if (ext === '.jsx') return 'javascriptreact';
  if (ext === '.json') return 'json';
  return 'plaintext';
}

function formatLocation(loc: LspLocation): string {
  const filePath = decodeURIComponent(loc.uri.replace(/^file:\/\//, ''));
  const line = loc.range.start.line + 1;
  const col = loc.range.start.character + 1;
  return `${filePath}:${line}:${col}`;
}

class JsonRpcLspSession {
  private readonly proc: ChildProcessWithoutNullStreams;
  private readonly projectRoot: string;
  private nextId = 1;
  private readonly pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = Buffer.alloc(0);
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private lastUsed = Date.now();
  private openDocs = new Set<string>();

  private constructor(proc: ChildProcessWithoutNullStreams, projectRoot: string) {
    this.proc = proc;
    this.projectRoot = projectRoot;
    proc.stdout.on('data', (chunk: Buffer) => this.onStdout(chunk));
    proc.stderr.on('data', () => undefined);
    proc.on('exit', () => {
      for (const [, p] of this.pending) {
        p.reject(new Error('language server exited'));
      }
      this.pending.clear();
    });
  }

  static async start(projectRoot: string): Promise<JsonRpcLspSession> {
    const proc = spawn('typescript-language-server', ['--stdio'], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const session = new JsonRpcLspSession(proc, projectRoot);
    await session.ensureInitialized();
    return session;
  }

  touch(): void {
    this.lastUsed = Date.now();
  }

  isStale(): boolean {
    return Date.now() - this.lastUsed > SESSION_TTL_MS;
  }

  dispose(): void {
    try {
      this.proc.kill();
    } catch {
      /* ignore */
    }
  }

  private onStdout(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) return;
      const header = this.buffer.slice(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }
      const len = Number(match[1]);
      const bodyStart = headerEnd + 4;
      if (this.buffer.length < bodyStart + len) return;
      const body = this.buffer.slice(bodyStart, bodyStart + len).toString('utf8');
      this.buffer = this.buffer.slice(bodyStart + len);
      try {
        const msg = JSON.parse(body) as { id?: number; method?: string; result?: unknown; error?: { message?: string } };
        if (typeof msg.id === 'number') {
          const pending = this.pending.get(msg.id);
          if (!pending) continue;
          this.pending.delete(msg.id);
          if (msg.error) pending.reject(new Error(msg.error.message ?? 'LSP error'));
          else pending.resolve(msg.result);
        }
      } catch {
        /* ignore malformed frames */
      }
    }
  }

  private send(msg: Record<string, unknown>): void {
    const payload = JSON.stringify(msg);
    const frame = `Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`;
    this.proc.stdin.write(frame, 'utf8');
  }

  private request<T>(method: string, params: unknown): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, {
        resolve: (v) => resolve(v as T),
        reject,
      });
      this.send({ jsonrpc: '2.0', id, method, params });
    });
  }

  private notify(method: string, params: unknown): void {
    this.send({ jsonrpc: '2.0', method, params });
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        await this.request('initialize', {
          processId: process.pid,
          rootUri: fileUri(this.projectRoot),
          capabilities: {},
        });
        this.notify('initialized', {});
        this.initialized = true;
      })();
    }
    await this.initPromise;
  }

  private async openDocument(absPath: string, text: string): Promise<void> {
    const uri = fileUri(absPath);
    if (this.openDocs.has(uri)) return;
    this.notify('textDocument/didOpen', {
      textDocument: {
        uri,
        languageId: languageIdForFile(absPath),
        version: 1,
        text,
      },
    });
    this.openDocs.add(uri);
  }

  async goToDefinition(absPath: string, line: number, character: number): Promise<string> {
    await this.ensureInitialized();
    const text = await fs.promises.readFile(absPath, 'utf8');
    await this.openDocument(absPath, text);
    const result = await this.request<LspLocation | LspLocation[] | null>('textDocument/definition', {
      textDocument: { uri: fileUri(absPath) },
      position: { line: Math.max(0, line - 1), character: Math.max(0, character - 1) },
    });
    if (!result) {
      return `No definition found at ${absPath}:${line}:${character}`;
    }
    const locations = Array.isArray(result) ? result : [result];
    if (!locations.length) {
      return `No definition found at ${absPath}:${line}:${character}`;
    }
    const lines = locations.map((loc) => `- ${formatLocation(loc)}`);
    return `# Definition\n\n${lines.join('\n')}`;
  }
}

const sessions = new Map<string, JsonRpcLspSession>();

async function getSession(projectRoot: string): Promise<JsonRpcLspSession> {
  const key = path.resolve(projectRoot);
  const existing = sessions.get(key);
  if (existing && !existing.isStale()) {
    existing.touch();
    return existing;
  }
  if (existing) {
    existing.dispose();
    sessions.delete(key);
  }
  const session = await JsonRpcLspSession.start(key);
  sessions.set(key, session);
  return session;
}

export async function runGoToDefinition(
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const filePath = typeof rawArgs.path === 'string' ? rawArgs.path.trim() : '';
  if (!filePath) {
    return { ok: false, error: 'path is required (absolute file path)' };
  }
  const line = typeof rawArgs.line === 'number' ? Math.trunc(rawArgs.line) : 1;
  const character = typeof rawArgs.character === 'number' ? Math.trunc(rawArgs.character) : 1;
  const absPath = path.resolve(filePath);
  try {
    await fs.promises.access(absPath, fs.constants.R_OK);
  } catch {
    return { ok: false, error: `File not readable: ${absPath}` };
  }

  const projectRoot =
    typeof rawArgs.project_root === 'string' && rawArgs.project_root.trim()
      ? path.resolve(rawArgs.project_root.trim())
      : getActiveCodeProjectRootPath() ?? findTypeScriptProjectRoot(absPath);

  try {
    const session = await getSession(projectRoot);
    const result = await session.goToDefinition(absPath, line, character);
    return { ok: true, result };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/ENOENT|not found/i.test(msg)) {
      return {
        ok: false,
        error:
          'typescript-language-server not found on PATH. Install it globally (`npm i -g typescript typescript-language-server`) or in the project.',
      };
    }
    return { ok: false, error: msg };
  }
}

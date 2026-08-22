import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { StringDecoder } from 'node:string_decoder';

const MAX_GIT_OUT = 256 * 1024;
const MAX_READ_CHARS = 520 * 1024;
const MAX_RG_OUT = 200 * 1024;
const MAX_CMD_LEN = 64_000;
const MAX_SHELL_OUT = 512 * 1024;

export type ToolExecuteResult =
  | { ok: true; result: string; rawData?: unknown }
  | { ok: false; error: string };

function runProcess(
  cmd: string,
  args: string[],
  opts: { cwd?: string; maxOut?: number } = {},
): Promise<{ ok: true; stdout: string; stderr: string; code: number } | { ok: false; error: string }> {
  const maxOut = opts.maxOut ?? MAX_GIT_OUT;
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > maxOut) {
        stdout = `${stdout.slice(0, maxOut)}\n…[truncated]`;
      }
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', (err) => resolve({ ok: false, error: err.message }));
    child.on('close', (code) => {
      resolve({ ok: true, stdout: stdout.trim(), stderr: stderr.trim(), code: code ?? 1 });
    });
  });
}

async function executeGrep(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const pattern = typeof args.pattern === 'string' ? args.pattern.trim() : '';
  const searchPath =
    (typeof args.path === 'string' && args.path.trim()) ||
    (typeof args.path_prefix === 'string' && args.path_prefix.trim()) ||
    '';
  if (!pattern) return { ok: false, error: 'pattern is required' };
  if (!searchPath) {
    return {
      ok: false,
      error:
        'path is required — pass the absolute directory or file to search. Example: { "pattern": "foo", "path": "C:\\\\project" }',
    };
  }

  const root = path.resolve(searchPath);
  const rgArgs = ['--no-heading', '--line-number', '--color=never', pattern, root];
  const glob = typeof args.glob === 'string' ? args.glob.trim() : '';
  if (glob) rgArgs.splice(4, 0, '--glob', glob);

  const out = await runProcess('rg', rgArgs, { maxOut: MAX_RG_OUT });
  if (!out.ok) return out;
  if (out.code !== 0 && out.code !== 1) {
    return { ok: false, error: out.stderr || `rg exited ${out.code}` };
  }
  const lines = out.stdout ? out.stdout.split('\n').filter(Boolean) : [];
  const headLimit = typeof args.head_limit === 'number' ? Math.min(Math.max(1, args.head_limit), 200) : 50;
  const offset = typeof args.offset === 'number' ? Math.max(0, args.offset) : 0;
  const sliced = lines.slice(offset, offset + headLimit);
  const body = sliced.length
    ? sliced.map((l) => `- ${l}`).join('\n')
    : `No matches for \`${pattern}\` under ${root}`;
  return { ok: true, result: `# Grep: \`${pattern}\`\n\n${body}` };
}

async function executeGitStatus(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const cwd =
    typeof args.cwd === 'string' && args.cwd.trim()
      ? path.resolve(args.cwd.trim())
      : process.cwd();
  const res = await runProcess('git', ['status', '--short', '--branch'], { cwd });
  if (!res.ok) return res;
  if (res.code !== 0) return { ok: false, error: res.stderr || `git exited ${res.code}` };
  return { ok: true, result: res.stdout || '(clean working tree)' };
}

async function executeGitDiff(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const cwd =
    typeof args.cwd === 'string' && args.cwd.trim()
      ? path.resolve(args.cwd.trim())
      : process.cwd();
  const gitArgs = ['diff'];
  if (args.staged === true) gitArgs.push('--cached');
  const filePath = typeof args.path === 'string' ? args.path.trim() : '';
  if (filePath) gitArgs.push('--', filePath);
  const res = await runProcess('git', gitArgs, { cwd });
  if (!res.ok) return res;
  if (res.code !== 0) return { ok: false, error: res.stderr || `git exited ${res.code}` };
  return { ok: true, result: res.stdout || '(no diff)' };
}

async function executeReadFile(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const filePath = typeof args.path === 'string' ? args.path.trim() : '';
  if (!filePath) return { ok: false, error: 'path is required' };
  const resolved = path.resolve(filePath);
  try {
    const st = await fs.stat(resolved);
    if (!st.isFile()) return { ok: false, error: 'not_a_file' };
    if (st.size > MAX_READ_CHARS * 4) {
      return { ok: false, error: 'file too large for read_file preview' };
    }
    const text = await fs.readFile(resolved, 'utf8');
    const limit = typeof args.limit === 'number' ? args.limit : MAX_READ_CHARS;
    const offset = typeof args.offset === 'number' ? Math.max(0, args.offset) : 0;
    const slice = text.slice(offset, offset + limit);
    const lines = slice.split('\n');
    const numbered = lines.map((line, i) => `${String(offset + i + 1).padStart(6, ' ')}|${line}`).join('\n');
    return {
      ok: true,
      result: `# ${path.basename(resolved)}\n\`\`\`\n${numbered}\n\`\`\``,
      rawData: { path: resolved, content: slice },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'read failed' };
  }
}

function formatShellMarkdown(stdout: string, stderr: string, exitCode: number): string {
  const escapeBackticks = (text: string) => text.replace(/```/g, '` ` `');
  let md = '### Shell output\n\n';
  md += `- **Exit code**: ${exitCode}\n\n`;
  if (stdout.trim()) {
    md += `**Stdout**\n\n\`\`\`\n${escapeBackticks(stdout.trim())}\n\`\`\`\n\n`;
  }
  if (stderr.trim()) {
    md += `**Stderr**\n\n\`\`\`\n${escapeBackticks(stderr.trim())}\n\`\`\`\n\n`;
  }
  if (!stdout.trim() && !stderr.trim()) {
    md += '*Command produced no output.*\n';
  }
  return md.trimEnd() + '\n';
}

async function executeShell(args: Record<string, unknown>): Promise<ToolExecuteResult> {
  const commandInput = typeof args.command === 'string' ? args.command : '';
  if (!commandInput.trim()) {
    return { ok: false, error: 'Missing command' };
  }
  const command = commandInput.replace(/\r\n?/g, '\n');
  if (command.length > MAX_CMD_LEN) {
    return { ok: false, error: `Command too long (max ${MAX_CMD_LEN} characters)` };
  }

  const cwdRaw = typeof args.cwd === 'string' && args.cwd.trim() ? args.cwd : os.homedir();
  const cwdResolved = path.resolve(cwdRaw);
  try {
    const st = await fs.stat(cwdResolved);
    if (!st.isDirectory()) {
      return { ok: false, error: 'cwd must be an existing directory' };
    }
  } catch {
    return { ok: false, error: 'cwd does not exist or is not accessible' };
  }

  const timeoutMs =
    typeof args.timeout_ms === 'number' && args.timeout_ms >= 1000
      ? Math.min(args.timeout_ms, 300_000)
      : 60_000;

  const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
  const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];

  return new Promise((resolve) => {
    const child = spawn(shell, shellArgs, {
      cwd: cwdResolved,
      windowsHide: true,
      env: process.env,
      windowsVerbatimArguments: process.platform === 'win32',
    });

    const decOut = new StringDecoder('utf8');
    const decErr = new StringDecoder('utf8');
    let accOut = '';
    let accErr = '';
    let settled = false;
    let timedOut = false;
    let killedForLimit = false;

    const settle = (out: ToolExecuteResult): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(out);
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
    }, timeoutMs);

    const onChunk = (kind: 'stdout' | 'stderr', buf: Buffer): void => {
      const dec = kind === 'stdout' ? decOut : decErr;
      const text = dec.write(buf);
      if (!text) return;
      if (kind === 'stdout') accOut += text;
      else accErr += text;
      const totalBytes = Buffer.byteLength(accOut, 'utf8') + Buffer.byteLength(accErr, 'utf8');
      if (totalBytes > MAX_SHELL_OUT) {
        killedForLimit = true;
        try {
          child.kill('SIGTERM');
        } catch {
          /* ignore */
        }
      }
    };

    child.stdout?.on('data', (buf: Buffer) => onChunk('stdout', buf));
    child.stderr?.on('data', (buf: Buffer) => onChunk('stderr', buf));
    child.on('error', (err) => settle({ ok: false, error: err.message }));
    child.on('close', (code, signal) => {
      if (settled) return;
      const tailOut = decOut.end();
      const tailErr = decErr.end();
      if (tailOut) accOut += tailOut;
      if (tailErr) accErr += tailErr;

      if (timedOut) {
        settle({ ok: false, error: 'Command timed out' });
        return;
      }

      let exitCode = typeof code === 'number' ? code : 1;
      let stderrCombined = accErr;
      if (code == null && signal) {
        exitCode = 1;
        stderrCombined += `\n[Process terminated by signal: ${signal}]`;
      } else if (code == null && !signal) {
        exitCode = 1;
        stderrCombined += '\n[Process closed with unknown status]';
      }
      if (killedForLimit) {
        stderrCombined += `\n[Output truncated: exceeded ${MAX_SHELL_OUT} bytes]`;
        exitCode = 1;
      }

      const rawData = { stdout: accOut, stderr: stderrCombined, exit_code: exitCode };
      settle({
        ok: true,
        result: formatShellMarkdown(accOut, stderrCombined, exitCode),
        rawData,
      });
    });
  });
}

const HANDLERS: Record<string, (args: Record<string, unknown>) => Promise<ToolExecuteResult>> = {
  local_grep: executeGrep,
  local_git_status: executeGitStatus,
  local_git_diff: executeGitDiff,
  local_read_file: executeReadFile,
  read_file: executeReadFile,
  local_shell: executeShell,
  run_command: executeShell,
};

export async function executeDesktopTool(
  tool: string,
  args: Record<string, unknown>,
): Promise<ToolExecuteResult> {
  const handler = HANDLERS[tool];
  if (!handler) {
    return { ok: false, error: `Tool not available on sidecar: ${tool}` };
  }
  return handler(args);
}

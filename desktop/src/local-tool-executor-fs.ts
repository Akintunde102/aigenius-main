import path from 'path';
import { formatDirectoryListing, formatReadFileBatch } from './utils/tool-formatter';
import { isIgnored } from './utils/exemptions';
import { listDirectoryViaShell } from './utils/list-directory-via-shell';
import { executeReadFile } from './utils/read-file';
import { registerReadFileBatchForPreview } from './utils/register-preview-paths';
import { resolveDirectoryPath } from './utils/read-file/path-resolver';

export async function readBoundedFile(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  try {
    const batch = await executeReadFile(args);
    registerReadFileBatchForPreview(batch.results);
    const firstError = batch.results.find((r) => r.status === 'error');
    if (batch.results.length === 1 && firstError) {
      return { ok: false, error: firstError.error ?? firstError.content };
    }
    const formatted = formatReadFileBatch(batch);
    return { ok: true, result: formatted.result, rawData: formatted.rawData };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'read failed' };
  }
}

export async function listLocalDirectory(
  args: Record<string, unknown>,
): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> {
  const rawPath = typeof args.path === 'string' ? args.path.trim() : '';
  if (!rawPath) {
    return { ok: false, error: 'path is required' };
  }

  const pathResult = await resolveDirectoryPath(rawPath);
  if (!pathResult.ok) {
    return { ok: false, error: pathResult.error };
  }
  const dirPath = pathResult.resolved;

  const command = typeof args.command === 'string' ? args.command.trim() : '';
  const recursive = !!args.recursive;
  const extensions = Array.isArray(args.extensions)
    ? (args.extensions as string[]).map(e => e.toLowerCase().replace(/^\./, ''))
    : null;
  const limit = typeof args.limit === 'number' ? Math.min(Math.max(1, args.limit), 1000) : 100;

  try {
    const results: Array<{ path: string; name: string; isDir: boolean; size?: number; mtime?: number }> = [];
    let shellCommand = '';
    let terminalOutput: string | undefined;
    let parseRejected = false;

    async function walk(currentPath: string) {
      if (results.length >= limit) return;

      const remaining = limit - results.length;
      const listing = await listDirectoryViaShell(currentPath, {
        limit: remaining,
        command: command || undefined,
      });
      if (!shellCommand) {
        shellCommand = listing.shellCommand;
      }
      if (listing.terminalOutput) {
        terminalOutput = listing.terminalOutput;
      }
      if (listing.parseRejected) {
        parseRejected = true;
      }

      if (!listing.structured) {
        return;
      }

      for (const entry of listing.items) {
        if (results.length >= limit) break;

        if (isIgnored(entry.path)) {
          continue;
        }

        if (entry.isDir) {
          results.push({ path: entry.path, name: entry.name, isDir: true });
          if (recursive && !command) {
            try {
              await walk(entry.path);
            } catch {
              // Skip directories we can't access
            }
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase().replace(/^\./, '');
          if (!extensions || extensions.includes(ext)) {
            results.push({
              path: entry.path,
              name: entry.name,
              isDir: false,
              size: entry.size,
              mtime: entry.mtime,
            });
          }
        }
      }
    }

    await walk(dirPath);

    if (command && parseRejected) {
      return {
        ok: false,
        error:
          'Directory listing failed: shell output could not be parsed (table headers like `Name`, `----`, or `Mode` detected). '
          + 'Retry `local_list_directory` with only `{ path: "<absolute directory>" }` and omit `command`.',
      };
    }

    if (command && terminalOutput && results.length === 0) {
      const formatted = formatDirectoryListing({
        path: dirPath,
        items: [],
        shellCommand,
        terminalOutput,
      });
      return {
        ok: true,
        result: formatted.result,
        rawData: formatted.rawData,
      };
    }

    const hitLimit = results.length >= limit;
    const formatted = formatDirectoryListing({
      path: dirPath,
      items: results,
      hitLimit,
      shellCommand,
      terminalOutput,
    });
    return {
      ok: true,
      result: formatted.result,
      rawData: formatted.rawData,
    };
  } catch (e: any) {
    return { ok: false, error: `Failed to list directory: ${e.message}` };
  }
}

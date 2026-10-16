import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { BrowserWindow } from 'electron';
import { ToolboxStore } from './store';
import {
  parseToolNameArg,
  safeRelPath,
  scopeKey,
  toolArchiveDir,
  toolFolderPath,
  toolHistoryDir,
  toolWorkDir,
  toolboxRootDir,
} from './paths';
import { hashToolFolder, readDirFiles } from './hash';
import { buildSkillMd, parseSkillMd } from './frontmatter';
import {
  CAPABILITY_LABELS,
  detectCapabilitiesFromFiles,
  findSecrets,
  mergeDeclaredAndScanned,
} from './scan';
import { runProcess } from './runner';
import { requestToolboxApproval } from '../electron/approval-gate';
import type {
  ToolboxApprovalPayload,
  ToolboxCallContext,
  ToolboxCapabilityFlag,
  ToolboxFileInput,
  ToolboxGetResult,
  ToolboxRunResult,
  ToolboxSaveResult,
  ToolboxScope,
  ToolboxSearchResult,
  ToolboxRuntime,
  ToolboxToolRecord,
} from './types';

const NAME_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const MAX_FILE_BYTES = 100 * 1024;
const MAX_TOTAL_BYTES = 500 * 1024;

export type ToolboxApprovalFn = (
  parent: BrowserWindow | undefined,
  payload: ToolboxApprovalPayload,
) => Promise<boolean>;

export class ToolboxService {
  private readonly userDataDir: string;
  private readonly store: ToolboxStore;

  constructor(userDataDir: string) {
    this.userDataDir = userDataDir;
    this.store = new ToolboxStore(userDataDir);
  }

  listForUi(activeProjectId: string | null, includeArchived = false): ToolboxToolRecord[] {
    return this.store.listVisible(activeProjectId, includeArchived);
  }

  async reconcile(): Promise<void> {
    const toolsDir = path.join(toolboxRootDir(this.userDataDir), 'tools');
    try {
      await fs.access(toolsDir);
    } catch {
      return;
    }
    // Folders on disk without DB rows are ignored (no adoption).
  }

  private resolveRecord(
    scope: ToolboxScope | undefined,
    name: string,
    ctx: ToolboxCallContext,
  ): ToolboxToolRecord | null {
    if (scope === 'project') {
      if (!ctx.activeCodeProjectId) {
        return null;
      }
      return this.store.getByScopeName('project', ctx.activeCodeProjectId, name);
    }
    if (scope === 'global') {
      return this.store.getByScopeName('global', null, name);
    }
    // No explicit scope specified:
    // If active project is set, project tool wins over global tool
    if (ctx.activeCodeProjectId) {
      const projRec = this.store.getByScopeName('project', ctx.activeCodeProjectId, name);
      if (projRec) {
        return projRec;
      }
    }
    // Fall back to global
    return this.store.getByScopeName('global', null, name);
  }

  async search(
    query: string,
    limit: number,
    ctx: ToolboxCallContext,
  ): Promise<ToolboxSearchResult> {
    const q = query.trim().slice(0, 200);
    const lim = Math.min(10, Math.max(1, limit || 6));
    const matches = this.store.searchFts(q, lim, ctx.activeCodeProjectId).map((r) => ({
      scope: r.scope,
      name: r.name,
      description: r.description,
    }));
    if (matches.length > 0) {
      return { ok: true, matches };
    }
    const all = this.store.listVisible(ctx.activeCodeProjectId).map((r) => ({
      scope: r.scope,
      name: r.name,
      description: r.description,
    }));
    return { ok: true, matches: [], allTools: all };
  }

  async get(nameArg: string, ctx: ToolboxCallContext): Promise<ToolboxGetResult> {
    const parsed = parseToolNameArg(nameArg);
    if ('ok' in parsed) {
      return { ok: false, error: parsed.error };
    }
    const { scope, name } = parsed;
    const rec = this.resolveRecord(scope, name, ctx);
    if (!rec || rec.archived) {
      return { ok: false, error: 'tool not found', code: 'not_found' };
    }
    const folder = toolFolderPath(this.userDataDir, rec.scope, rec.projectId, rec.name);
    const skillPath = path.join(folder, 'SKILL.md');
    let usageNotes = '';
    try {
      const skillRaw = await fs.readFile(skillPath, 'utf8');
      const parsedSkill = parseSkillMd(skillRaw);
      usageNotes = parsedSkill?.frontmatter.usageNotes ?? '';
    } catch {
      usageNotes = '';
    }
    const hashRes = await hashToolFolder(folder);
    if (!hashRes.ok) {
      return { ok: false, error: hashRes.error };
    }
    if (rec.approvedHash && rec.approvedHash !== hashRes.hash) {
      return {
        ok: false,
        error: 'tool files changed since approval; run requires a new approval card',
        code: 'approval_required',
      };
    }
    return {
      ok: true,
      scope: rec.scope,
      name: rec.name,
      description: rec.description,
      usageNotes,
      runtime: rec.runtime,
      entry: rec.entry,
      flags: rec.flags,
      keywords: rec.keywords,
    };
  }

  private async buildApprovalPayload(
    rec: ToolboxToolRecord,
    kind: 'save' | 'run',
    files: Array<{ path: string; content: string }>,
    declared: ToolboxCapabilityFlag[],
    usageNotes?: string,
  ): Promise<ToolboxApprovalPayload> {
    const scanned = detectCapabilitiesFromFiles(files);
    const { merged, undeclared } = mergeDeclaredAndScanned(declared, scanned);
    const capabilityLabels = merged.map((f) => CAPABILITY_LABELS[f] ?? f);
    return {
      kind,
      toolName: rec.name,
      scopeLabel: rec.scope === 'project' ? `project/${rec.name}` : `global/${rec.name}`,
      description: rec.description,
      usageNotes,
      files,
      declaredFlags: declared,
      scannedFlags: scanned,
      undeclaredFlags: undeclared,
      capabilityLabels,
    };
  }

  async run(
    nameArg: string,
    args: string[],
    timeoutSeconds: number,
    ctx: ToolboxCallContext,
    parent: BrowserWindow | undefined,
    approve: ToolboxApprovalFn = requestToolboxApproval,
  ): Promise<ToolboxRunResult> {
    const parsed = parseToolNameArg(nameArg);
    if ('ok' in parsed) {
      return { ok: false, error: parsed.error };
    }
    const { scope, name } = parsed;
    const rec = this.resolveRecord(scope, name, ctx);
    if (!rec || rec.archived) {
      return { ok: false, error: 'tool not found', code: 'not_found' };
    }
    const folder = toolFolderPath(this.userDataDir, rec.scope, rec.projectId, rec.name);
    const hashBefore = await hashToolFolder(folder);
    if (!hashBefore.ok) {
      return { ok: false, error: hashBefore.error };
    }
    const filesOnDisk = await readDirFiles(folder, folder);
    const filePreviews = await Promise.all(
      filesOnDisk.map(async (f) => ({
        path: f.rel,
        content: f.content.toString('utf8'),
      })),
    );
    const needsApproval =
      !rec.approvedHash ||
      rec.approvedHash !== hashBefore.hash ||
      rec.flags.length > 0 ||
      detectCapabilitiesFromFiles(filePreviews).length > 0;

    if (needsApproval) {
      const payload = await this.buildApprovalPayload(rec, 'run', filePreviews, rec.flags);
      const approved = await approve(parent, payload);
      if (!approved) {
        return { ok: false, error: 'declined', code: 'declined' };
      }
      const hashAfter = await hashToolFolder(folder);
      if (!hashAfter.ok) {
        return { ok: false, error: hashAfter.error };
      }
      if (hashAfter.hash !== hashBefore.hash) {
        return { ok: false, error: 'tool changed during approval', code: 'changed_during_approval' };
      }
      rec.approvedHash = hashAfter.hash;
      rec.updatedAt = new Date().toISOString();
      this.store.upsertTool(rec);
    }

    const entryPath = path.join(folder, rec.entry);
    const workDir = toolWorkDir(
      this.userDataDir,
      scopeKey(rec.scope, rec.projectId),
      rec.name,
    );
    await fs.mkdir(workDir, { recursive: true });
    const timeoutMs = Math.min(600, Math.max(1, timeoutSeconds || 60)) * 1000;
    const runRes = await runProcess({
      runtime: rec.runtime,
      entryPath,
      workDir,
      args: args.slice(0, 50).map((a) => String(a).slice(0, 4096)),
      timeoutMs,
      userDataDir: this.userDataDir,
    });
    if (!runRes.ok) {
      return runRes;
    }
    rec.lastRunAt = new Date().toISOString();
    rec.updatedAt = rec.lastRunAt;
    this.store.upsertTool(rec);
    return {
      ok: true,
      exitCode: runRes.exitCode,
      stdout: runRes.stdout,
      stderr: runRes.stderr,
    };
  }

  validateSaveInput(raw: Record<string, unknown>): { ok: true; data: SaveInput } | { ok: false; error: string } {
    return validateSaveArgs(raw);
  }

  async save(
    raw: Record<string, unknown>,
    ctx: ToolboxCallContext,
    parent: BrowserWindow | undefined,
    approve: ToolboxApprovalFn = requestToolboxApproval,
  ): Promise<ToolboxSaveResult> {
    const validated = validateSaveArgs(raw);
    if (!validated.ok) {
      return { ok: false, error: validated.error };
    }
    const input = validated.data;
    if (input.scope === 'project' && !ctx.activeCodeProjectId) {
      return { ok: false, error: 'active code project required for project scope' };
    }
    const projectId = input.scope === 'project' ? ctx.activeCodeProjectId : null;
    const secrets = findSecrets(input.files);
    if (secrets.length > 0) {
      const first = secrets[0];
      return {
        ok: false,
        error: `hardcoded secret at ${first.file}:${first.line}`,
        code: 'secret',
      };
    }
    const existing = this.store.getByScopeName(input.scope, projectId, input.name);
    if (input.mode === 'create' && existing && !existing.archived) {
      return { ok: false, error: 'tool name already exists', code: 'duplicate' };
    }
    if (input.mode === 'update' && (!existing || existing.archived)) {
      return { ok: false, error: 'tool not found for update', code: 'not_found' };
    }

    const id = existing?.id ?? randomUUID();
    const version = existing ? existing.version + 1 : 1;
    const now = new Date().toISOString();
    const rec: ToolboxToolRecord = {
      id,
      scope: input.scope,
      projectId,
      name: input.name,
      description: input.description,
      keywords: input.keywords,
      runtime: input.runtime,
      entry: input.entry,
      os: input.os,
      flags: input.flags,
      approvedHash: null,
      pinned: existing?.pinned ?? false,
      archived: false,
      version,
      lastRunAt: existing?.lastRunAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const payload = await this.buildApprovalPayload(
      rec,
      'save',
      input.files,
      input.flags,
      input.usageNotes,
    );
    const approved = await approve(parent, payload);
    if (!approved) {
      return { ok: false, error: 'declined', code: 'declined' };
    }

    const dest = toolFolderPath(this.userDataDir, input.scope, projectId, input.name);
    const temp = `${dest}.pending-${randomUUID()}`;
    try {
      if (await pathExists(dest) && !existing) {
        const aside = `${dest}.orphan-${Date.now()}`;
        await fs.rename(dest, aside);
      }
      await fs.mkdir(temp, { recursive: true });
      for (const file of input.files) {
        const target = path.join(temp, file.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, file.content, 'utf8');
      }
      const skillBody = input.usageNotes ? `\n${input.usageNotes}\n` : '\n';
      const skillMd = buildSkillMd(
        {
          name: input.name,
          description: input.description,
          keywords: input.keywords,
          runtime: input.runtime,
          entry: input.entry,
          os: input.os ?? undefined,
          flags: input.flags,
          usageNotes: input.usageNotes,
          version,
        },
        skillBody,
      );
      await fs.writeFile(path.join(temp, 'SKILL.md'), skillMd, 'utf8');

      if (existing) {
        const hist = toolHistoryDir(
          this.userDataDir,
          scopeKey(existing.scope, existing.projectId),
          existing.name,
          existing.version,
          now.replace(/[:.]/g, '-'),
        );
        await fs.mkdir(path.dirname(hist), { recursive: true });
        await fs.cp(dest, hist, { recursive: true, force: true });
        const histParent = path.dirname(hist);
        const entries = await fs.readdir(histParent).catch(() => []);
        if (entries.length > 5) {
          entries.sort();
          const toRemove = entries.slice(0, entries.length - 5);
          for (const ent of toRemove) {
            await fs.rm(path.join(histParent, ent), { recursive: true, force: true }).catch(() => undefined);
          }
        }
      }

      const backup = `${dest}.backup-${randomUUID()}`;
      let hadDest = false;
      if (await pathExists(dest)) {
        hadDest = true;
        await fs.rename(dest, backup);
      }
      try {
        await fs.rename(temp, dest);
        if (hadDest) {
          await fs.rm(backup, { recursive: true, force: true }).catch(() => undefined);
        }
      } catch (renameErr) {
        if (hadDest) {
          await fs.rename(backup, dest).catch(() => undefined);
        }
        throw renameErr;
      }

      const hashRes = await hashToolFolder(dest);
      if (!hashRes.ok) {
        return { ok: false, error: hashRes.error };
      }
      rec.approvedHash = hashRes.hash;
      this.store.upsertTool(rec);
      return { ok: true, id, version };
    } catch (e) {
      await fs.rm(temp, { recursive: true, force: true }).catch(() => undefined);
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  close(): void {
    this.store.close();
  }
}

type SaveInput = {
  mode: 'create' | 'update';
  scope: ToolboxScope;
  name: string;
  description: string;
  keywords: string[];
  runtime: ToolboxRuntime;
  entry: string;
  os: string[] | null;
  flags: ToolboxCapabilityFlag[];
  files: Array<{ path: string; content: string }>;
  usageNotes?: string;
};

function validateSaveArgs(raw: Record<string, unknown>): { ok: true; data: SaveInput } | { ok: false; error: string } {
  const mode = raw.mode === 'update' ? 'update' : 'create';
  const scope = raw.scope === 'global' ? 'global' : raw.scope === 'project' ? 'project' : null;
  if (!scope) {
    return { ok: false, error: 'scope must be global or project' };
  }
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!NAME_RE.test(name) || name.length < 2 || name.length > 49) {
    return { ok: false, error: 'invalid tool name' };
  }
  const description = typeof raw.description === 'string' ? raw.description.trim() : '';
  if (description.length < 25 || description.length > 300) {
    return { ok: false, error: 'description must be 25–300 characters' };
  }
  const usageNotes = typeof raw.usage_notes === 'string' ? raw.usage_notes.trim() : undefined;
  const runtime = raw.runtime as ToolboxRuntime;
  if (!['node', 'python', 'powershell', 'bash'].includes(runtime)) {
    return { ok: false, error: 'invalid runtime' };
  }
  const entry = typeof raw.entry === 'string' ? raw.entry.trim() : '';
  const entrySafe = safeRelPath(entry);
  if (!entrySafe.ok) {
    return { ok: false, error: entrySafe.error };
  }
  const keywordsRaw = Array.isArray(raw.keywords) ? raw.keywords : [];
  const keywords: string[] = [];
  for (const k of keywordsRaw.slice(0, 12)) {
    if (typeof k !== 'string') {
      continue;
    }
    const w = k.trim().toLowerCase();
    if (/^[a-z0-9-]{2,32}$/.test(w)) {
      keywords.push(w);
    }
  }
  const flagsRaw = Array.isArray(raw.flags) ? raw.flags : [];
  const allowedFlags: ToolboxCapabilityFlag[] = [
    'network',
    'deletes-files',
    'runs-commands',
    'credentials',
    'writes-files',
    'installs-software',
  ];
  const flags = flagsRaw.filter(
    (f): f is ToolboxCapabilityFlag => typeof f === 'string' && allowedFlags.includes(f as ToolboxCapabilityFlag),
  );
  const osRaw = Array.isArray(raw.os) ? raw.os : [];
  const os =
    osRaw.length === 0
      ? null
      : osRaw.filter((x): x is string => typeof x === 'string' && ['win32', 'darwin', 'linux'].includes(x));
  const filesRaw = Array.isArray(raw.files) ? raw.files : [];
  if (filesRaw.length < 1 || filesRaw.length > 20) {
    return { ok: false, error: 'files must contain 1–20 items' };
  }
  const files: Array<{ path: string; content: string }> = [];
  let totalBytes = 0;
  const paths = new Set<string>();
  for (const item of filesRaw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'invalid file entry' };
    }
    const p = typeof (item as { path?: unknown }).path === 'string' ? (item as { path: string }).path : '';
    const safe = safeRelPath(p);
    if (!safe.ok) {
      return { ok: false, error: safe.error };
    }
    if (paths.has(safe.normalized)) {
      return { ok: false, error: 'duplicate file path' };
    }
    paths.add(safe.normalized);
    const content = typeof (item as { content?: unknown }).content === 'string'
      ? (item as { content: string }).content
      : '';
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes > MAX_FILE_BYTES) {
      return { ok: false, error: 'file exceeds 100 KB' };
    }
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) {
      return { ok: false, error: 'total file size exceeds 500 KB' };
    }
    files.push({ path: safe.normalized, content });
  }
  if (!paths.has(entrySafe.normalized)) {
    return { ok: false, error: 'entry must be one of files' };
  }
  const ext = path.extname(entrySafe.normalized).toLowerCase();
  const runtimeExtOk =
    (runtime === 'node' && ['.js', '.mjs', '.cjs'].includes(ext)) ||
    (runtime === 'python' && ext === '.py') ||
    (runtime === 'powershell' && ext === '.ps1') ||
    (runtime === 'bash' && ext === '.sh');
  if (!runtimeExtOk) {
    return { ok: false, error: 'entry extension does not match runtime' };
  }
  return {
    ok: true,
    data: {
      mode,
      scope,
      name,
      description,
      keywords,
      runtime,
      entry: entrySafe.normalized,
      os,
      flags,
      files,
      usageNotes,
    },
  };
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

let singleton: ToolboxService | null = null;

export function getToolboxService(userDataDir: string): ToolboxService {
  if (!singleton) {
    singleton = new ToolboxService(userDataDir);
  }
  return singleton;
}

export function resetToolboxServiceForTests(): void {
  if (singleton) {
    singleton.close();
  }
  singleton = null;
}

import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { ToolboxCapabilityFlag, ToolboxRuntime } from './types';

export type SkillFrontmatter = {
  name: string;
  description: string;
  keywords: string[];
  runtime: ToolboxRuntime;
  entry: string;
  os?: string[];
  flags: ToolboxCapabilityFlag[];
  usageNotes?: string;
  version?: number;
};

export function parseSkillMd(content: string): { frontmatter: SkillFrontmatter; body: string } | null {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/m.exec(content);
  if (!match) {
    return null;
  }
  const raw = parseYaml(match[1]);
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const name = typeof o.name === 'string' ? o.name : '';
  const description = typeof o.description === 'string' ? o.description : '';
  const runtime = typeof o.runtime === 'string' ? o.runtime : 'node';
  const entry = typeof o.entry === 'string' ? o.entry : '';
  const keywords = Array.isArray(o.keywords)
    ? o.keywords.filter((k): k is string => typeof k === 'string')
    : [];
  const flags = Array.isArray(o.flags)
    ? o.flags.filter((f): f is ToolboxCapabilityFlag => typeof f === 'string')
    : [];
  const os = Array.isArray(o.os) ? o.os.filter((x): x is string => typeof x === 'string') : undefined;
  const usageNotes = typeof o.usageNotes === 'string' ? o.usageNotes : undefined;
  const version = typeof o.version === 'number' ? o.version : undefined;
  return {
    frontmatter: {
      name,
      description,
      keywords,
      runtime: runtime as ToolboxRuntime,
      entry,
      os,
      flags,
      usageNotes,
      version,
    },
    body: match[2] ?? '',
  };
}

export function buildSkillMd(fm: SkillFrontmatter, body: string): string {
  const doc = {
    name: fm.name,
    description: fm.description,
    keywords: fm.keywords,
    runtime: fm.runtime,
    entry: fm.entry,
    ...(fm.os?.length ? { os: fm.os } : {}),
    flags: fm.flags,
    ...(fm.usageNotes ? { usageNotes: fm.usageNotes } : {}),
    ...(fm.version != null ? { version: fm.version } : {}),
  };
  return `---\n${stringifyYaml(doc).trim()}\n---\n${body}`;
}

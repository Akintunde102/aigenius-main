import fs from 'fs';
import path from 'path';
import type { DeviceFolderStructureMap } from './device-folder-structure-map.js';
import { formatDeviceFolderStructureMapForPrompt } from './device-folder-structure-map.js';
import { shouldSkipSearchIndexing } from './exemptions.js';
import { isPathUnderAnyRoot } from '../device-fast-index-db-routing.js';

export type PocketPlannerOptions = {
  existingSuggestedDirectories?: string[];
  registeredCodeProjectRoots?: string[];
};

export const DEFAULT_DEVICE_POCKET_PLANNER_MODEL =
  process.env.AIGENIUS_DEVICE_POCKET_MODEL?.trim() || 'tencent/hy3';

export type PocketPlannerResult = {
  additionalDirectories: string[];
  model: string;
  rawText?: string;
};

function openRouterApiKey(): string | null {
  const key =
    process.env.OPENROUTER_API_KEY?.trim()
    || process.env.PROVIDER_OPENROUTER_API_KEY?.trim();
  return key || null;
}

function openRouterChatCompletionsUrl(): string {
  const raw =
    process.env.OPENROUTER_API_URL?.trim()
    || 'https://openrouter.ai/api/v1/chat/completions';
  return raw.replace(/\/chat\/completions\/?$/i, '/chat/completions');
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1]!.trim() : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toLookupPath(p: string): string {
  const n = path.normalize(p);
  return process.platform === 'win32' ? n.toLowerCase() : n;
}

function normalizePlannerPath(
  input: string,
  home: string,
  baselineAbs: Set<string>,
  skipAbs: Set<string>,
  registeredProjectRoots: string[],
): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const abs = path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.normalize(path.join(home, trimmed));
  const relHome = process.platform === 'win32'
    ? path.relative(home.toLowerCase(), abs.toLowerCase())
    : path.relative(home, abs);
  if (!relHome || relHome.startsWith('..') || path.isAbsolute(relHome)) return null;
  const lookup = toLookupPath(abs);
  if (baselineAbs.has(lookup)) return null;
  if (skipAbs.has(lookup)) return null;
  for (const root of registeredProjectRoots) {
    if (lookup === toLookupPath(root)) return null;
    if (isPathUnderAnyRoot(abs, [root])) return null;
  }
  if (shouldSkipSearchIndexing(abs)) return null;
  try {
    if (!fs.statSync(abs).isDirectory()) return null;
  } catch {
    return null;
  }
  return abs;
}

function formatPlannerSkipContext(options?: PocketPlannerOptions): string {
  const lines: string[] = [];
  const existing = options?.existingSuggestedDirectories ?? [];
  if (existing.length) {
    lines.push(`already_chosen_by_planner=${existing.map((p) => path.normalize(p)).join('; ')}`);
  }
  const projects = options?.registeredCodeProjectRoots ?? [];
  if (projects.length) {
    lines.push(
      `registered_code_project_roots=${projects.map((p) => path.normalize(p)).join('; ')}`,
    );
  }
  return lines.length ? `\n${lines.join('\n')}` : '';
}

export async function planAdditionalFastIndexDirectories(
  map: DeviceFolderStructureMap,
  fetchImpl: typeof fetch = fetch,
  options?: PocketPlannerOptions,
): Promise<PocketPlannerResult> {
  const model = DEFAULT_DEVICE_POCKET_PLANNER_MODEL;
  const baselineAbs = new Set(map.baselineFastDirs.map(toLookupPath));
  const skipAbs = new Set(
    (options?.existingSuggestedDirectories ?? []).map(toLookupPath),
  );
  const registeredProjectRoots = (options?.registeredCodeProjectRoots ?? []).map((p) =>
    path.normalize(p),
  );

  if (process.env.AIGENIUS_DEVICE_POCKET_PLANNER === '0') {
    return { additionalDirectories: [], model };
  }

  const apiKey = openRouterApiKey();
  if (!apiKey) {
    console.info('[device-pocket] Skipping Hy3 planner — no OpenRouter API key in env.');
    return { additionalDirectories: [], model };
  }

  const prompt = formatDeviceFolderStructureMapForPrompt(map);
  const system = [
    'You choose extra user home folders to prioritize for local desktop file search indexing.',
    'Desktop, Documents, and Downloads are already indexed first — do not repeat them.',
    'Do not repeat paths listed in already_chosen_by_planner or registered_code_project_roots in the user message.',
    'Registered code projects are indexed separately — never suggest their roots or subfolders.',
    'Pick 0–6 additional directories the user is likely to need (work, Dropbox, OneDrive, creative, etc.).',
    'Never pick system, cache, or dependency trees (AppData, node_modules, .git, Library/Caches, etc.).',
    'Respond with JSON only: {"additional_directories":["relative/or/absolute/path",...]}',
  ].join(' ');

  const res = await fetchImpl(openRouterChatCompletionsUrl(), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aigenius.local/desktop-indexer',
      'X-Title': 'AIGenius Device Fast Index Pocket',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 512,
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `User home layout:\n\n${prompt}${formatPlannerSkipContext(options)}\n\nReturn JSON additional_directories only.`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenRouter planner failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const rawText = payload.choices?.[0]?.message?.content ?? '';
  const parsed = extractJsonObject(rawText);
  const rawList = parsed?.additional_directories;
  const additional: string[] = [];
  if (Array.isArray(rawList)) {
    for (const item of rawList) {
      if (typeof item !== 'string') continue;
      const norm = normalizePlannerPath(
        item,
        map.home,
        baselineAbs,
        skipAbs,
        registeredProjectRoots,
      );
      if (norm) additional.push(norm);
    }
  }

  return { additionalDirectories: [...new Set(additional)], model, rawText };
}

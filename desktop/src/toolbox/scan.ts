import type { ToolboxCapabilityFlag } from './types';

const SECRET_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][^'"]{8,}['"]/i, label: 'api_key' },
  { re: /(?:secret|token|password)\s*[:=]\s*['"][^'"]{6,}['"]/i, label: 'credential' },
  { re: /sk-[a-zA-Z0-9]{20,}/, label: 'openai_style_key' },
  { re: /Bearer\s+[a-zA-Z0-9._-]{20,}/, label: 'bearer_token' },
];

export type SecretFinding = { file: string; line: number; label: string };

export function findSecrets(files: Array<{ path: string; content: string }>): SecretFinding[] {
  const findings: SecretFinding[] = [];
  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/tb-allow-secret/.test(line)) {
        continue;
      }
      for (const pat of SECRET_PATTERNS) {
        if (pat.re.test(line)) {
          findings.push({ file: file.path, line: i + 1, label: pat.label });
        }
      }
    }
  }
  return findings;
}

const CAPABILITY_RULES: Array<{ flag: ToolboxCapabilityFlag; re: RegExp }> = [
  { flag: 'network', re: /\bfetch\s*\(|axios\.|https?\.request|XMLHttpRequest|node-fetch|got\s*\(/i },
  { flag: 'deletes-files', re: /\bunlink(Sync)?\s*\(|fs\.rm(Sync)?\s*\(|os\.remove\s*\(|Remove-Item\b/i },
  {
    flag: 'writes-files',
    re:
      /writeFile(Sync)?\s*\(|appendFile(Sync)?\s*\(|createWriteStream\s*\(|copyFile(Sync)?\s*\(|open\s*\([^)]*['"][wa][a-z+]*['"]|write_(?:text|bytes)\s*\(|Set-Content\b|Out-File\b|Add-Content\b/i,
  },
  { flag: 'runs-commands', re: /\bexec(Sync)?\s*\(|spawn(Sync)?\s*\(|child_process|subprocess\.(run|Popen)|Start-Process\b/i },
  { flag: 'credentials', re: /process\.env\.|os\.environ|Get-ChildItem\s+Env:/i },
  { flag: 'installs-software', re: /\b(?:npm|pnpm)\s+(?:install|i|add)\b|\byarn\s+add\b|\b(?:pip|apt-get|winget|choco)\s+install\b/i },
];

export function detectCapabilities(source: string): ToolboxCapabilityFlag[] {
  const found = new Set<ToolboxCapabilityFlag>();
  for (const rule of CAPABILITY_RULES) {
    if (rule.re.test(source)) {
      found.add(rule.flag);
    }
  }
  return [...found];
}

export function detectCapabilitiesFromFiles(
  files: Array<{ path: string; content: string }>,
): ToolboxCapabilityFlag[] {
  const combined = files.map((f) => f.content).join('\n');
  return detectCapabilities(combined);
}

export function mergeDeclaredAndScanned(
  declared: ToolboxCapabilityFlag[],
  scanned: ToolboxCapabilityFlag[],
): { merged: ToolboxCapabilityFlag[]; undeclared: ToolboxCapabilityFlag[] } {
  const declaredSet = new Set(declared);
  const scannedSet = new Set(scanned);
  const merged = new Set<ToolboxCapabilityFlag>([...declaredSet, ...scannedSet]);
  const undeclared = scanned.filter((f) => !declaredSet.has(f));
  return { merged: [...merged], undeclared };
}

export const CAPABILITY_LABELS: Record<ToolboxCapabilityFlag, string> = {
  network: 'Uses the internet',
  'deletes-files': 'Deletes files',
  'runs-commands': 'Runs shell commands',
  credentials: 'Reads environment / credentials',
  'writes-files': 'Writes files',
  'installs-software': 'Installs software',
};

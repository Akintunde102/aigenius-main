import fs from 'fs';
import path from 'path';

export type LastCodeProjectRecord = {
  projectId: string;
  rootPath: string;
  name?: string;
};

export function lastCodeProjectFilePath(userDataPath: string): string {
  return path.join(userDataPath, 'last-code-project.json');
}

export function saveLastCodeProject(userDataPath: string, record: LastCodeProjectRecord): void {
  const target = lastCodeProjectFilePath(userDataPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, JSON.stringify(record), 'utf8');
}

export function loadLastCodeProject(userDataPath: string): LastCodeProjectRecord | null {
  try {
    const raw = fs.readFileSync(lastCodeProjectFilePath(userDataPath), 'utf8');
    const parsed = JSON.parse(raw) as LastCodeProjectRecord;
    if (!parsed?.projectId || !parsed?.rootPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

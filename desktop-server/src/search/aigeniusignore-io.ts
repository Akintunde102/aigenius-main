import fs from 'fs';
import path from 'path';
import { loadAigeniusIgnorePatterns } from './indexer/project-walk.js';

export function readAigeniusIgnoreFile(projectRoot: string): { path: string; content: string; patterns: string[] } {
  const root = path.resolve(projectRoot);
  const ignorePath = path.join(root, '.aigeniusignore');
  let content = '';
  try {
    content = fs.readFileSync(ignorePath, 'utf8');
  } catch {
    content = '';
  }
  return {
    path: ignorePath,
    content,
    patterns: loadAigeniusIgnorePatterns(root),
  };
}

export function writeAigeniusIgnoreFile(projectRoot: string, content: string): { path: string } {
  const root = path.resolve(projectRoot);
  const ignorePath = path.join(root, '.aigeniusignore');
  fs.writeFileSync(ignorePath, content, 'utf8');
  return { path: ignorePath };
}

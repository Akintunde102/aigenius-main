import { getAigeniusDesktopBridgeFromBrowsingContext } from '@/lib/utils/desktop-runtime';
import type { CodeProject } from '@/lib/calls/code-projects';
import { buildCodeProjectRootHealth } from './check-code-project-root-health';
import type { CodeProjectRootHealth } from './code-project-root-health.types';

export async function fetchCodeProjectRootHealth(
  project: Pick<CodeProject, 'id' | 'rootPath'>,
): Promise<CodeProjectRootHealth> {
  const checkedAtIso = new Date().toISOString();
  const bridge = getAigeniusDesktopBridgeFromBrowsingContext();
  const check = bridge?.checkCodeProjectRoot;
  if (!check) {
    return buildCodeProjectRootHealth(project.id, project.rootPath, null, checkedAtIso);
  }
  try {
    const result = await check(project.rootPath);
    return buildCodeProjectRootHealth(project.id, project.rootPath, result, checkedAtIso);
  } catch {
    return buildCodeProjectRootHealth(project.id, project.rootPath, null, checkedAtIso);
  }
}

export async function fetchAllCodeProjectRootHealth(
  projects: Array<Pick<CodeProject, 'id' | 'rootPath'>>,
): Promise<Record<string, CodeProjectRootHealth>> {
  const entries = await Promise.all(
    projects.map(async (project) => {
      const health = await fetchCodeProjectRootHealth(project);
      return [project.id, health] as const;
    }),
  );
  return Object.fromEntries(entries);
}

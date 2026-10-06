import type { CodeProject } from '@/lib/calls/code-projects';
import { codeProjectRootPathsEqual } from './code-project-root-path.utils';

export type RelinkCodeProjectWorkflowDeps = {
  pickDirectory: () => Promise<{ path: string } | null>;
  updateProject: (id: string, input: { rootPath: string }) => Promise<CodeProject>;
  syncDesktop: (project: CodeProject) => Promise<void>;
  clearDismiss: (projectId: string) => void;
};

export type RelinkCodeProjectResult =
  | { success: true; project: CodeProject; previousRootPath: string }
  | { success: false; error: string; canceled?: boolean };

export async function runRelinkCodeProjectWorkflow(
  project: Pick<CodeProject, 'id' | 'rootPath'>,
  deps: RelinkCodeProjectWorkflowDeps,
): Promise<RelinkCodeProjectResult> {
  const previousRootPath = project.rootPath;
  const picked = await deps.pickDirectory();
  if (!picked?.path?.trim()) {
    return { success: false, error: 'Folder selection canceled', canceled: true };
  }
  const nextPath = picked.path.trim();
  if (codeProjectRootPathsEqual(nextPath, previousRootPath)) {
    return { success: false, error: 'That folder is already linked to this project' };
  }
  try {
    const updated = await deps.updateProject(project.id, { rootPath: nextPath });
    deps.clearDismiss(project.id);
    await deps.syncDesktop(updated);
    return { success: true, project: updated, previousRootPath };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to relink project folder',
    };
  }
}

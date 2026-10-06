import type { CodeProject } from '@/lib/calls/code-projects';

export type RecreateCodeProjectRootWorkflowDeps = {
  recreateRoot: (rootPath: string) => Promise<
    | { ok: true; path: string; created: boolean }
    | { ok: false; error: string }
  >;
  syncDesktop: (project: CodeProject) => Promise<void>;
  clearDismiss: (projectId: string) => void;
  refreshHealth: (project: Pick<CodeProject, 'id' | 'rootPath'>) => Promise<void>;
};

export type RecreateCodeProjectRootResult =
  | { success: true; path: string; created: boolean }
  | { success: false; error: string };

export async function runRecreateCodeProjectRootWorkflow(
  project: CodeProject,
  deps: RecreateCodeProjectRootWorkflowDeps,
): Promise<RecreateCodeProjectRootResult> {
  const result = await deps.recreateRoot(project.rootPath);
  if (!result.ok) {
    return { success: false, error: result.error };
  }
  deps.clearDismiss(project.id);
  await deps.syncDesktop({ ...project, rootPath: result.path });
  await deps.refreshHealth({ id: project.id, rootPath: result.path });
  return { success: true, path: result.path, created: result.created };
}

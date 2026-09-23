import {
  createCodeProject,
  listCodeProjects,
  updateCodeProject,
  type CodeProject,
  type CreateCodeProjectInput,
} from '@/lib/calls/code-projects';
import { applyChatProjectScopeFromSession } from '@/lib/code-projects/apply-chat-project-scope';
import { setActiveCodeProject } from '@/lib/code-projects/active-code-project';
import { codeProjectRootPathsEqual } from '@/lib/code-projects/code-project-root-path.utils';
import { notifyCodeProjectsChanged } from '@/lib/code-projects/code-projects-events';
import {
  applyCreateNamedFolderResult,
  deriveProjectNameFromPath,
} from '@/lib/code-projects/named-project-folder.utils';
import { generateRandomProjectName } from '@/lib/code-projects/random-project-name';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

export const NAME_AND_FOLDER_REQUIRED = 'Name and folder path are required';

export type RunCreateCodeProjectInput = {
  name?: string;
  rootPath?: string;
  createFolder?: boolean;
  randomName?: boolean;
  rules?: string | null;
};

export type RunCreateCodeProjectSuccess = {
  success: true;
  project: CodeProject;
  folderCreated: boolean;
  reusedExistingFolder: boolean;
  reusedExistingProject: boolean;
  message: string;
};

export type RunCreateCodeProjectFailure = {
  success: false;
  error: string;
};

export type RunCreateCodeProjectResult = RunCreateCodeProjectSuccess | RunCreateCodeProjectFailure;

export type CreateCodeProjectWorkflowDeps = {
  listProjects: () => Promise<CodeProject[]>;
  createProject: (input: CreateCodeProjectInput) => Promise<CodeProject>;
  updateProject: (id: string, input: Partial<CreateCodeProjectInput>) => Promise<CodeProject>;
  generateName: () => string;
  createNamedFolder: (payload: {
    folderName: string;
    silent?: boolean;
  }) => Promise<
    | { ok: true; path: string; created?: boolean }
    | { ok: true; canceled: true }
    | { ok: false; error: string }
  >;
  isDesktop: () => boolean;
  notify: typeof notifyCodeProjectsChanged;
  selectAndScope: (project: CodeProject) => void;
};

function defaultDeps(): CreateCodeProjectWorkflowDeps {
  return {
    listProjects: listCodeProjects,
    createProject: createCodeProject,
    updateProject: updateCodeProject,
    generateName: generateRandomProjectName,
    createNamedFolder: async (payload) => {
      const bridge = typeof window !== 'undefined' ? window.aigeniusDesktop : undefined;
      if (!bridge || typeof bridge.createNamedProjectDirectory !== 'function') {
        throw new Error('Creating folders is available in the desktop app only');
      }
      return bridge.createNamedProjectDirectory(payload);
    },
    isDesktop: isAigeniusDesktopRuntime,
    notify: notifyCodeProjectsChanged,
    selectAndScope: (project) => {
      setActiveCodeProject({
        id: project.id,
        name: project.name,
        rootPath: project.rootPath,
        rules: project.rules,
      });
      applyChatProjectScopeFromSession(project.id, {
        id: project.id,
        name: project.name,
        rootPath: project.rootPath,
        rules: project.rules,
      });
    },
  };
}

function optionalString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalRules(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

function findProjectByRootPath(projects: CodeProject[], rootPath: string): CodeProject | undefined {
  return projects.find((project) => codeProjectRootPathsEqual(project.rootPath, rootPath));
}

function successMessage(input: {
  name: string;
  reusedExistingProject: boolean;
  reusedExistingFolder: boolean;
  folderCreated: boolean;
}): string {
  if (input.reusedExistingProject) {
    return `${input.name} already exists. Using that project and switched this chat to it.`;
  }
  if (input.reusedExistingFolder) {
    return `Registered existing folder as project ${input.name} and switched this chat to it.`;
  }
  if (input.folderCreated) {
    return `Created project ${input.name} and switched this chat to it.`;
  }
  return `Created project ${input.name} and switched this chat to it.`;
}

export async function runCreateCodeProject(
  input: RunCreateCodeProjectInput,
  deps: CreateCodeProjectWorkflowDeps = defaultDeps(),
): Promise<RunCreateCodeProjectResult> {
  const suppliedRootPath = optionalString(input.rootPath);
  const createFolder = input.createFolder ?? !suppliedRootPath;
  let name = optionalString(input.name);

  if (!name && input.randomName) {
    name = deps.generateName();
  }

  let rootPath = suppliedRootPath;
  let folderCreated = false;
  let reusedExistingFolder = false;

  if (createFolder && !suppliedRootPath) {
    if (!deps.isDesktop()) {
      return { success: false, error: NAME_AND_FOLDER_REQUIRED };
    }
    if (!name) {
      name = deps.generateName();
    }
    try {
      const folderResult = await deps.createNamedFolder({ folderName: name, silent: true });
      const applied = applyCreateNamedFolderResult(folderResult);
      if (applied.status === 'error') {
        return { success: false, error: applied.message };
      }
      if (applied.status === 'canceled') {
        return { success: false, error: NAME_AND_FOLDER_REQUIRED };
      }
      rootPath = applied.path;
      folderCreated = folderResult.ok === true && 'created' in folderResult && folderResult.created === true;
      reusedExistingFolder = folderResult.ok === true && 'created' in folderResult && folderResult.created === false;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Could not create folder',
      };
    }
  }

  if (!name && rootPath) {
    const listed = await deps.listProjects();
    name = deriveProjectNameFromPath(rootPath, listed);
  }

  if (!name || !rootPath) {
    return { success: false, error: NAME_AND_FOLDER_REQUIRED };
  }

  const projects = await deps.listProjects();
  const existing = findProjectByRootPath(projects, rootPath);
  const rules = optionalRules(input.rules);

  if (existing) {
    let project = existing;
    if (rules !== undefined && (existing.rules ?? '') !== rules) {
      project = await deps.updateProject(existing.id, { rules });
      deps.notify({ action: 'updated', project });
    } else {
      deps.notify({ action: 'created', project });
    }
    deps.selectAndScope(project);
    return {
      success: true,
      project,
      folderCreated,
      reusedExistingFolder,
      reusedExistingProject: true,
      message: successMessage({
        name: project.name,
        reusedExistingProject: true,
        reusedExistingFolder,
        folderCreated,
      }),
    };
  }

  const project = await deps.createProject({
    name,
    rootPath,
    rules: rules ?? null,
  });
  deps.notify({ action: 'created', project });
  deps.selectAndScope(project);
  return {
    success: true,
    project,
    folderCreated,
    reusedExistingFolder,
    reusedExistingProject: false,
    message: successMessage({
      name: project.name,
      reusedExistingProject: false,
      reusedExistingFolder,
      folderCreated,
    }),
  };
}

export async function runCreateCodeProjectFromToolArgs(
  args: Record<string, unknown>,
): Promise<RunCreateCodeProjectResult> {
  return runCreateCodeProject({
    name: optionalString(args.name) || undefined,
    rootPath: optionalString(args.rootPath) || undefined,
    createFolder: typeof args.createFolder === 'boolean' ? args.createFolder : undefined,
    randomName: args.randomName === true,
    rules: optionalRules(args.rules) ?? null,
  });
}

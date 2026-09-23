'use client';

import { useCallback, useEffect, useState } from 'react';
import { subscribeToTokenRefresh } from '@/lib/api/auth-client';
import {
  deleteCodeProject,
  listCodeProjects,
  type CodeProject,
  type CreateCodeProjectInput,
  updateCodeProject,
} from '@/lib/calls/code-projects';
import {
  getActiveCodeProject,
  setActiveCodeProject,
  subscribeActiveCodeProject,
  type ActiveCodeProjectSnapshot,
} from '@/lib/code-projects/active-code-project';
import {
  applyCodeProjectsChanged,
  notifyCodeProjectsChanged,
  subscribeCodeProjectsChanged,
} from '@/lib/code-projects/code-projects-events';
import { runCreateCodeProject } from '@/lib/code-projects/create-code-project-workflow';
import { useAuthReady } from '@/lib/hooks/useAuthReady';

export function useCodeProjects() {
  const authReady = useAuthReady();
  const [projects, setProjects] = useState<CodeProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProject, setActiveProjectState] = useState<ActiveCodeProjectSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listCodeProjects();
      setProjects(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    void refresh();
  }, [authReady, refresh]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    return subscribeToTokenRefresh(() => {
      void refresh();
    });
  }, [authReady, refresh]);

  useEffect(() => {
    setActiveProjectState(getActiveCodeProject());
    return subscribeActiveCodeProject(() => {
      setActiveProjectState(getActiveCodeProject());
    });
  }, []);

  useEffect(() => {
    return subscribeCodeProjectsChanged((detail) => {
      if (detail.action === 'refresh') {
        void refresh();
        return;
      }
      setProjects((prev) => applyCodeProjectsChanged(prev, detail));
    });
  }, [refresh]);

  const selectProject = useCallback((project: CodeProject | null) => {
    if (!project) {
      setActiveCodeProject(null);
      return;
    }
    setActiveCodeProject({
      id: project.id,
      name: project.name,
      rootPath: project.rootPath,
      rules: project.rules,
    });
  }, []);

  const addProject = useCallback(async (input: CreateCodeProjectInput) => {
    const result = await runCreateCodeProject({
      name: input.name,
      rootPath: input.rootPath,
      rules: input.rules,
      createFolder: false,
    });
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.project;
  }, []);

  const editProject = useCallback(async (id: string, input: Partial<CreateCodeProjectInput>) => {
    const updated = await updateCodeProject(id, input);
    notifyCodeProjectsChanged({ action: 'updated', project: updated });
    const active = getActiveCodeProject();
    if (active?.id === id) {
      selectProject(updated);
    }
    return updated;
  }, [selectProject]);

  const removeProject = useCallback(async (id: string) => {
    await deleteCodeProject(id);
    notifyCodeProjectsChanged({ action: 'deleted', id });
    const active = getActiveCodeProject();
    if (active?.id === id) {
      setActiveCodeProject(null);
    }
  }, []);

  return {
    projects,
    loading,
    error,
    refresh,
    activeProject,
    selectProject,
    addProject,
    editProject,
    removeProject,
  };
}

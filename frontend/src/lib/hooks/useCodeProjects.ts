'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  createCodeProject,
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

export function useCodeProjects() {
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
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setActiveProjectState(getActiveCodeProject());
    return subscribeActiveCodeProject(() => {
      setActiveProjectState(getActiveCodeProject());
    });
  }, []);

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
    const created = await createCodeProject(input);
    setProjects((prev) => [created, ...prev]);
    selectProject(created);
    return created;
  }, [selectProject]);

  const editProject = useCallback(async (id: string, input: Partial<CreateCodeProjectInput>) => {
    const updated = await updateCodeProject(id, input);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    const active = getActiveCodeProject();
    if (active?.id === id) {
      selectProject(updated);
    }
    return updated;
  }, [selectProject]);

  const removeProject = useCallback(async (id: string) => {
    await deleteCodeProject(id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
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

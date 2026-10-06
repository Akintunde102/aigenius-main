'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CodeProject } from '@/lib/calls/code-projects';
import type { CodeProjectRootHealth } from '@/lib/code-projects/code-project-root-health.types';
import { fetchAllCodeProjectRootHealth, fetchCodeProjectRootHealth } from '@/lib/code-projects/fetch-code-project-root-health';
import { setCodeProjectRootHealthMap } from '@/lib/code-projects/code-project-root-health-store';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

export function useCodeProjectRootHealth(projects: CodeProject[]) {
  const [healthByProjectId, setHealthByProjectId] = useState<Record<string, CodeProjectRootHealth>>({});
  const [checking, setChecking] = useState(false);
  const projectsKey = projects.map((p) => `${p.id}:${p.rootPath}`).join('|');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshAll = useCallback(async () => {
    if (!isAigeniusDesktopRuntime() || projects.length === 0) {
      if (mountedRef.current) {
        setHealthByProjectId({});
        setCodeProjectRootHealthMap({});
      }
      return;
    }
    setChecking(true);
    try {
      const map = await fetchAllCodeProjectRootHealth(projects);
      if (mountedRef.current) {
        setHealthByProjectId(map);
        setCodeProjectRootHealthMap(map);
      }
    } finally {
      if (mountedRef.current) {
        setChecking(false);
      }
    }
  }, [projects]);

  const refreshProject = useCallback(async (project: Pick<CodeProject, 'id' | 'rootPath'>) => {
    if (!isAigeniusDesktopRuntime()) {
      return;
    }
    const health = await fetchCodeProjectRootHealth(project);
    if (!mountedRef.current) {
      return;
    }
    setHealthByProjectId((prev) => {
      const next = { ...prev, [project.id]: health };
      setCodeProjectRootHealthMap(next);
      return next;
    });
  }, []);

  useEffect(() => {
    void refreshAll();
  }, [projectsKey, refreshAll]);

  return {
    healthByProjectId,
    checking,
    refreshAll,
    refreshProject,
  };
}

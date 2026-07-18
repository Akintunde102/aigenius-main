import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import {
  buildToolPermissionState,
  setAutoApproveAll as persistAutoApproveAll,
  setToolRequiresApproval as persistToolRequiresApproval,
  type ToolPermissionState,
} from '@/lib/tool-permissions/resolve';
import { readToolPermissionPreferences } from '@/lib/tool-permissions/storage';
import { useCallback, useEffect, useState } from 'react';

type DesktopSyncBridge = {
  syncToolPermissionPreferences?: (prefs: ReturnType<typeof readToolPermissionPreferences>) => Promise<void>;
};

function syncToDesktopMain(prefs: ReturnType<typeof readToolPermissionPreferences>): void {
  if (!isAigeniusDesktopRuntime()) {
    return;
  }
  const bridge = window.aigeniusDesktop as DesktopSyncBridge | undefined;
  void bridge?.syncToolPermissionPreferences?.(prefs);
}

export function useToolPermissions() {
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<ToolPermissionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    try {
      const prefs = readToolPermissionPreferences();
      setState(buildToolPermissionState(prefs));
      syncToDesktopMain(prefs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tool permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setAutoApproveAll = useCallback(
    (autoApproveAll: boolean) => {
      setError(null);
      try {
        const next = persistAutoApproveAll(autoApproveAll);
        setState(next);
        syncToDesktopMain(readToolPermissionPreferences());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update auto-approve setting');
      }
    },
    [],
  );

  const setToolRequiresApproval = useCallback((toolId: string, requiresApproval: boolean) => {
    setError(null);
    try {
      const next = persistToolRequiresApproval(toolId, requiresApproval);
      setState(next);
      syncToDesktopMain(readToolPermissionPreferences());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update tool permission');
    }
  }, []);

  return {
    loading,
    state,
    error,
    refresh,
    setAutoApproveAll,
    setToolRequiresApproval,
  };
}

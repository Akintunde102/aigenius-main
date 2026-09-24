import type { CodeProject } from '@/lib/calls/code-projects';

export const CODE_PROJECTS_CHANGED_EVENT = 'aigenius-code-projects-changed';

export type CodeProjectsChangedDetail = {
  action: 'created' | 'updated' | 'deleted' | 'refresh';
  project?: CodeProject;
  id?: string;
};

export function notifyCodeProjectsChanged(detail: CodeProjectsChangedDetail): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(CODE_PROJECTS_CHANGED_EVENT, { detail }));
}

export function subscribeCodeProjectsChanged(
  cb: (detail: CodeProjectsChangedDetail) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CodeProjectsChangedDetail>).detail;
    if (!detail) {
      return;
    }
    cb(detail);
  };
  window.addEventListener(CODE_PROJECTS_CHANGED_EVENT, handler);
  return () => {
    window.removeEventListener(CODE_PROJECTS_CHANGED_EVENT, handler);
  };
}

export function applyCodeProjectsChanged(
  prev: CodeProject[],
  detail: CodeProjectsChangedDetail,
): CodeProject[] {
  if (detail.action === 'created' && detail.project) {
    if (prev.some((p) => p.id === detail.project!.id)) {
      return prev;
    }
    return [detail.project, ...prev];
  }
  if (detail.action === 'updated' && detail.project) {
    return prev.map((p) => (p.id === detail.project!.id ? detail.project! : p));
  }
  if (detail.action === 'deleted' && detail.id) {
    return prev.filter((p) => p.id !== detail.id);
  }
  return prev;
}

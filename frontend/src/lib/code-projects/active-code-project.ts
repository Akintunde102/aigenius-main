const STORAGE_KEY = 'aigenius-active-code-project-v1';

export type ActiveCodeProjectSnapshot = {
  id: string;
  name: string;
  rootPath: string;
  rules?: string | null;
};

export function getActiveCodeProject(): ActiveCodeProjectSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveCodeProjectSnapshot;
    if (!parsed?.id || !parsed?.rootPath) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setActiveCodeProject(project: ActiveCodeProjectSnapshot | null): void {
  if (typeof window === 'undefined') return;
  if (!project) {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('aigenius-active-code-project-changed'));
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
  window.dispatchEvent(new CustomEvent('aigenius-active-code-project-changed'));
}

export function subscribeActiveCodeProject(cb: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => cb();
  window.addEventListener('aigenius-active-code-project-changed', handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener('aigenius-active-code-project-changed', handler);
    window.removeEventListener('storage', handler);
  };
}

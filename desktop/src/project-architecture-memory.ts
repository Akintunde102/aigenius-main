import { loopbackHttpUrl } from './loopback-host';
import { getRetrievalMemoryService } from './local-retrieval-memory';

function projectArchitectureSlug(projectId: string): string {
  const safe = projectId.replace(/[^a-zA-Z0-9-]/g, '-').slice(0, 40);
  return `project-${safe}-architecture`;
}

/**
 * After project indexing, refresh auto-generated architecture memory (best-effort).
 */
export async function refreshProjectArchitectureMemory(
  projectId: string,
  rootPath: string,
  projectName: string,
  delayMs = 20_000,
): Promise<void> {
  setTimeout(async () => {
    try {
      const port = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
      const token = process.env.AIGENIUS_SECRET_TOKEN;
      if (!token) return;

      const res = await fetch(loopbackHttpUrl(port, '/search/project-architecture'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rootPath, projectName }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { outline?: string };
      if (!data.outline?.trim()) return;

      const svc = getRetrievalMemoryService();
      await svc.upsert({
        slug: projectArchitectureSlug(projectId),
        name: `${projectName} architecture`,
        description: 'Auto-generated project structure and symbol index snapshot',
        tags: ['project', 'architecture', 'auto'],
        body: data.outline,
      });
      console.info('[aigenius-desktop] Updated project architecture memory for', projectName);
    } catch (err) {
      console.warn('[aigenius-desktop] project architecture memory refresh failed', err);
    }
  }, delayMs).unref?.();
}

import { createTieredIndexQueue } from '../tiered-index-queue.js';
import type { IndexJobScope } from '../tiered-index-queue.js';

describe('tiered-index-queue priority', () => {
  const scope: IndexJobScope = { dbPath: '/tmp/db.sqlite', projectRoot: '/proj' };

  it('drains fast_pocket before project_core even when project_core was enqueued first', async () => {
    const order: string[] = [];
    const queue = createTieredIndexQueue(async (item) => {
      order.push(`${item.tier}:${item.path}`);
    });

    queue.push({ type: 'change', path: '/proj/bulk.ts', phase: 'text' }, 'project_core', scope);
    queue.push({ type: 'change', path: '/Users/me/Desktop/a.txt', phase: 'text' }, 'fast_pocket', scope);

    await queue.flush(5_000);
    await queue.waitForIdle(5_000);

    expect(order[0]).toBe('fast_pocket:/Users/me/Desktop/a.txt');
    expect(order[1]).toBe('project_core:/proj/bulk.ts');
    queue.stop();
  });

  it('watcher full-pipeline items beat bulk text phase', async () => {
    const order: string[] = [];
    const queue = createTieredIndexQueue(async (item) => {
      order.push(`${item.tier}:${item.path}:${item.phase ?? 'full'}`);
    });

    queue.push({ type: 'change', path: '/proj/a.ts', phase: 'text' }, 'project_core', scope);
    queue.push({ type: 'change', path: '/proj/b.ts' }, 'project_core', scope);

    await queue.flush(5_000);
    await queue.waitForIdle(5_000);

    expect(order[0]).toContain('/proj/b.ts:full');
    queue.stop();
  });

  it('dedupes same path and phase in one tier', async () => {
    let count = 0;
    const queue = createTieredIndexQueue(async () => {
      count += 1;
    });

    queue.push({ type: 'change', path: '/proj/dup.ts', phase: 'text' }, 'fast_pocket', scope);
    queue.push({ type: 'change', path: '/proj/dup.ts', phase: 'text' }, 'fast_pocket', scope);

    await queue.flush(5_000);
    await queue.waitForIdle(5_000);
    expect(count).toBe(1);
    queue.stop();
  });
});

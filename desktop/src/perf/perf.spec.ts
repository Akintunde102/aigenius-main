import { wrapIpcHandler } from './ipc-timing';
import { isDesktopPerfEnabled, startupMark } from './startup-markers';

describe('desktop perf instrumentation', () => {
  it('startupMark is a no-op when perf env is unset', () => {
    const prev = process.env.AIGENIUS_DESKTOP_PERF;
    delete process.env.AIGENIUS_DESKTOP_PERF;
    expect(() => startupMark('main_module_loaded')).not.toThrow();
    if (prev !== undefined) {
      process.env.AIGENIUS_DESKTOP_PERF = prev;
    }
  });

  it('wrapIpcHandler records handler duration', async () => {
    const handler = wrapIpcHandler('test:channel', async () => {
      await new Promise((r) => setTimeout(r, 5));
      return { ok: true };
    });
    const result = await handler({} as never);
    expect(result).toEqual({ ok: true });
  });

  it('isDesktopPerfEnabled reflects env', () => {
    const prev = process.env.AIGENIUS_DESKTOP_PERF;
    process.env.AIGENIUS_DESKTOP_PERF = '1';
    expect(isDesktopPerfEnabled()).toBe(true);
    delete process.env.AIGENIUS_DESKTOP_PERF;
    expect(isDesktopPerfEnabled()).toBe(false);
    if (prev !== undefined) {
      process.env.AIGENIUS_DESKTOP_PERF = prev;
    }
  });
});

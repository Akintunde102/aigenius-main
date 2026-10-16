import { spawn } from 'child_process';
import { processRegistry } from '../process-registry';

describe('processRegistry', () => {
  beforeEach(() => {
    processRegistry.clear();
  });

  afterEach(() => {
    processRegistry.terminateAll();
    processRegistry.clear();
  });

  it('registers a process, tracks status, and lists it', () => {
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const tracked = processRegistry.register(
      child,
      'node sleeper',
      process.cwd(),
      'initial stdout',
      'initial stderr',
    );

    expect(tracked.pid).toBe(child.pid);
    expect(tracked.status).toBe('running');

    const list = processRegistry.list();
    expect(list).toHaveLength(1);
    expect(list[0].pid).toBe(child.pid);
    expect(list[0].command).toBe('node sleeper');
    expect(list[0].status).toBe('running');

    // Test getLogs
    const logs = processRegistry.getLogs(child.pid!);
    expect(logs.ok).toBe(true);
    if (logs.ok) {
      expect(logs.stdout).toContain('initial stdout');
      expect(logs.stderr).toContain('initial stderr');
    }

    // Test kill
    const killRes = processRegistry.kill(child.pid!);
    expect(killRes.ok).toBe(true);
    expect(tracked.status).toBe('killed');
  });

  it('returns appropriate errors for unknown pids', () => {
    expect(processRegistry.get(999999)).toBeUndefined();
    expect(processRegistry.getLogs(999999).ok).toBe(false);
    expect(processRegistry.kill(999999).ok).toBe(false);
  });
});

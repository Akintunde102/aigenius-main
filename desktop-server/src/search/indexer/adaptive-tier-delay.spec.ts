import { adaptiveTierDelayMs } from './adaptive-tier-delay.js';

describe('adaptiveTierDelayMs', () => {
  it('speeds up active-project text when queue is deep', () => {
    expect(adaptiveTierDelayMs('project_core', 'text', 5_000)).toBe(0);
  });

  it('slows background tier when queue is flooded', () => {
    const base = adaptiveTierDelayMs('background', 'text', 100);
    const flooded = adaptiveTierDelayMs('background', 'text', 10_000);
    expect(flooded).toBeGreaterThan(base);
  });
});

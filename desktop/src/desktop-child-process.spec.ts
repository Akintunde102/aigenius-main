import { sanitizeUtilityProcessEnv } from './desktop-child-process';

describe('sanitizeUtilityProcessEnv', () => {
  it('strips ELECTRON_RUN_AS_NODE so utility processes do not parse Chromium flags as Node args', () => {
    const env = sanitizeUtilityProcessEnv({
      PORT: '8001',
      ELECTRON_RUN_AS_NODE: '1',
      NODE_ENV: 'production',
      UNDEFINED: undefined,
    });

    expect(env).toEqual({
      PORT: '8001',
      NODE_ENV: 'production',
    });
    expect(env.ELECTRON_RUN_AS_NODE).toBeUndefined();
  });
});

import fs from 'fs';
import os from 'os';
import path from 'path';
import { resolveUpstreamApiUrl } from './resolve-upstream-api-url';

describe('resolveUpstreamApiUrl', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.AIGENIUS_UPSTREAM_API_URL;
    delete process.env.AIGENIUS_API_PORT;
    delete process.env.DEV_API_PORT;
  });

  afterAll(() => {
    process.env = env;
  });

  it('prefers AIGENIUS_UPSTREAM_API_URL', () => {
    process.env.AIGENIUS_UPSTREAM_API_URL = 'https://api.example.com';
    expect(resolveUpstreamApiUrl()).toBe('https://api.example.com');
  });

  it('reads desktop/package.env when env is unset', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-upstream-'));
    fs.writeFileSync(
      path.join(dir, 'package.env'),
      'AIGENIUS_UPSTREAM_API_URL=http://127.0.0.1:28000\n',
    );
    expect(resolveUpstreamApiUrl({ desktopRoot: dir })).toBe('http://127.0.0.1:28000');
  });

  it('prefers Tilt dev port over desktop/package.env', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-upstream-'));
    fs.writeFileSync(
      path.join(dir, 'package.env'),
      'AIGENIUS_UPSTREAM_API_URL=https://api.example.com\n',
    );
    process.env.AIGENIUS_API_PORT = '28000';
    expect(resolveUpstreamApiUrl({ desktopRoot: dir })).toBe('http://127.0.0.1:28000');
  });

  it('builds URL from AIGENIUS_API_PORT (Tilt)', () => {
    process.env.AIGENIUS_API_PORT = '28000';
    expect(resolveUpstreamApiUrl({ desktopRoot: '/nonexistent' })).toBe('http://127.0.0.1:28000');
  });

  it('falls back to DEV_API_PORT', () => {
    process.env.DEV_API_PORT = '28100';
    expect(resolveUpstreamApiUrl({ desktopRoot: '/nonexistent' })).toBe('http://127.0.0.1:28100');
  });

  it('defaults to legacy localhost:8000', () => {
    expect(resolveUpstreamApiUrl({ desktopRoot: '/nonexistent' })).toBe('http://localhost:8000');
  });
});

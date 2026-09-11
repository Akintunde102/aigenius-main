import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  isHostedProductionApiUrl,
  resolveUpstreamApiUrl,
} from './resolve-upstream-api-url';

describe('resolveUpstreamApiUrl', () => {
  const env = process.env;
  let tmpDesktopRoot: string;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.AIGENIUS_UPSTREAM_API_URL;
    delete process.env.AIGENIUS_API_PORT;
    delete process.env.DEV_API_PORT;
    tmpDesktopRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-upstream-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDesktopRoot, { recursive: true, force: true });
  });

  afterAll(() => {
    process.env = env;
  });

  it('uses local AIGENIUS_UPSTREAM_API_URL in unpackaged dev', () => {
    process.env.AIGENIUS_UPSTREAM_API_URL = 'http://localhost:28000';
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: false })).toBe(
      'http://localhost:28000',
    );
  });

  it('ignores hosted production AIGENIUS_UPSTREAM_API_URL in unpackaged dev', () => {
    process.env.AIGENIUS_UPSTREAM_API_URL = 'https://aigenius-api.noboxlabs.xyz';
    process.env.AIGENIUS_API_PORT = '28000';
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: false })).toBe(
      'http://127.0.0.1:28000',
    );
  });

  it('prefers Tilt dev port over desktop/package.env in unpackaged dev', () => {
    fs.writeFileSync(
      path.join(tmpDesktopRoot, 'package.env'),
      'AIGENIUS_UPSTREAM_API_URL=https://aigenius-api.noboxlabs.xyz\n',
    );
    process.env.AIGENIUS_API_PORT = '28000';
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: false })).toBe(
      'http://127.0.0.1:28000',
    );
  });

  it('reads desktop/package.env when packaged', () => {
    fs.writeFileSync(
      path.join(tmpDesktopRoot, 'package.env'),
      'AIGENIUS_UPSTREAM_API_URL=http://127.0.0.1:28000\n',
    );
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: true })).toBe(
      'http://127.0.0.1:28000',
    );
  });

  it('prefers AIGENIUS_UPSTREAM_API_URL when packaged', () => {
    process.env.AIGENIUS_UPSTREAM_API_URL = 'https://api.example.com';
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: true })).toBe(
      'https://api.example.com',
    );
  });

  it('builds URL from AIGENIUS_API_PORT (Tilt)', () => {
    process.env.AIGENIUS_API_PORT = '28000';
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: false })).toBe(
      'http://127.0.0.1:28000',
    );
  });

  it('falls back to DEV_API_PORT', () => {
    process.env.DEV_API_PORT = '28100';
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: false })).toBe(
      'http://127.0.0.1:28100',
    );
  });

  it('defaults to legacy localhost:8000 in unpackaged dev', () => {
    expect(resolveUpstreamApiUrl({ desktopRoot: tmpDesktopRoot, packaged: false })).toBe(
      'http://localhost:8000',
    );
  });

  it('detects hosted production API hosts', () => {
    expect(isHostedProductionApiUrl('https://aigenius-api.noboxlabs.xyz')).toBe(true);
    expect(isHostedProductionApiUrl('http://127.0.0.1:28000')).toBe(false);
  });
});

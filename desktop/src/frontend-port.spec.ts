import { resolveFrontendPort } from './frontend-port';

describe('resolveFrontendPort', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.AIGENIUS_FRONTEND_PORT;
    delete process.env.DEV_WEB_PORT;
    delete process.env.PORT;
  });

  afterAll(() => {
    process.env = env;
  });

  it('prefers AIGENIUS_FRONTEND_PORT', () => {
    process.env.AIGENIUS_FRONTEND_PORT = '3999';
    process.env.DEV_WEB_PORT = '23001';
    expect(resolveFrontendPort()).toBe('3999');
  });

  it('falls back to DEV_WEB_PORT (Tilt)', () => {
    process.env.DEV_WEB_PORT = '23001';
    expect(resolveFrontendPort()).toBe('23001');
  });

  it('falls back to PORT', () => {
    process.env.PORT = '3001';
    expect(resolveFrontendPort()).toBe('3001');
  });

  it('defaults to platform dev port 23001', () => {
    expect(resolveFrontendPort()).toBe('23001');
  });
});

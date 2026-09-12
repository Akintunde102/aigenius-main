import React from 'react';
import { render, waitFor } from '@testing-library/react';
import Login from '../page';
import {
  clearDesktopHandoffSession,
  resolveDesktopGoogleOAuthUrl,
  storeDesktopApiRoot,
  storeDesktopHandoffSession,
} from '@/lib/utils/desktop-google-auth-url';
import { storage } from '@/lib/utils/store';
import { storageConstants } from '@/lib/constants';

jest.mock('@/app/components/auth/AuthPage', () => ({
  AuthPage: () => <div data-testid="auth-page" />,
}));

jest.mock('@/lib/hooks/use-redirect-desktop-from-web-auth', () => ({
  useRedirectDesktopFromWebAuthPage: jest.fn(),
}));

jest.mock('@/lib/utils/desktop-google-auth-url', () => ({
  ...jest.requireActual('@/lib/utils/desktop-google-auth-url'),
  storeDesktopHandoffSession: jest.fn(),
  clearDesktopHandoffSession: jest.fn(),
  storeDesktopApiRoot: jest.fn(),
  resolveDesktopGoogleOAuthUrl: jest.fn(
    (callback: string, apiRoot: string, pkce?: string | null) =>
      `https://api.example.com/auth/_/google?cb=${encodeURIComponent(callback)}&pkce=${pkce ?? ''}&root=${encodeURIComponent(apiRoot)}`,
  ),
}));

jest.mock('@/lib/utils/resolve-auth-api-root', () => ({
  resolveAuthApiRootUrl: jest.fn(() => 'https://api.example.com'),
}));

function setLoginSearch(search: string) {
  window.history.pushState({}, '', `/login${search.startsWith('?') ? search : `?${search}`}`);
}

describe('Login page desktop handoff', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLoginSearch('');
    storage(storageConstants.NOBOX_TOKEN).removeItem();
  });

  it('stores desktop callback and pkce challenge from query params', async () => {
    setLoginSearch('?desktop_callback=http%3A%2F%2F127.0.0.1%3A49201%2F&pkce_challenge=challenge-123');

    render(<Login />);

    await waitFor(() => {
      expect(storeDesktopHandoffSession).toHaveBeenCalledWith({
        callback: 'http://127.0.0.1:49201/',
        pkceChallenge: 'challenge-123',
      });
    });
  });

  it('auto-redirects to Google OAuth with pkce when auto=google', async () => {
    setLoginSearch(
      '?desktop_callback=http%3A%2F%2F127.0.0.1%3A49201%2F&pkce_challenge=challenge-123&auto=google',
    );

    render(<Login />);

    await waitFor(() => {
      expect(resolveDesktopGoogleOAuthUrl).toHaveBeenCalledWith(
        'http://127.0.0.1:49201/',
        'https://api.example.com',
        'challenge-123',
      );
    });
  });

  it('persists api_root for desktop browser sign-in', async () => {
    setLoginSearch(
      '?desktop_callback=http%3A%2F%2F127.0.0.1%3A49201%2F&api_root=https%3A%2F%2Faigenius-api.noboxlabs.xyz',
    );

    render(<Login />);

    await waitFor(() => {
      expect(storeDesktopApiRoot).toHaveBeenCalledWith('https://aigenius-api.noboxlabs.xyz');
    });
  });

  it('clears stale desktop handoff on plain web login visits', async () => {
    setLoginSearch('');

    render(<Login />);

    await waitFor(() => {
      expect(clearDesktopHandoffSession).toHaveBeenCalled();
    });
    expect(storeDesktopHandoffSession).not.toHaveBeenCalled();
  });

  it('auto-starts Google OAuth for loopback desktop handoffs without auto=google', async () => {
    setLoginSearch('?desktop_callback=http%3A%2F%2F127.0.0.1%3A49201%2F&pkce_challenge=challenge-123');

    render(<Login />);

    await waitFor(() => {
      expect(storeDesktopHandoffSession).toHaveBeenCalled();
    });
    expect(clearDesktopHandoffSession).not.toHaveBeenCalled();
    expect(resolveDesktopGoogleOAuthUrl).toHaveBeenCalledWith(
      'http://127.0.0.1:49201/',
      'https://api.example.com',
      'challenge-123',
    );
  });
});

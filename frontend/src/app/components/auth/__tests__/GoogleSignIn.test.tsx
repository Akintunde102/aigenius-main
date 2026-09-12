import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { GoogleSignIn } from '../GoogleSignIn';
import { AUTH_CONFIG } from '@/lib/config/auth';
import { completeDesktopOAuthSession } from '@/lib/utils/complete-desktop-oauth-session';
import {
  readStoredDesktopCallback,
  readStoredDesktopPkceChallenge,
  resolveDesktopGoogleOAuthUrl,
} from '@/lib/utils/desktop-google-auth-url';
import {
  buildGoogleAuthUrl,
  resolveAuthApiRootUrlAsync,
} from '@/lib/utils/resolve-auth-api-root';
import '@testing-library/jest-dom';

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    unoptimized: _unoptimized,
    ...props
  }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

jest.mock('@/lib/utils/complete-desktop-oauth-session', () => ({
  completeDesktopOAuthSession: jest.fn(),
}));

jest.mock('@/lib/config/auth', () => ({
  AUTH_CONFIG: {
    ENABLE_DEV_LOGIN: false,
    GOOGLE_AUTH_URL: '/auth/google',
  },
}));

jest.mock('@/lib/utils/resolve-auth-api-root', () => ({
  buildGoogleAuthUrl: jest.fn(() => 'https://api.example.com/auth/_/google'),
  resolveAuthApiRootUrlAsync: jest.fn(async () => 'https://api.example.com'),
}));

jest.mock('@/lib/utils/desktop-google-auth-url', () => ({
  readStoredDesktopCallback: jest.fn(() => null),
  readStoredDesktopPkceChallenge: jest.fn(() => null),
  resolveDesktopGoogleOAuthUrl: jest.fn(
    (callback: string, apiRoot: string, pkceChallenge?: string | null) =>
      `https://api.example.com/auth/_/google?callback=${encodeURIComponent(callback)}&pkce=${pkceChallenge ?? ''}&root=${encodeURIComponent(apiRoot)}`,
  ),
}));

jest.mock('@/lib/utils/desktop-runtime', () => ({
  isAigeniusDesktopRuntime: jest.fn(() => false),
  waitForAigeniusDesktopBridge: jest.fn(async () => undefined),
}));

describe('GoogleSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete (window as Window & { aigeniusDesktop?: unknown }).aigeniusDesktop;
  });

  it('should not show Developer Login button when ENABLE_DEV_LOGIN is false', () => {
    // @ts-ignore
    AUTH_CONFIG.ENABLE_DEV_LOGIN = false;
    render(<GoogleSignIn />);
    expect(screen.queryByText(/Developer Login \(Bypass\)/i)).not.toBeInTheDocument();
  });

  it('should show Developer Login button when ENABLE_DEV_LOGIN is true', () => {
    // @ts-ignore
    AUTH_CONFIG.ENABLE_DEV_LOGIN = true;
    render(<GoogleSignIn />);
    expect(screen.getByText(/Developer Login \(Bypass\)/i)).toBeInTheDocument();
  });

  it('spaces the Google icon from the login label', () => {
    render(<GoogleSignIn />);
    const button = screen.getByRole('button', { name: 'Sign in with Google' });
    expect(button).toHaveClass('gap-3');
    expect(button.querySelector('img')).toBeInTheDocument();
    expect(button.querySelector('img')?.closest('span')).not.toBe(button);
  });

  it('spaces the Google icon from the signup label', () => {
    render(<GoogleSignIn variant="signup" />);
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toHaveClass('gap-3');
  });

  it('uses standard web Google OAuth when no desktop handoff is stored', async () => {
    render(<GoogleSignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      expect(buildGoogleAuthUrl).toHaveBeenCalledWith('https://api.example.com');
      expect(resolveDesktopGoogleOAuthUrl).not.toHaveBeenCalled();
      expect(readStoredDesktopCallback).toHaveBeenCalled();
      expect(readStoredDesktopPkceChallenge).not.toHaveBeenCalled();
    });
  });

  it('passes stored pkce challenge when redirecting a desktop browser handoff', async () => {
    const readCallback = readStoredDesktopCallback as jest.Mock;
    const readChallenge = readStoredDesktopPkceChallenge as jest.Mock;
    const resolveDesktopUrl = resolveDesktopGoogleOAuthUrl as jest.Mock;

    readCallback.mockReturnValue('http://127.0.0.1:49201/');
    readChallenge.mockReturnValue('challenge-123');

    render(<GoogleSignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      expect(resolveDesktopUrl).toHaveBeenCalledWith(
        'http://127.0.0.1:49201/',
        'https://api.example.com',
        'challenge-123',
      );
    });
  });

  it('still uses desktop OAuth URL when callback exists but pkce challenge is missing', async () => {
    const readCallback = readStoredDesktopCallback as jest.Mock;
    const readChallenge = readStoredDesktopPkceChallenge as jest.Mock;
    const resolveDesktopUrl = resolveDesktopGoogleOAuthUrl as jest.Mock;

    readCallback.mockReturnValue('http://127.0.0.1:49201/');
    readChallenge.mockReturnValue(null);

    render(<GoogleSignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      expect(resolveDesktopUrl).toHaveBeenCalledWith(
        'http://127.0.0.1:49201/',
        'https://api.example.com',
        null,
      );
    });
  });

  it('uses embedded desktop IPC OAuth instead of browser handoff session keys', async () => {
    const readCallback = readStoredDesktopCallback as jest.Mock;
    const resolveDesktopUrl = resolveDesktopGoogleOAuthUrl as jest.Mock;
    const startOAuthSignIn = jest.fn(async () => ({ token: 'desktop-access-token' }));

    readCallback.mockReturnValue('http://127.0.0.1:49201/');
    window.aigeniusDesktop = { isDesktop: true, startOAuthSignIn };

    const onDesktopOAuthToken = jest.fn();
    render(<GoogleSignIn onDesktopOAuthToken={onDesktopOAuthToken} />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      expect(startOAuthSignIn).toHaveBeenCalledWith({ provider: 'google' });
      expect(onDesktopOAuthToken).toHaveBeenCalledWith('desktop-access-token');
      expect(resolveDesktopUrl).not.toHaveBeenCalled();
      expect(readStoredDesktopCallback).not.toHaveBeenCalled();
      expect(readStoredDesktopPkceChallenge).not.toHaveBeenCalled();
    });
  });

  it('completes embedded desktop OAuth session when no parent handler is provided', async () => {
    const completeSession = completeDesktopOAuthSession as jest.Mock;
    completeSession.mockResolvedValue(true);

    window.aigeniusDesktop = {
      isDesktop: true,
      startOAuthSignIn: jest.fn(async () => ({ token: 'desktop-access-token' })),
    };

    render(<GoogleSignIn />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign in with Google' }));

    await waitFor(() => {
      expect(completeSession).toHaveBeenCalledWith('desktop-access-token');
    });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GoogleSignIn } from '../GoogleSignIn';
import { AUTH_CONFIG } from '@/lib/config/auth';
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

describe('GoogleSignIn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});

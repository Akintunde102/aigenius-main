import React from 'react';
import { render, screen } from '@testing-library/react';
import { GoogleSignIn } from '../GoogleSignIn';
import { AUTH_CONFIG } from '@/lib/config/auth';
import '@testing-library/jest-dom';

// Mock AUTH_CONFIG
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
});

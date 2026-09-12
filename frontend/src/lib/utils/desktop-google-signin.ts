export function resolveDesktopShellGoogleSignIn(desktop?: {
  startOAuthSignIn?: (options?: { provider?: 'google' }) => Promise<{ token?: string | null } | null>;
  startWebSignIn?: () => Promise<{ token?: string | null } | null>;
}): (() => Promise<{ token?: string | null } | null>) | null {
  if (desktop?.startOAuthSignIn) {
    return () => desktop.startOAuthSignIn!({ provider: 'google' });
  }
  if (desktop?.startWebSignIn) {
    return () => desktop.startWebSignIn!();
  }
  return null;
}

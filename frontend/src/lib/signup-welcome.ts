import { SIGNUP_BONUS_CREDITS } from '@/lib/credits';

export const SIGNUP_WELCOME_SESSION_KEY = 'aigenius-signup-welcome-pending';

export function getSignupWelcomeSeenKey(userId: string): string {
  return `aigenius-signup-welcome-seen:${userId}`;
}

export function markSignupWelcomeSessionPending(): void {
  try {
    sessionStorage.setItem(SIGNUP_WELCOME_SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
}

export function hasSignupWelcomeSessionPending(): boolean {
  try {
    return sessionStorage.getItem(SIGNUP_WELCOME_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearSignupWelcomeSessionPending(): void {
  try {
    sessionStorage.removeItem(SIGNUP_WELCOME_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function hasSeenSignupWelcomeForUser(userId: string): boolean {
  try {
    return localStorage.getItem(getSignupWelcomeSeenKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markSignupWelcomeSeenForUser(userId: string): void {
  try {
    localStorage.setItem(getSignupWelcomeSeenKey(userId), '1');
  } catch {
    /* ignore */
  }
}

export function shouldShowSignupWelcomeModal(args: {
  userId?: string | null;
  signupWelcomePending?: boolean;
}): boolean {
  const { userId, signupWelcomePending } = args;
  if (!userId) {
    return false;
  }

  if (hasSeenSignupWelcomeForUser(userId)) {
    return false;
  }

  return signupWelcomePending === true || hasSignupWelcomeSessionPending();
}

export function getSignupWelcomeCreditMessage(credits = SIGNUP_BONUS_CREDITS): string {
  return `${credits} free credits added to your wallet — start chatting now.`;
}

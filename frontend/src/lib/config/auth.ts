export const AUTH_CONFIG = {
    // Toggle for different authentication methods
    ENABLE_EMAIL_AUTH: process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === 'true',
    ENABLE_GOOGLE_AUTH: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH !== 'false', // Default to true
    ENABLE_GITHUB_AUTH: process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH === 'true',

    // Google OAuth configuration
    GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    GOOGLE_REDIRECT_URI: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '',

    // API endpoints
    GOOGLE_AUTH_URL: process.env.NEXT_PUBLIC_GOOGLE_AUTH_URL || '/auth/google',
    GOOGLE_CALLBACK_URL: process.env.NEXT_PUBLIC_GOOGLE_CALLBACK_URL || '/auth/google/callback',

    // Developer login bypass
    ENABLE_DEV_LOGIN: process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true' || process.env.NODE_ENV === 'development',
} as const;

export type AuthMethod = 'google' | 'email' | 'github';

export const getEnabledAuthMethods = (): AuthMethod[] => {
    const methods: AuthMethod[] = [];

    if (AUTH_CONFIG.ENABLE_GOOGLE_AUTH) methods.push('google');
    if (AUTH_CONFIG.ENABLE_EMAIL_AUTH) methods.push('email');
    if (AUTH_CONFIG.ENABLE_GITHUB_AUTH) methods.push('github');

    return methods;
};

"use client";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import Image from "next/image";
import { AUTH_CONFIG } from "@/lib/config/auth";
import { completeDesktopOAuthSession } from "@/lib/utils/complete-desktop-oauth-session";
import { syncAuthSessionCookiesFromStorage } from "@/lib/utils/auth-session";
import { resolveAuthenticatedDesktopShellRedirect } from "@/lib/utils/safe-internal-next-path";
import { resolveDesktopGoogleOAuthUrl } from "@/lib/utils/desktop-google-auth-url";
import {
    isAigeniusDesktopRuntime,
    waitForAigeniusDesktopBridge,
} from "@/lib/utils/desktop-runtime";
import {
    buildDevLoginUrl,
    buildGoogleAuthUrl,
    resolveAuthApiRootUrlAsync,
} from "@/lib/utils/resolve-auth-api-root";

export type DesktopAuthFlowPhase = "idle" | "awaiting-browser" | "completing";

interface GoogleSignInProps {
    variant?: 'login' | 'signup';
    className?: string;
    /**
     * Light marketing cards (e.g. home hero): use dark secondary text so `text-muted-foreground`
     * / ghost buttons stay readable on white.
     */
    lightSurface?: boolean;
    /** Desktop shell: show a full-page loading state while OAuth finishes. */
    onDesktopAuthFlowChange?: (phase: DesktopAuthFlowPhase) => void;
    /** Desktop shell: parent handles token exchange (deduped with IPC push). */
    onDesktopOAuthToken?: (token: string) => void | Promise<void>;
}

export const GoogleSignIn = ({
    variant = 'login',
    className = '',
    lightSurface = false,
    onDesktopAuthFlowChange,
    onDesktopOAuthToken,
}: GoogleSignInProps) => {
    const [isDesktopSigningIn, setIsDesktopSigningIn] = useState(false);

    const setDesktopAuthFlow = (phase: DesktopAuthFlowPhase) => {
        onDesktopAuthFlowChange?.(phase);
    };

    const handleGoogleSignIn = async () => {
        const likelyDesktop =
            typeof window !== 'undefined'
            && (isAigeniusDesktopRuntime() || window.aigeniusDesktop?.startOAuthSignIn);

        if (likelyDesktop) {
            setIsDesktopSigningIn(true);
            setDesktopAuthFlow('awaiting-browser');
            await waitForAigeniusDesktopBridge(10_000);
        }

        const apiRoot = await resolveAuthApiRootUrlAsync();
        const url = buildGoogleAuthUrl(apiRoot);
        console.log('[GoogleSignIn Debug] resolved apiRoot:', apiRoot);
        console.log('[GoogleSignIn Debug] resolved final auth url:', url);
        if (!url || url.includes('undefined')) {
            console.error('[GoogleSignIn] Auth API root is not configured. Set NEXT_PUBLIC_AIGENIUS_API_ROOT_URL in your environment.');
            if (likelyDesktop) {
                setDesktopAuthFlow('idle');
                setIsDesktopSigningIn(false);
            }
            return;
        }
        if (typeof window !== 'undefined' && window.aigeniusDesktop?.startOAuthSignIn) {
            try {
                const res = await window.aigeniusDesktop.startOAuthSignIn({ provider: 'google' });
                if (res?.token) {
                    if (onDesktopOAuthToken) {
                        await onDesktopOAuthToken(res.token);
                        return;
                    }
                    setDesktopAuthFlow('completing');
                    const ok = await completeDesktopOAuthSession(res.token);
                    if (!ok) {
                        console.error('[GoogleSignIn] OAuth token exchange failed');
                        setDesktopAuthFlow('idle');
                        setIsDesktopSigningIn(false);
                        return;
                    }
                    syncAuthSessionCookiesFromStorage();
                    const target = resolveAuthenticatedDesktopShellRedirect(
                        window.location.pathname,
                        window.location.search,
                    );
                    window.location.replace(target);
                    return;
                }
                setDesktopAuthFlow('idle');
                setIsDesktopSigningIn(false);
            } catch (error) {
                console.error('[GoogleSignIn] Desktop OAuth failed', error);
                setDesktopAuthFlow('idle');
                setIsDesktopSigningIn(false);
            }
            return;
        }
        if (likelyDesktop) {
            setDesktopAuthFlow('idle');
            setIsDesktopSigningIn(false);
        }
        try {
            const desktopCallback = sessionStorage.getItem('desktop_callback');
            if (desktopCallback) {
                window.location.href = resolveDesktopGoogleOAuthUrl(desktopCallback, apiRoot);
                return;
            }
        } catch {
            /* ignore */
        }
        window.location.href = url;
    };

    const handleDevLogin = async () => {
        const apiRoot = await resolveAuthApiRootUrlAsync();
        // Redirect to backend dev-login endpoint
        let email: string | null = null;
        try {
            email = prompt("Enter email for dev login:", "test@example.com");
        } catch (e) {
            console.warn("prompt() is not supported in this environment, falling back to default dev email.");
        }
        // Fallback for automated browser environments or when prompt dialogs are not supported/cancelled
        if (!email && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            email = "test@example.com";
        }
        if (email) {
            window.location.href = `${buildDevLoginUrl(apiRoot)}?email=${encodeURIComponent(email)}`;
        }
    };

    const buttonText = variant === 'signup' ? 'Continue with Google' : 'Sign in with Google';

    return (
        <div className="flex flex-col gap-3 w-full">
            <Button
                onClick={handleGoogleSignIn}
                disabled={isDesktopSigningIn}
                variant="outline"
                className={`w-full h-12 font-medium border-primary/20 hover:border-primary/40 hover:scale-[1.02] transition-all duration-200 ${className}`}
            >
                <Image
                    src="/assets/google-icon.svg"
                    alt="Google"
                    width={20}
                    height={20}
                    unoptimized
                    className="mr-3"
                />
                {buttonText}
            </Button>

            {AUTH_CONFIG.ENABLE_DEV_LOGIN && (
                <button
                    type="button"
                    onClick={handleDevLogin}
                    className="secondary-btn"
                >
                    Developer Login (Bypass)
                </button>
            )}
        </div>
    );
};

export default GoogleSignIn;

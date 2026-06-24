"use client";
import { Button } from "@/app/components/ui/button";
import { LINKS } from "@/lib/links";
import Image from "next/image";
import { AUTH_CONFIG } from "@/lib/config/auth";

interface GoogleSignInProps {
    variant?: 'login' | 'signup';
    className?: string;
    /**
     * Light marketing cards (e.g. home hero): use dark secondary text so `text-muted-foreground`
     * / ghost buttons stay readable on white.
     */
    lightSurface?: boolean;
}

export const GoogleSignIn = ({
    variant = 'login',
    className = '',
    lightSurface = false,
}: GoogleSignInProps) => {
    const handleGoogleSignIn = () => {
        // Redirect to Google OAuth endpoint
        window.location.href = LINKS.googleLogin;
    };

    const handleDevLogin = () => {
        // Redirect to backend dev-login endpoint
        let email = prompt("Enter email for dev login:", "test@example.com");
        // Fallback for automated browser environments where prompt dialogs are auto-dismissed
        if (email === null && typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            email = "test@example.com";
        }
        if (email) {
            window.location.href = `${LINKS.googleLogin.replace('google', 'dev-login')}?email=${encodeURIComponent(email)}`;
        }
    };

    const buttonText = variant === 'signup' ? 'Continue with Google' : 'Sign in with Google';

    return (
        <div className="flex flex-col gap-3 w-full">
            <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className={`w-full h-12 font-medium border-primary/20 hover:border-primary/40 hover:scale-[1.02] transition-all duration-200 ${className}`}
            >
                <Image
                    src="/assets/google-icon.svg"
                    alt="Google"
                    width={20}
                    height={20}
                    className="mr-3"
                />
                {buttonText}
            </Button>

            {AUTH_CONFIG.ENABLE_DEV_LOGIN && (
                <Button
                    onClick={handleDevLogin}
                    variant="ghost"
                    className={
                        lightSurface
                            ? "w-full text-xs text-slate-500 hover:text-slate-800 transition-colors bg-slate-100/50 hover:bg-slate-100 py-1.5 rounded-lg border border-dashed border-slate-300"
                            : "w-full text-xs text-slate-400 hover:text-white transition-colors bg-slate-800/40 hover:bg-slate-800/80 py-1.5 rounded-lg border border-dashed border-slate-700/60"
                    }
                >
                    Developer Login (Bypass)
                </Button>
            )}
        </div>
    );
};

export default GoogleSignIn;

"use client";
import Link from "next/link";
import { BrandLogo } from "@/app/components/BrandLogo";

interface AuthNavProps {
    variant: 'login' | 'signup';
}

export const AuthNav = ({ variant }: AuthNavProps) => {
    return (
        <nav className="absolute top-0 left-0 right-0 z-50 p-6">
            <div className="flex items-center justify-between">
                <BrandLogo />

                <div className="flex items-center space-x-4">
                    {variant === 'login' ? (
                        <Link
                            prefetch
                            href="/signup"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden min-[484px]:block"
                        >
                            Don&apos;t have an account? Sign up
                        </Link>
                    ) : (
                        <Link
                            prefetch
                            href="/login"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden min-[484px]:block"
                        >
                            Already have an account? Sign in
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

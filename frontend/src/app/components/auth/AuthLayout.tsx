"use client";
import { ReactNode } from "react";

interface AuthLayoutProps {
    children: ReactNode;
    title: string;
    subtitle: string;
}

export const AuthLayout = ({ children, title, subtitle }: AuthLayoutProps) => {
    return (
        <div className="min-h-screen flex">
            {/* Left side - Form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-auth-bg">
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">
                            {title}
                        </h1>
                        <p className="text-muted-foreground">
                            {subtitle}
                        </p>
                    </div>
                    {children}
                </div>
            </div>

            {/* Right side - Product Info */}
            <div className="hidden lg:flex flex-1 bg-gradient-dark items-center justify-center p-8 relative">
                <div className="absolute inset-0 bg-gradient-primary opacity-10"></div>
                <div className="max-w-md space-y-6 text-auth-sidebar-foreground relative z-10">
                    <div className="space-y-4">
                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center backdrop-blur-sm border border-primary/20">
                            <svg
                                className="w-6 h-6"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold">
                            Chat with Any AI Model
                        </h2>
                        <p className="text-auth-sidebar-foreground/80 leading-relaxed">
                            Access powerful AI models from OpenAI, Anthropic, Google, and more.
                            Pay only for what you use with our flexible credit system.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-primary/60 rounded-full mt-2"></div>
                            <div>
                                <p className="font-medium">Pay-as-you-go pricing</p>
                                <p className="text-sm text-auth-sidebar-foreground/70">
                                    No monthly subscriptions. Purchase credits in Naira.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-primary/60 rounded-full mt-2"></div>
                            <div>
                                <p className="font-medium">Multiple AI Models</p>
                                <p className="text-sm text-auth-sidebar-foreground/70">
                                    GPT-4, Claude, Gemini, and more in one platform.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start space-x-3">
                            <div className="w-2 h-2 bg-primary/60 rounded-full mt-2"></div>
                            <div>
                                <p className="font-medium">Coming Soon</p>
                                <p className="text-sm text-auth-sidebar-foreground/70">
                                    Dollar credit purchases for international users.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

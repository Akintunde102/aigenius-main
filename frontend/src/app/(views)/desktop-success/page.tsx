"use client";

import { useEffect, useState } from "react";
import { BrandLogo } from "@/app/components/BrandLogo";
import { PublicPageShell } from "@/app/components/PublicPageShell";
import { CheckCircle2 } from "lucide-react";

export default function DesktopSuccessPage() {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <PublicPageShell contentClassName="justify-center">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 text-center sm:px-8 sm:py-20">
        <div className="mb-8 flex justify-center">
          <BrandLogo size="compact" asStatic />
        </div>

        <div className="relative mb-10 inline-flex items-center justify-center">
          <div className="absolute h-24 w-24 animate-ping rounded-full bg-emerald-500/20" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)]">
            <CheckCircle2 size={40} />
          </div>
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Sign-in Successful!
        </h1>
        
        <p className="mb-10 text-pretty text-zinc-400 sm:text-lg">
          You have successfully authenticated. You can now close this browser tab and return to the AIGenius Desktop application.
        </p>

        <div className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 backdrop-blur-sm">
          <p className="text-sm font-medium text-zinc-500">
            This tab will remain open for your confirmation.
          </p>
        </div>

        <button
          onClick={() => window.close()}
          className="mt-12 text-sm font-medium text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-300"
        >
          Close tab manually
        </button>
      </div>
    </PublicPageShell>
  );
}

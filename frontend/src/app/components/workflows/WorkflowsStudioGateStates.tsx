"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useLanguage } from "@/lib/providers/LanguageProvider";

export function WorkflowsStudioLoadingGate() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
      <p className="text-sm text-slate-600">{t("workflows.gateLoading", "Loading workflow…")}</p>
    </div>
  );
}

export function WorkflowsStudioAuthBlockedGate() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4 text-center">
      <p className="text-sm text-slate-700">{t("workflows.gateAuthMessage", "Sign in to build and save workflows.")}</p>
      <Link
        href="/login"
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
      >
        {t("workflows.goToLogin", "Go to login")}
      </Link>
    </div>
  );
}

export function WorkflowsStudioLoadErrorGate({ loadError }: { loadError: string }) {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4 text-center">
      <p className="max-w-md text-sm leading-relaxed text-slate-700">{loadError}</p>
      <Button
        type="button"
        variant="outline"
        className="rounded-lg border-slate-200 shadow-sm"
        onClick={() => window.location.reload()}
      >
        {t("workflows.gateRetry", "Retry")}
      </Button>
      <Link
        href="/"
        className="text-sm font-medium text-slate-700 underline underline-offset-4 transition hover:text-slate-900"
      >
        {t("workflows.gateBackHome", "Back home")}
      </Link>
    </div>
  );
}

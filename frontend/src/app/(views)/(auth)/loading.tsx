import { PublicPageShell } from "@/app/components/PublicPageShell";
import { Loader2 } from "lucide-react";

/** Shown immediately on client navigation while login/signup chunks load. */
export default function AuthSegmentLoading() {
  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center items-center">
      <div className="flex flex-col items-center justify-center p-8 text-lp-muted">
        <Loader2 size={32} className="animate-spin" aria-hidden />
        <p className="mt-6 text-sm">
          Loading...
        </p>
      </div>
    </PublicPageShell>
  );
}

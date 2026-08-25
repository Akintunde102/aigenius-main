import { PublicPageShell } from "@/app/components/PublicPageShell";
import { Loader2 } from "lucide-react";

/** Shown immediately on client navigation while login/signup chunks load. */
export default function AuthSegmentLoading() {
  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
      <div className="content-centered">
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--pub-text-muted)" }} aria-hidden />
        <p className="subtext" style={{ marginTop: "1.5rem" }}>
          Loading...
        </p>
      </div>
    </PublicPageShell>
  );
}

import { DesktopSessionRestoringView } from "@/app/components/DesktopSessionRestoringView";
import { PublicPageShell } from "@/app/components/PublicPageShell";

/** Instant loading shell while `/desktop-login` hydrates (e.g. new Electron windows). */
export default function DesktopLoginLoading() {
  return (
    <PublicPageShell hideHeader showFooter={false} contentClassName="justify-center">
      <DesktopSessionRestoringView />
    </PublicPageShell>
  );
}

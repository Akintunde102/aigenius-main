import { DesktopSessionRestoringView } from "@/app/components/DesktopSessionRestoringView";

/** Instant loading shell while `/desktop-login` hydrates (e.g. new Electron windows). */
export default function DesktopLoginLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#0c0d0f]">
      <DesktopSessionRestoringView />
    </div>
  );
}

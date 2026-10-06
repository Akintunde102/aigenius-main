import type { ReactNode } from "react";
import { PublicPageShell } from "@/app/components/PublicPageShell";

/**
 * The docs now use the same frame as every other public page: the landing header, a page that
 * scrolls with the window, and the landing footer. The old docs shell (its own header, left rail
 * and fixed-height scroll region) is gone. If your current docs layout exports `metadata` or wraps
 * the pages in a provider, keep those and only replace the markup it returns.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <PublicPageShell>{children}</PublicPageShell>;
}

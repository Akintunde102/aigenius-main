"use client";

import { usePathname } from "next/navigation";
import { DISPLAY } from "@/app/components/landing/typography";
import { DOCS_SHELL_DOCUMENT_BY_PATH } from "../docs-shell.constants";

/**
 * The document title, taken from the route. The old docs shell showed it in its own header; with
 * that header gone the page shows it as a large heading, the way Linear and Cursor do.
 * This is the element DocPage's aria-labelledby points to.
 */
export function DocTitle() {
  const pathname = usePathname() ?? "";
  const headline =
    DOCS_SHELL_DOCUMENT_BY_PATH[pathname.replace(/\/$/, "")]?.headline ??
    "Legal";

  return (
    <h1
      id="docs-document-title"
      className={`${DISPLAY} text-5xl font-normal leading-[1.02] tracking-[-0.03em] sm:text-6xl`}
    >
      {headline}
    </h1>
  );
}

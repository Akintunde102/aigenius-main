"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const WORKFLOW_ROUTE_PREFIXES = [
  "/workflows",
  "/workflow/",
  "/notifications",
  "/schedules",
];

function isWorkflowDashboardHref(href: string): boolean {
  if (!href.startsWith("/")) {
    return false;
  }
  const path = href.split("?")[0] ?? href;
  return WORKFLOW_ROUTE_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** Thin top bar — visible as soon as a workflow-dashboard link is clicked. */
export function WorkflowNavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setActive(false);
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) {
        return;
      }
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || !isWorkflowDashboardHref(href)) {
        return;
      }
      const destination = href.split("?")[0] ?? href;
      if (destination === pathname) {
        return;
      }
      setActive(true);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  useEffect(() => {
    if (!active) {
      return;
    }
    hideTimerRef.current = setTimeout(() => setActive(false), 12000);
    return () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [active]);

  if (!active) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5 overflow-hidden bg-slate-800/20"
      role="progressbar"
      aria-label="Loading page"
    >
      <div className="h-full w-full origin-left animate-pulse bg-cyan-400/90" />
    </div>
  );
}

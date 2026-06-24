"use client";

import { usePathname } from "next/navigation";
import { LINKS } from "@/lib/links";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import { storageConstants } from "@/lib/constants";
import { useEffect } from "react";
import { storage } from "@/lib/utils/store";
import React from "react";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { WorkflowNavigationProgress } from "@/app/components/workflows/WorkflowNavigationProgress";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathName = usePathname();

  const isNonAuthProtectedPage = pathName === "/" ||
    pathName === "/desktop-welcome" ||
    pathName === "/signup" ||
    pathName === "/login" ||
    pathName === "/desktop-login" ||
    pathName === "/desktop-search-index" ||
    pathName === LINKS.internalPages.login.github ||
    pathName === LINKS.internalPages.error.main ||
    pathName.startsWith("/docs") ||
    pathName.startsWith("/published-conversations") ||
    pathName.startsWith("/integrations");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      if (token) {
        const desktopCallback = sessionStorage.getItem("desktop_callback");
        if (desktopCallback) {
          sessionStorage.removeItem("desktop_callback");
          window.location.href = `${desktopCallback}?token=${token}`;
          return;
        }
        return;
      }
    }

    if (!isNonAuthProtectedPage) {
      getUserDetails().then((data) => {
        if (data) {
          storage(storageConstants.LOGGED_USER_DETAILS).setObject(data);
        }
      })
    }
  }, [isNonAuthProtectedPage]);


  // Keep the layout structure stable to prevent unmounting of persistent components (like ModelInterface)
  // during navigation. The difference between auth-protected and non-auth pages
  // should ideally be handled at the behavioral level, not by changing the DOM tree height/structure.
  return (
    <div
      className="relative z-[35] flex min-h-0 min-w-0 flex-1 flex-col w-full"
    >
      <WorkflowNavigationProgress />
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </div>
  );
}

"use client";
import { useEffect } from "react";
import { AuthPage } from "@/app/components/auth/AuthPage";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";
import { storage } from "@/lib/utils/store";
import { storageConstants } from "@/lib/constants";
import {
  resolveDesktopGoogleOAuthUrl,
  shouldPersistDesktopApiRoot,
  storeDesktopApiRoot,
} from "@/lib/utils/desktop-google-auth-url";
import { resolveAuthApiRootUrl } from "@/lib/utils/resolve-auth-api-root";

const Login = () => {
  useRedirectDesktopFromWebAuthPage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get("desktop_callback");
      if (callback) {
        sessionStorage.setItem("desktop_callback", callback);
        const apiRoot = params.get("api_root");
        if (apiRoot && shouldPersistDesktopApiRoot(apiRoot)) {
          storeDesktopApiRoot(apiRoot);
        }

        if (params.get("auto") === "google") {
          window.location.href = resolveDesktopGoogleOAuthUrl(callback, resolveAuthApiRootUrl());
          return;
        }

        // If already logged in, hand off the short-lived auth JWT (not the API key).
        const token = storage(storageConstants.NOBOX_TOKEN).getString();
        if (token) {
          sessionStorage.removeItem("desktop_callback");
          window.location.href = `${callback}${callback.includes('?') ? '&' : '?'}token=${token}`;
        }
      }
    }
  }, []);

  return <AuthPage variant="login" />;
};

export default Login;

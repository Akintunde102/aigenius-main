"use client";
import { useEffect } from "react";
import { AuthPage } from "@/app/components/auth/AuthPage";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";
import { storage } from "@/lib/utils/store";
import { storageConstants } from "@/lib/constants";
import { LINKS } from "@/lib/links";
import {
  resolveDesktopGoogleOAuthUrl,
  storeDesktopApiRoot,
} from "@/lib/utils/desktop-google-auth-url";

const Login = () => {
  useRedirectDesktopFromWebAuthPage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const callback = params.get("desktop_callback");
      if (callback) {
        sessionStorage.setItem("desktop_callback", callback);
        const apiRoot = params.get("api_root");
        if (apiRoot) {
          storeDesktopApiRoot(apiRoot);
        }

        if (params.get("auto") === "google") {
          window.location.href = resolveDesktopGoogleOAuthUrl(callback, LINKS.noboxAPIRootUrl);
          return;
        }

        // If already logged in, redirect immediately to the callback with the token
        const token = storage(storageConstants.NOBOX_TOKEN).getString()
          || storage(storageConstants.NOBOX_CLIENT_TOKEN).getString();
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

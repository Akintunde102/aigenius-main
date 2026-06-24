"use client";

import { Analytics } from "@vercel/analytics/react";
import { useEffect, useState } from "react";

/**
 * Vercel Analytics in the Electron shell is pointless and adds network noise; skip when UA is Electron.
 */
export default function ClientAnalytics() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!/\bElectron\/\d/i.test(navigator.userAgent || ""));
  }, []);

  return enabled ? <Analytics /> : null;
}

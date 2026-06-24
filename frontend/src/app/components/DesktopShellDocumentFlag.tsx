'use client';

import { useLayoutEffect } from 'react';

/**
 * Sets `data-aigenius-desktop-shell` on `<html>` after hydration so the flag is
 * available before paint without mutating the DOM ahead of React's first pass
 * (which caused "Extra attributes from the server" warnings).
 */
export default function DesktopShellDocumentFlag(): null {
  useLayoutEffect(() => {
    try {
      const v = /\bElectron\/\d/i.test(navigator.userAgent || '') ? '1' : '0';
      document.documentElement.setAttribute('data-aigenius-desktop-shell', v);
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}

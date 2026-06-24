import Script from 'next/script';
import { COLOR_MODE_STORAGE_KEY } from '@/lib/color-mode';

/**
 * Runs before interactive paint so `html.dark` matches localStorage and avoids a light flash.
 */
export function ColorModeBootstrapScript() {
  const snippet = `(function(){try{var k=${JSON.stringify(COLOR_MODE_STORAGE_KEY)};var s=localStorage.getItem(k);if(s==='dark'||((!s||s==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');else document.documentElement.classList.remove('dark');}catch(e){}})();`;

  return (
    <Script id="color-mode-bootstrap" strategy="beforeInteractive">
      {snippet}
    </Script>
  );
}

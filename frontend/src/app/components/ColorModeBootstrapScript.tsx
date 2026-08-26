import {
  COLOR_MODE_BOOTSTRAP_CRITICAL_CSS,
  COLOR_MODE_BOOTSTRAP_SCRIPT,
} from '@/lib/color-mode';

/**
 * Runs synchronously in <head> before paint so `html.dark` / `data-theme` match storage.
 */
export function ColorModeBootstrapScript() {
  return (
    <>
      <style
        id="color-mode-bootstrap-critical"
        dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOTSTRAP_CRITICAL_CSS }}
      />
      <script
        id="color-mode-bootstrap"
        dangerouslySetInnerHTML={{ __html: COLOR_MODE_BOOTSTRAP_SCRIPT }}
      />
    </>
  );
}

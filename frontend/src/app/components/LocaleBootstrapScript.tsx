import { LOCALE_BOOTSTRAP_SCRIPT } from '@/lib/locale-preference';

/**
 * Runs synchronously in <head> before paint so `html[lang]` matches stored locale.
 */
export function LocaleBootstrapScript() {
  return (
    <script
      id="locale-bootstrap"
      dangerouslySetInnerHTML={{ __html: LOCALE_BOOTSTRAP_SCRIPT }}
    />
  );
}

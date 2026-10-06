import { getApiRootUrl } from '@/lib/api-root';
import { buildCrashBootstrapScript } from '@/lib/utils/crash-bootstrap-script';

/** Runs in <head> before React so startup crashes can still be reported. */
export function CrashBootstrapScript() {
  const source = buildCrashBootstrapScript(getApiRootUrl());
  if (!source) {
    return null;
  }

  return (
    <script
      id="crash-bootstrap"
      dangerouslySetInnerHTML={{ __html: source }}
    />
  );
}

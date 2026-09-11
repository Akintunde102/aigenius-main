import { createRequire } from 'module';
import path from 'path';

/**
 * `createRequire(import.meta.url)` is valid in the ESM sidecar, but Jest compiles
 * this package as CJS and cannot parse `import.meta`. Resolve from CJS `__filename`
 * when present, otherwise from the process entry script (production ESM).
 */
export function createNodeRequire(): NodeRequire {
  const cjsFilename: string | undefined = (0, eval)(
    'typeof __filename === "string" ? __filename : undefined',
  );
  const entry = process.argv[1];
  const anchor =
    cjsFilename
    ?? (typeof entry === 'string' && path.isAbsolute(entry) ? entry : path.join(process.cwd(), 'package.json'));
  return createRequire(anchor);
}

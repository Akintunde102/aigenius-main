type SharpFactory = typeof import('sharp');

let sharpModulePromise: Promise<SharpFactory> | null = null;

/** Lazy-load sharp so HTTP startup is not blocked by native module init. */
export function loadSharp(): Promise<SharpFactory> {
  if (!sharpModulePromise) {
    sharpModulePromise = import('sharp').then((mod) => {
      const candidate = mod as SharpFactory & { default?: SharpFactory };
      return candidate.default ?? candidate;
    });
  }
  return sharpModulePromise;
}

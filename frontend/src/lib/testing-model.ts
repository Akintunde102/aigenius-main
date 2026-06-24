import { isE2eBrowserWalletBypassEnabled } from "./e2e-wallet-bypass";

export const DEFAULT_TESTING_MODEL_NAME = "Sao10K Llama 3B";

function getEnvValue(name: string): string {
  return (process.env[name] || "").trim();
}

/**
 * Test mode is enabled when either:
 * - explicit flag is set, or
 * - e2e wallet bypass is active (same env rules as {@link isE2eBrowserWalletBypassEnabled})
 */
export function isTestingModelEnforced(): boolean {
  return getEnvValue("NEXT_PUBLIC_FORCE_TEST_MODEL") === "1"
    || isE2eBrowserWalletBypassEnabled();
}

export function getTestingModelName(): string {
  return getEnvValue("NEXT_PUBLIC_TEST_MODEL_NAME") || DEFAULT_TESTING_MODEL_NAME;
}


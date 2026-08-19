/**
 * Resolves the cloud API base URL with AIGenius-first env names and Nobox legacy fallbacks.
 */
export function getApiRootUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AIGENIUS_API_ROOT_URL ||
    process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    ''
  );
}

/** Partner Center → App identity → Store ID (AIGenius listing). */
export const MS_STORE_PRODUCT_ID = '9NGQQ3GF2WHL';

/**
 * Microsoft Store deep link for shell updates (MSIX / Partner Center).
 * Override with AIGENIUS_MS_STORE_URL or AIGENIUS_MS_STORE_PRODUCT_ID if needed.
 */
export function resolveMicrosoftStorePdpUrl(): string {
  const explicit = process.env.AIGENIUS_MS_STORE_URL?.trim();
  if (explicit) {
    return explicit;
  }
  const productId =
    process.env.AIGENIUS_MS_STORE_PRODUCT_ID?.trim() || MS_STORE_PRODUCT_ID;
  return `ms-windows-store://pdp/?productid=${encodeURIComponent(productId)}`;
}

export const STANDALONE_SHELL_UPDATE_URL =
  process.env.AIGENIUS_STANDALONE_UPDATE_URL?.trim() || 'https://aigenius.chat';

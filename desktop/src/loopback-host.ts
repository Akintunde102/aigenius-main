/** Canonical loopback hostname for the desktop shell and local dev URLs. */
export const DEV_LOOPBACK_HOST = 'localhost';

export function loopbackHttpOrigin(port: string | number): string {
  return `http://${DEV_LOOPBACK_HOST}:${port}`;
}

export function loopbackHttpUrl(port: string | number, pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${loopbackHttpOrigin(port)}${path}`;
}

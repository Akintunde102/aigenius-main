/** Canonical loopback hostname for local dev (Tilt, Next, desktop sidecar). */
export const DEV_LOOPBACK_HOST = 'localhost';

export function devLoopbackOrigin(port: string | number): string {
  return `http://${DEV_LOOPBACK_HOST}:${port}`;
}

export function devLoopbackUrl(port: string | number, pathname: string): string {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${devLoopbackOrigin(port)}${path}`;
}

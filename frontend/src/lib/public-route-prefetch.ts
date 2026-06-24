/**
 * Public (logged-out) routes aligned with middleware — prefetch so first navigation
 * avoids cold RSC/chunk work.
 */
export const PUBLIC_ROUTES_TO_PREFETCH = [
  "/",
  "/login",
  "/signup",
  "/published-conversations",
  "/docs",
  "/docs/privacy-policy",
  "/docs/terms-and-conditions",
] as const;

type AppRouterLike = { prefetch: (href: string) => void };

export function prefetchPublicRoutes(router: AppRouterLike): void {
  for (const path of PUBLIC_ROUTES_TO_PREFETCH) {
    router.prefetch(path);
  }
}

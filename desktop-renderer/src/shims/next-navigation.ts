import {
  useLocation,
  useNavigate,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from 'react-router-dom';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => navigate(0),
    prefetch: (_href: string) => undefined,
  };
}

export function usePathname(): string {
  return useLocation().pathname;
}

export function useSearchParams(): URLSearchParams {
  const [params] = useRouterSearchParams();
  return params;
}

export function useParams<T extends Record<string, string | undefined> = Record<string, string | undefined>>(): T {
  return useRouterParams() as T;
}

export function redirect(url: string): never {
  if (typeof window !== 'undefined') {
    window.location.assign(url);
  }
  throw new Error(`redirect: ${url}`);
}

export function useSelectedLayoutSegment(_parallelRouteKey?: string): string | null {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

export function useSelectedLayoutSegments(): string[] {
  return usePathname().split('/').filter(Boolean);
}

/** Compatibility stub for next/navigation server APIs. */
export const ReadonlyURLSearchParams = URLSearchParams;

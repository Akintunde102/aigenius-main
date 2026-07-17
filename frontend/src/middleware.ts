import { NextRequest, NextResponse } from 'next/server';
import { normalizeNextStaticChunkPath } from '@/lib/utils/normalize-next-static-chunk-path';
import { FEATURE_FLAGS } from '@/lib/config/features';

const PUBLIC_PATH_PREFIXES = [
    '/docs',
    '/error',
    '/published-conversations',
    '/payment-callback',
    '/integrations',
];

const PUBLIC_PATHS = new Set([
    '/',
    '/login',
    '/signup',
    /** App icon / favicon (metadata); must not redirect or browsers show a wrong cached/default icon. */
    '/logo.png',
    '/favicon.ico',
    /** Legacy shell entry; redirects client-side to `/desktop-login`. */
    '/desktop-welcome',
    /** Desktop shell sign-in; auth is enforced client-side (see `desktop-login/page.tsx`). */
    '/desktop-login',
    /** Local SQLite inspector (Electron preload); gated in-page when not desktop. */
    '/desktop-search-index',
]);

function isPublicPath(pathname: string): boolean {
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/assets') ||
        pathname.startsWith('/public') ||
        pathname.startsWith('/api')
    ) {
        return true;
    }

    if (PUBLIC_PATHS.has(pathname)) {
        return true;
    }

    return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isDisabledFeaturePath(pathname: string): boolean {
    if (!FEATURE_FLAGS.WORKFLOWS) {
        if (
            pathname === '/workflows' ||
            pathname.startsWith('/workflows/') ||
            pathname.startsWith('/workflow/') ||
            pathname === '/schedules' ||
            pathname.startsWith('/schedules/') ||
            pathname === '/notifications' ||
            pathname.startsWith('/notifications/')
        ) {
            return true;
        }
    }

    if (!FEATURE_FLAGS.INTEGRATIONS && pathname.startsWith('/integrations')) {
        return true;
    }

    return false;
}

export function middleware(request: NextRequest) {
    const { pathname, search } = request.nextUrl;

    const staticChunkPath = normalizeNextStaticChunkPath(pathname);
    if (staticChunkPath) {
        const url = request.nextUrl.clone();
        url.pathname = staticChunkPath;
        return NextResponse.rewrite(url);
    }

    if (isDisabledFeaturePath(pathname)) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    console.log(`Middleware pathname: ${pathname}`);

    if (isPublicPath(pathname)) {
        return NextResponse.next();
    }

    if (search.includes('token=')) {
        return NextResponse.next();
    }

    const hasSession =
        Boolean(request.cookies.get('nobox_client_token')?.value) ||
        Boolean(request.cookies.get('nobox_token')?.value);

    if (hasSession) {
        return NextResponse.next();
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
}

export const config = {
    matcher: [
        '/_next/static/:path*',
        '/((?!_next/static|_next/image|favicon\\.ico|logo\\.png|assets|public|api).*)',
    ],
};

import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

const DESKTOP_NATIVE_CLIENT_HEADER = 'x-aigenius-desktop';
const DESKTOP_NATIVE_CLIENT_VALUE = '1';

export function canUseDesktopStoredRefreshToken(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    return isAigeniusDesktopRuntime()
        && typeof window.aigeniusDesktop?.getDesktopRefreshToken === 'function'
        && typeof window.aigeniusDesktop?.setDesktopRefreshToken === 'function';
}

export function getDesktopNativeClientHeaders(): Record<string, string> {
    return {
        [DESKTOP_NATIVE_CLIENT_HEADER]: DESKTOP_NATIVE_CLIENT_VALUE,
    };
}

export async function readDesktopStoredRefreshToken(): Promise<string | undefined> {
    if (!canUseDesktopStoredRefreshToken()) {
        return undefined;
    }
    try {
        const token = await window.aigeniusDesktop?.getDesktopRefreshToken?.();
        return typeof token === 'string' && token.trim().length > 0 ? token.trim() : undefined;
    } catch {
        return undefined;
    }
}

export async function writeDesktopStoredRefreshToken(token: string): Promise<void> {
    if (!canUseDesktopStoredRefreshToken()) {
        return;
    }
    await window.aigeniusDesktop?.setDesktopRefreshToken?.(token);
}

export async function clearDesktopStoredRefreshToken(): Promise<void> {
    if (!canUseDesktopStoredRefreshToken()) {
        return;
    }
    await window.aigeniusDesktop?.clearDesktopAuthSecrets?.();
}

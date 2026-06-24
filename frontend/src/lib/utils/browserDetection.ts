/**
 * Comprehensive browser and device detection utility
 * Handles cross-browser compatibility for mobile keyboard interactions
 */

export interface BrowserInfo {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    isSafari: boolean;
    isChrome: boolean;
    isFirefox: boolean;
    isSamsungBrowser: boolean;
    supportsVisualViewport: boolean;
    deviceType: 'desktop' | 'tablet' | 'mobile';
    browserName: string;
    version: string;
}

export function getBrowserInfo(): BrowserInfo {
    if (typeof window === 'undefined') {
        return {
            isMobile: false,
            isIOS: false,
            isAndroid: false,
            isSafari: false,
            isChrome: false,
            isFirefox: false,
            isSamsungBrowser: false,
            supportsVisualViewport: false,
            deviceType: 'desktop',
            browserName: 'unknown',
            version: '0'
        };
    }

    const userAgent = window.navigator.userAgent;
    const platform = window.navigator.platform;

    // Device detection
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(userAgent);
    const isMobile = isIOS || isAndroid || window.innerWidth <= 768;

    // Browser detection
    const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
    const isChrome = /Chrome/.test(userAgent) && !/Edg/.test(userAgent);
    const isFirefox = /Firefox/.test(userAgent);
    const isSamsungBrowser = /SamsungBrowser/.test(userAgent);

    // Device type classification
    let deviceType: 'desktop' | 'tablet' | 'mobile' = 'desktop';
    if (isMobile) {
        deviceType = window.innerWidth <= 768 ? 'mobile' : 'tablet';
    }

    // Browser name and version extraction
    let browserName = 'unknown';
    let version = '0';

    if (isChrome) {
        browserName = 'chrome';
        const match = userAgent.match(/Chrome\/(\d+)/);
        version = match ? match[1] : '0';
    } else if (isSafari) {
        browserName = 'safari';
        const match = userAgent.match(/Version\/(\d+)/);
        version = match ? match[1] : '0';
    } else if (isFirefox) {
        browserName = 'firefox';
        const match = userAgent.match(/Firefox\/(\d+)/);
        version = match ? match[1] : '0';
    } else if (isSamsungBrowser) {
        browserName = 'samsung';
        const match = userAgent.match(/SamsungBrowser\/(\d+)/);
        version = match ? match[1] : '0';
    }

    // Visual Viewport API support detection
    const supportsVisualViewport = 'visualViewport' in window;

    return {
        isMobile,
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        isFirefox,
        isSamsungBrowser,
        supportsVisualViewport,
        deviceType,
        browserName,
        version
    };
}

/**
 * Check if the current browser needs special keyboard handling
 */
export function needsKeyboardHandling(): boolean {
    const browser = getBrowserInfo();
    return browser.isMobile && (browser.isIOS || browser.isAndroid);
}

/**
 * Get the appropriate mobile breakpoint for the current browser
 */
export function getMobileBreakpoint(): number {
    const browser = getBrowserInfo();

    // iOS devices often have different viewport behavior
    if (browser.isIOS) {
        return 834; // iPad breakpoint
    }

    // Android and other mobile devices
    return 768;
}

/**
 * Check if the browser supports the Visual Viewport API reliably
 */
export function hasReliableVisualViewport(): boolean {
    const browser = getBrowserInfo();

    if (!browser.supportsVisualViewport) return false;

    // Safari on iOS has some quirks with Visual Viewport API
    if (browser.isIOS && browser.isSafari) {
        const version = parseInt(browser.version);
        return version >= 13; // iOS 13+ has better support
    }

    // Chrome on Android generally has good support
    if (browser.isAndroid && browser.isChrome) {
        const version = parseInt(browser.version);
        return version >= 61; // Chrome 61+ has Visual Viewport API
    }

    // Firefox mobile support
    if (browser.isFirefox) {
        const version = parseInt(browser.version);
        return version >= 91; // Firefox 91+ has Visual Viewport API
    }

    return true;
}

/**
 * Get keyboard detection strategy based on browser capabilities
 */
export function getKeyboardDetectionStrategy(): 'visualViewport' | 'resize' | 'hybrid' {
    const browser = getBrowserInfo();

    if (hasReliableVisualViewport()) {
        return 'visualViewport';
    }

    // iOS Safari needs hybrid approach
    if (browser.isIOS && browser.isSafari) {
        return 'hybrid';
    }

    // Fallback to resize events
    return 'resize';
}

/**
 * Get browser-specific viewport height calculation
 */
export function getViewportHeight(): number {
    const browser = getBrowserInfo();

    if (browser.supportsVisualViewport && window.visualViewport) {
        return window.visualViewport.height;
    }

    // iOS Safari specific handling
    if (browser.isIOS && browser.isSafari) {
        // Use document height on iOS Safari for better keyboard detection
        return Math.min(window.innerHeight, document.documentElement.clientHeight);
    }

    return window.innerHeight;
}

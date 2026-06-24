/**
 * Performance utilities for optimizing React components and API calls
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 * 
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns The debounced function
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
    let timeoutId: NodeJS.Timeout | null = null;
    let lastResolve: ((value: ReturnType<T>) => void) | null = null;
    let lastReject: ((reason?: any) => void) | null = null;

    return (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return new Promise((resolve, reject) => {
            // Clear any existing timeout
            if (timeoutId) {
                clearTimeout(timeoutId);
            }

            // If there's a pending promise, reject it
            if (lastReject) {
                lastReject(new Error('Debounced function called again before completion'));
            }

            lastResolve = resolve;
            lastReject = reject;

            timeoutId = setTimeout(async () => {
                try {
                    const result = await func(...args);
                    if (lastResolve) {
                        lastResolve(result);
                        lastResolve = null;
                        lastReject = null;
                    }
                } catch (error) {
                    if (lastReject) {
                        lastReject(error);
                        lastResolve = null;
                        lastReject = null;
                    }
                }
                timeoutId = null;
            }, wait);
        });
    };
}

/**
 * Creates a throttled function that only invokes func at most once per wait milliseconds
 * 
 * @param func - The function to throttle
 * @param wait - The number of milliseconds to throttle invocations to
 * @returns The throttled function
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let lastCallTime = 0;
    let timeoutId: NodeJS.Timeout | null = null;

    return (...args: Parameters<T>): void => {
        const now = Date.now();

        if (now - lastCallTime >= wait) {
            lastCallTime = now;
            func(...args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCallTime = Date.now();
                func(...args);
                timeoutId = null;
            }, wait - (now - lastCallTime));
        }
    };
}

/**
 * Memoizes the result of an expensive function call
 * 
 * @param fn - The function to memoize
 * @param keyGenerator - Optional function to generate cache keys
 * @returns The memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();

    return ((...args: Parameters<T>): ReturnType<T> => {
        const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = fn(...args);
        cache.set(key, result);
        return result;
    }) as T;
}

/**
 * Creates a function that will only execute once
 * 
 * @param fn - The function to execute once
 * @returns The once-only function
 */
export function once<T extends (...args: any[]) => any>(fn: T): T {
    let called = false;
    let result: ReturnType<T>;

    return ((...args: Parameters<T>): ReturnType<T> => {
        if (!called) {
            called = true;
            result = fn(...args);
        }
        return result;
    }) as T;
}

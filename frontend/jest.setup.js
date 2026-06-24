import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'util'

if (typeof global.TextDecoder === 'undefined') {
    global.TextDecoder = TextDecoder
}
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = TextEncoder
}

// Support React act() in Jest (avoids "not configured to support act" warnings)
if (typeof globalThis.IS_REACT_ACT_ENVIRONMENT === 'undefined') {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
}

// Mock axios
jest.mock('axios', () => ({
    __esModule: true,
    default: {
        create: jest.fn(() => ({
            interceptors: {
                request: { use: jest.fn(), eject: jest.fn() },
                response: { use: jest.fn(), eject: jest.fn() }
            },
            get: jest.fn(() => Promise.resolve({ data: [] })),
            post: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
            put: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
            patch: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
            delete: jest.fn(() => Promise.resolve({ data: {} })),
        })),
        get: jest.fn(() => Promise.resolve({ data: [] })),
        post: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
        put: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
        patch: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
    },
}))

// Mock next/router
jest.mock('next/router', () => ({
    useRouter: () => ({
        push: jest.fn(),
        pathname: '/',
        query: {},
        asPath: '/',
    }),
}))

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        pathname: '/',
        query: {},
        asPath: '/',
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(),
}))

// Mock window.localStorage
Object.defineProperty(window, 'localStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    },
    writable: true,
})

// Mock window.sessionStorage
Object.defineProperty(window, 'sessionStorage', {
    value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
    },
    writable: true,
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
}))

// Suppress console errors in tests unless explicitly testing them
const originalError = console.error
beforeAll(() => {
    console.error = (...args) => {
        if (
            typeof args[0] === 'string' &&
            args[0].includes('Warning: ReactDOM.render is no longer supported')
        ) {
            return
        }
        originalError.call(console, ...args)
    }
})

afterAll(() => {
    console.error = originalError
})

// Mock servercall
jest.mock('servercall', () => ({
    __esModule: true,
    default: {
        get: jest.fn(() => Promise.resolve({ data: [] })),
        post: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
        put: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
        patch: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
        delete: jest.fn(() => Promise.resolve({ data: {} })),
    },
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
    put: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
    patch: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    createServerCall: jest.fn(() => jest.fn(() => Promise.resolve({ data: {} }))),
}))

// Mock nobox-client
jest.mock('nobox-client', () => ({
    __esModule: true,
    default: {
        connect: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ data: [] })),
            post: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
            put: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
            patch: jest.fn(() => Promise.resolve({ data: { id: 'test-id' } })),
            delete: jest.fn(() => Promise.resolve({ data: {} })),
        })),
    },
}))

// Mock lucide-react (prevents ESM transformation issues)
jest.mock('lucide-react', () => {
    return new Proxy({}, {
        get: (target, name) => {
            return (props) => <div {...props} data-lucide={name.toString()} />;
        }
    });
});

// Mock react-markdown (prevents ESM transformation issues)
jest.mock('react-markdown', () => {
    return ({ children }) => <>{children}</>;
});

// Mock remark-gfm
jest.mock('remark-gfm', () => ({}));

// Mock rehype-highlight
jest.mock('rehype-highlight', () => ({}));
 
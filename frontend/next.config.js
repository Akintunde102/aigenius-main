const path = require('path');

/** @vercel/analytics (client-only in Electron — see ClientAnalytics.tsx). */
const vercelAnalyticsOrigin = 'https://va.vercel-scripts.com';

/** Local desktop mini-server default; override with NEXT_PUBLIC_NOBOX_API_ROOT_URL or `.env*.local`. */
const resolvedNoboxApiRootUrl =
    process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : undefined);

/** Allow fetch/WebSocket to the configured API origin in CSP connect-src. */
function apiConnectOrigins(apiRootUrl) {
    if (!apiRootUrl) return [];
    try {
        const { protocol, host } = new URL(apiRootUrl);
        const origins = [`${protocol}//${host}`];
        if (protocol === 'https:') origins.push(`wss://${host}`);
        if (protocol === 'http:') origins.push(`ws://${host}`);
        return origins;
    } catch {
        return [];
    }
}

const configuredApiOrigins = apiConnectOrigins(resolvedNoboxApiRootUrl);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Build optimizations
    eslint: {
        ignoreDuringBuilds: true, // Temporarily allow build; fix lint in codebase and set back to false
    },
    typescript: {
        ignoreBuildErrors: false, // Enable TypeScript checking during builds
    },

    // Performance optimizations
    experimental: {
        optimizeCss: false,
        optimizePackageImports: ['antd', 'react-icons', '@radix-ui/react-*'],
    },
    transpilePackages: ['react-pdf', 'pdfjs-dist'],

    // Security headers
    async headers() {
        const prodConnectSrc = [
            "connect-src 'self'",
            ...configuredApiOrigins,
            'http://localhost:8000',
            'http://localhost:8001',
            'http://localhost:3001',
            'http://localhost:7486',
            'ws://localhost:8000',
            'ws://localhost:3001',
            'wss://localhost:8000',
            'wss://localhost:3001',
            'https://api.nobox.cloud',
            'https://api.paystack.co',
            'https://api.aigenius.chat',
            'https://aigenius-backend-production.up.railway.app',
            'https://cdn.jsdelivr.net',
            'wss://api.aigenius.chat',
            'wss://ai-genius-copy-production.up.railway.app',
            vercelAnalyticsOrigin,
        ].join(' ');

        const devConnectSrc = [
            "connect-src 'self'",
            ...configuredApiOrigins,
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:8000',
            'http://localhost:5000',
            'http://localhost:8001',
            'http://localhost:7486',
            'https://api.nobox.cloud',
            'https://api.paystack.co',
            'https://api.aigenius.chat',
            'https://aigenius-backend-production.up.railway.app',
            'ws://localhost:3001',
            'ws://localhost:8000',
            'https://cdn.jsdelivr.net',
            'wss://api.aigenius.chat',
            vercelAnalyticsOrigin,
        ].join(' ');

        const scriptSrc = [
            "script-src 'self'",
            "'unsafe-eval'",
            "'unsafe-inline'",
            "blob:",
            'https://js.paystack.co',
            'https://cdn.jsdelivr.net',
            vercelAnalyticsOrigin,
        ].join(' ');

        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(self), geolocation=()',
                    },
                    // Content Security Policy
                    {
                        key: 'Content-Security-Policy',
                        value: [
                            "default-src 'self'",
                            scriptSrc,
                            "style-src 'self' 'unsafe-inline'",
                            "img-src 'self' blob: data: https://images.unsplash.com https://nobox-upload-bucket.s3.eu-west-2.amazonaws.com https://res.cloudinary.com",
                            "font-src 'self'",
                            "worker-src 'self' blob:",
                            "frame-src 'self' blob: data: https://checkout.paystack.com",
                            "media-src 'self' blob:",
                            process.env.NODE_ENV === 'development'
                                ? // Include Next dev HMR websockets on loopback; Electron loads http://localhost:<port>.
                                devConnectSrc
                                : prodConnectSrc,
                        ].join('; '),
                    },
                ],
            },
        ];
    },

    // Image optimization
    images: {
        domains: ['images.unsplash.com', 'nobox-upload-bucket.s3.eu-west-2.amazonaws.com', 'res.cloudinary.com'],
        formats: ['image/webp', 'image/avif'],
        deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
        imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    },

    // SASS configuration
    sassOptions: {
        includePaths: [path.resolve(__dirname, 'src/app/styles')],
        prependData: `@import "_mixins.scss";`,
    },

    // Compression
    compress: true,

    // Environment variables validation
    env: {
        NEXT_PUBLIC_API_URL: resolvedNoboxApiRootUrl,
        NEXT_PUBLIC_NOBOX_API_ROOT_URL: resolvedNoboxApiRootUrl,
        NEXT_PUBLIC_ENVIRONMENT: process.env.NODE_ENV,
        NEXT_PUBLIC_ENABLE_EMAIL_AUTH: process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH || '',
        NEXT_PUBLIC_ENABLE_GOOGLE_AUTH: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH || '',
        NEXT_PUBLIC_ENABLE_GITHUB_AUTH: process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH || '',
        NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
        NEXT_PUBLIC_GOOGLE_REDIRECT_URI: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || '',
        NEXT_PUBLIC_PAYSTACK_KEY:
            process.env.NEXT_PUBLIC_PAYSTACK_KEY || process.env.PAYSTACK_PUBLIC_KEY || '',
    },

    // Output configuration for better production builds
    output: 'standalone',

    webpack: (config, { isServer, webpack }) => {
        // `socket.io-client` may pull in `ws`'s Node transport variants during bundling.
        // `ws` has optional native deps (`bufferutil`, `utf-8-validate`) that are not required
        // in the browser. Mark them as unavailable to avoid build-time resolution failures.
        if (!isServer) {
            config.resolve = config.resolve || {};
            config.resolve.alias = {
                ...(config.resolve.alias || {}),
                bufferutil: false,
                'utf-8-validate': false,
            };
            config.resolve.fallback = {
                ...(config.resolve.fallback || {}),
                bufferutil: false,
                'utf-8-validate': false,
            };
        }

        // Playwright E2E: allow `e2e-wallet-bypass` to see NODE_ENV=test in the browser bundle.
        // Normal `next dev` inlines "development" — without this, wallet bypass never enables in the UI.
        // Never set E2E_WALLET_BYPASS_TEST_CLIENT in production deploys.
        if (!isServer && process.env.E2E_WALLET_BYPASS_TEST_CLIENT === '1') {
            config.plugins.push(
                new webpack.DefinePlugin({
                    'process.env.NODE_ENV': JSON.stringify('test'),
                }),
            );
        }

        config.experiments = {
            ...config.experiments,
            topLevelAwait: true,
        };

        // Mermaid (via @mermaid-js/parser → langium) pulls in vscode-languageserver-types UMD,
        // which triggers a benign "Critical dependency" webpack warning on the client bundle.
        // onnxruntime-web (used by @ricky0123/vad-web) also uses dynamic requires that trigger this warning.
        config.ignoreWarnings = [
            ...(config.ignoreWarnings || []),
            { module: /node_modules[\\/]vscode-languageserver-types/ },
            { module: /node_modules[\\/]onnxruntime-web/ },
            { module: /node_modules[\\/]@ricky0123[\\/]vad-web/ },
        ];

        return config;
    },
};

module.exports = nextConfig;

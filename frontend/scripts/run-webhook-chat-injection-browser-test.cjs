const { chromium } = require('playwright');
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACTS_DIR = 'C:\\Users\\DELL5530\\.gemini\\antigravity\\brain\\3d1cd374-d463-41c6-aa1e-ad34c24900ba';
const TEST_PORT = 38922;
const BACKEND_URL = 'http://localhost:28000';

async function buildBundle() {
    console.log('[test] Bundling test harness with esbuild...');
    const entryPath = path.join(__dirname, 'webhook-chat-injection-test', 'entry.tsx');
    const outPath = path.join(__dirname, 'webhook-chat-injection-test', 'bundle.js');

    await esbuild.build({
        entryPoints: [entryPath],
        outfile: outPath,
        bundle: true,
        minify: false,
        sourcemap: true,
        format: 'iife',
        loader: {
            '.tsx': 'tsx',
            '.ts': 'ts',
            '.jsx': 'jsx',
            '.js': 'js',
        },
        define: {
            'process.env.NODE_ENV': '"development"',
            'process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL': `""`,
        },
    });

    console.log('[test] Bundle created successfully.');
    return outPath;
}

function startTestServer(bundlePath) {
    let sseClients = [];

    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OpenRouter Webhook Chat Injection Test</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    window.process = { env: { NODE_ENV: 'development' } };
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            zinc: {
              850: '#1f1f22',
              900: '#18181b',
              950: '#09090b',
            }
          }
        }
      }
    }
  </script>
</head>
<body class="bg-zinc-950 text-zinc-100">
  <div id="root"></div>
  <script src="/bundle.js"></script>
</body>
</html>`;

    const server = http.createServer((req, res) => {
        // SSE Events Endpoint
        if (req.url === '/api/mock-sse-events') {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
            });
            res.write(': connected\n\n');
            sseClients.push(res);

            req.on('close', () => {
                sseClients = sseClients.filter((c) => c !== res);
            });
            return;
        }

        // Trigger SSE injection event
        if (req.url === '/api/trigger-injection' && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => body += chunk);
            req.on('end', () => {
                const payload = JSON.parse(body);
                const sseMessage = `event: conversation_updated\ndata: ${JSON.stringify(payload)}\n\n`;
                sseClients.forEach((client) => client.write(sseMessage));
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ ok: true, deliveredClients: sseClients.length }));
            });
            return;
        }

        // Serve bundle.js
        if (req.url === '/bundle.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            fs.createReadStream(bundlePath).pipe(res);
            return;
        }

        // Serve index HTML
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });

    return new Promise((resolve) => {
        server.listen(TEST_PORT, () => {
            console.log(`[test] Static test server running on http://127.0.0.1:${TEST_PORT}`);
            resolve(server);
        });
    });
}

async function testBackendWebhookEndpoint() {
    console.log(`[test] Verifying live backend webhook endpoints on ${BACKEND_URL}...`);
    const payload = JSON.stringify({
        id: 'openrouter-job-cyberpunk-456',
        status: 'completed',
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    });

    const endpoints = [
        `${BACKEND_URL}/openrouter/video`,
        `${BACKEND_URL}/gateway/v1/webhooks/openrouter/video`,
    ];

    for (const url of endpoints) {
        console.log(`[test] POST ${url}...`);
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
        });

        const status = res.status;
        const text = await res.text();
        console.log(`[test] ${url} -> HTTP ${status}, response: ${text}`);

        if (status !== 200) {
            throw new Error(`Endpoint ${url} failed with status ${status}: ${text}`);
        }

        const json = JSON.parse(text);
        if (json.ok !== true) {
            throw new Error(`Endpoint ${url} did not return ok=true: ${text}`);
        }
    }

    console.log('[test] Both live webhook endpoints verified: 200 OK without authorization failures!');
}

async function runBrowserTest() {
    // 1. Verify backend webhook endpoint authorization fix
    await testBackendWebhookEndpoint();

    // 2. Build frontend harness
    const bundlePath = await buildBundle();
    const server = await startTestServer(bundlePath);

    console.log('[test] Launching Chromium browser with Playwright...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
    });

    page.on('console', (msg) => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));

    try {
        console.log('[test] Navigating to chat UI...');
        await page.goto(`http://127.0.0.1:${TEST_PORT}/`);

        // Wait for initial pending video generation message
        await page.waitForSelector('text=Google: Veo 3.1', { timeout: 10000 });
        await page.waitForSelector('text=openrouter-job-cyberpunk-456', { timeout: 10000 });
        await page.waitForSelector('text=Track Video Progress: Cyberpunk City', { timeout: 10000 });
        console.log('[test] Verified pending video job chat message in view.');

        // Capture Chat Pending Screenshot
        const pendingShotPath = path.join(ARTIFACTS_DIR, 'mock-webhook-chat-pending.png');
        await page.screenshot({ path: pendingShotPath });
        console.log(`[test] Captured pending chat screenshot -> ${pendingShotPath}`);

        // Wait a brief moment to simulate background video rendering
        await page.waitForTimeout(1500);

        // 3. Trigger OpenRouter webhook delivery & chat injection
        console.log('[test] Triggering OpenRouter webhook completion event...');
        const injectedMessage = {
            id: 'msg-3',
            role: 'assistant',
            content: "Your video is ready!\n\nHere is your generated cyberpunk city video with flying vehicles. You can preview it directly below or download it in full quality.",
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            timestamp: Date.now(),
        };

        const injectRes = await fetch(`http://127.0.0.1:${TEST_PORT}/api/trigger-injection`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'conversation_updated',
                injectedMessage,
            }),
        });

        const injectJson = await injectRes.json();
        console.log('[test] Injection triggered through SSE:', injectJson);

        // 4. Verify that the chat UI immediately displays the injected message and video player!
        console.log('[test] Waiting for frontend to display injected message and video player...');
        await page.waitForSelector('#webhook-toast', { timeout: 10000 });
        await page.waitForSelector('#injected-video-container', { timeout: 10000 });
        await page.waitForSelector('#injected-video-player', { timeout: 10000 });
        await page.waitForSelector('#injected-video-download', { timeout: 10000 });
        await page.waitForSelector('text=Your video is ready!', { timeout: 10000 });
        await page.waitForSelector('text=Download Video (MP4)', { timeout: 10000 });

        console.log('[test] Verified: Injected video message mounted and visible in chat transcript!');

        // Capture Injected Chat Screenshot
        const injectedShotPath = path.join(ARTIFACTS_DIR, 'mock-webhook-chat-injected.png');
        await page.screenshot({ path: injectedShotPath });
        console.log(`[test] Captured injected chat screenshot -> ${injectedShotPath}`);

        console.log('[test] ALL BROWSER AND WEBHOOK TEST CHECKS PASSED WITH FLYING COLORS!');
    } finally {
        await browser.close();
        server.close();
    }
}

runBrowserTest().catch((err) => {
    console.error('[test] Test failed:', err);
    process.exit(1);
});

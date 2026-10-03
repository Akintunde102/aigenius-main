const { chromium } = require('playwright');
const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');
const http = require('http');

const ARTIFACTS_DIR = 'C:\\Users\\DELL5530\\.gemini\\antigravity\\brain\\3d1cd374-d463-41c6-aa1e-ad34c24900ba';
const PORT = 38921;

async function buildBundle() {
    console.log('[test] Bundling test harness with esbuild...');
    const entryPath = path.join(__dirname, 'video-tracking-browser-test', 'entry.tsx');
    const outPath = path.join(__dirname, 'video-tracking-browser-test', 'bundle.js');

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

function startStaticServer(bundlePath) {
    const html = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Video Tracking Browser Test</title>
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

    let pollCount = 0;

    const server = http.createServer((req, res) => {
        // Mock status endpoint
        if (req.url && req.url.includes('/videos/jobs/')) {
            pollCount++;
            res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            });

            // Simulate progress stages
            if (pollCount === 1) {
                // Rendering state
                res.end(JSON.stringify({
                    success: true,
                    job_id: 'job-4646dced',
                    identifier: 'albino-woman-street-video-walking_job-4646dced',
                    model_id: 'google/veo-3.1',
                    model_name: 'Google: Veo 3.1',
                    status: 'pending_delivery',
                    stage: 'rendering',
                    stage_label: 'Rendering video frames...',
                    progress_percent: 45,
                    elapsed_seconds: 48,
                    remaining_seconds: 72,
                    remaining_label: '~1m 12s remaining',
                    estimated_total_seconds: 120,
                    video_url: null,
                    error_message: null,
                    created_at: new Date(Date.now() - 48000).toISOString(),
                    updated_at: new Date().toISOString(),
                }));
            } else if (pollCount === 2) {
                // Finalizing state
                res.end(JSON.stringify({
                    success: true,
                    job_id: 'job-4646dced',
                    identifier: 'albino-woman-street-video-walking_job-4646dced',
                    model_id: 'google/veo-3.1',
                    model_name: 'Google: Veo 3.1',
                    status: 'processing_delivery',
                    stage: 'finalizing',
                    stage_label: 'Storing video & preparing playback...',
                    progress_percent: 96,
                    elapsed_seconds: 110,
                    remaining_seconds: 4,
                    remaining_label: '~4s remaining',
                    estimated_total_seconds: 120,
                    video_url: null,
                    error_message: null,
                    created_at: new Date(Date.now() - 110000).toISOString(),
                    updated_at: new Date().toISOString(),
                }));
            } else {
                // Ready state with playable video
                res.end(JSON.stringify({
                    success: true,
                    job_id: 'job-4646dced',
                    identifier: 'albino-woman-street-video-walking_job-4646dced',
                    model_id: 'google/veo-3.1',
                    model_name: 'Google: Veo 3.1',
                    status: 'delivered',
                    stage: 'ready',
                    stage_label: 'Video ready!',
                    progress_percent: 100,
                    elapsed_seconds: 118,
                    remaining_seconds: 0,
                    remaining_label: 'Ready to play',
                    estimated_total_seconds: 120,
                    video_url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
                    error_message: null,
                    created_at: new Date(Date.now() - 118000).toISOString(),
                    updated_at: new Date().toISOString(),
                }));
            }
            return;
        }

        if (req.url === '/bundle.js') {
            res.writeHead(200, { 'Content-Type': 'application/javascript' });
            fs.createReadStream(bundlePath).pipe(res);
            return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    });

    return new Promise((resolve) => {
        server.listen(PORT, () => {
            console.log(`[test] Static test server running on http://127.0.0.1:${PORT}`);
            resolve(server);
        });
    });
}

async function runBrowserTest() {
    const bundlePath = await buildBundle();
    const server = await startStaticServer(bundlePath);

    console.log('[test] Launching Chromium browser with Playwright...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
    });

    page.on('console', (msg) => console.log(`[PAGE LOG] ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', (err) => console.log(`[PAGE ERROR] ${err.message}`));

    try {
        console.log('[test] Navigating to test app...');
        await page.goto(`http://127.0.0.1:${PORT}/`);
        await page.waitForSelector('#track-video-link', { timeout: 10000 });

        // 1. Capture Chat Message with Link
        const chatShotPath = path.join(ARTIFACTS_DIR, 'mock-video-chat-link.png');
        await page.screenshot({ path: chatShotPath });
        console.log(`[test] Captured chat link screenshot -> ${chatShotPath}`);

        // 2. Click the link to open progress modal
        console.log('[test] Clicking tracking link to open modal...');
        await page.click('#track-video-link');

        // Wait for modal to appear and show 45% progress
        await page.waitForSelector('text=Video Generation Progress', { timeout: 10000 });
        await page.waitForSelector('text=45%', { timeout: 10000 });
        await page.waitForSelector('text=Time Elapsed', { timeout: 10000 });
        await page.waitForSelector('text=~1m 12s remaining', { timeout: 10000 });
        console.log('[test] Verified rendering stage (45% progress, ~1m 12s remaining)');

        // Capture Rendering Modal Screenshot
        const renderingShotPath = path.join(ARTIFACTS_DIR, 'mock-video-modal-rendering.png');
        await page.screenshot({ path: renderingShotPath });
        console.log(`[test] Captured rendering modal screenshot -> ${renderingShotPath}`);

        // 3. Wait for the smart polling to fetch second poll (finalizing) and third poll (ready)
        console.log('[test] Waiting for live polling to advance to completed/ready state...');
        await page.waitForSelector('video', { timeout: 15000 });
        await page.waitForSelector('text=Download Video (MP4)', { timeout: 5000 });
        console.log('[test] Verified completed state: inline video player and download button mounted!');

        // Capture Ready Modal Screenshot
        const readyShotPath = path.join(ARTIFACTS_DIR, 'mock-video-modal-ready.png');
        await page.screenshot({ path: readyShotPath });
        console.log(`[test] Captured ready modal screenshot -> ${readyShotPath}`);

        console.log('[test] ALL BROWSER TEST CHECKS PASSED SUCCESSFULLY!');
    } finally {
        await browser.close();
        server.close();
    }
}

runBrowserTest().catch((err) => {
    console.error('[test] Test failed:', err);
    process.exit(1);
});

const { chromium } = require('@playwright/test');
const path = require('path');

const OUT_PATH = 'C:\\Users\\DELL5530\\.gemini\\antigravity\\brain\\7f6ba56e-18d4-46d0-9088-70e279bde227\\test-robot.png';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 400, height: 400 } });

  // Load a simple Three.js page with robot.glb
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background: #18181b; overflow:hidden;">
        <canvas id="c" style="width: 400px; height: 400px;"></canvas>
        <script type="module">
          import * as THREE from 'http://127.0.0.1:23001/_next/static/chunks/three.js';
          // or use Three from window if available
        </script>
      </body>
    </html>
  `);
  await browser.close();
})();

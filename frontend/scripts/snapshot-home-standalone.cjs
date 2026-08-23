/**
 * Visual snapshots of standalone home.html (light + dark + mobile + fullpage).
 * Usage: node scripts/snapshot-home-standalone.cjs
 */
const path = require("path");
const { chromium } = require("playwright");

const STANDALONE_DIR = path.join(__dirname, "..", "standalone");
const HTML_URL = `file:///${path.join(STANDALONE_DIR, "home.html").replace(/\\/g, "/")}`;
const OUT_DIR = path.join(STANDALONE_DIR, "snapshots");

async function capture(theme, viewport, filename, fullPage = false) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
  });

  await page.goto(HTML_URL, { waitUntil: "load", timeout: 30000 });
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
  }, theme);
  await page.waitForTimeout(800);

  const outPath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: outPath, type: "png", fullPage });
  await browser.close();
  console.log(`Saved ${outPath}`);
}

async function main() {
  const fs = require("fs");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await capture("light", { width: 1440, height: 900 }, "home-light.png", false);
  await capture("dark", { width: 1440, height: 900 }, "home-dark.png", false);
  await capture("dark", { width: 1440, height: 900 }, "home-dark-fullpage.png", true);
  await capture("dark", { width: 390, height: 844 }, "home-mobile-dark.png", false);
  await capture("dark", { width: 390, height: 844 }, "home-mobile-dark-fullpage.png", true);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

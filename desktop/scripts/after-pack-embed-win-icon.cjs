'use strict';

/**
 * electron-builder only embeds a Windows .exe icon via rcedit, which is gated on
 * `signAndEditExecutable`. That flag also downloads winCodeSign (macOS dylibs) and
 * fails on Windows without symlink privilege. Stamp the icon ourselves after pack.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');
const { execFileSync } = require('child_process');

const RCEDIT_URL = 'https://github.com/electron/rcedit/releases/download/v2.0.0/rcedit-x64.exe';

function downloadFile(url, dest, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      const loc = res.headers.location;
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && loc) {
        file.close();
        fs.unlinkSync(dest);
        if (redirectsLeft <= 0) {
          reject(new Error('Too many redirects downloading rcedit'));
          return;
        }
        resolve(downloadFile(loc, dest, redirectsLeft - 1));
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`Download rcedit failed: HTTP ${res.statusCode}`));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    req.on('error', (err) => {
      file.close();
      try {
        fs.unlinkSync(dest);
      } catch {
        /* ignore */
      }
      reject(err);
    });
  });
}

async function resolveRceditPath() {
  const os = require('os');
  const cacheDir = path.join(process.env.LOCALAPPDATA || os.tmpdir(), 'aigenius-rcedit');
  fs.mkdirSync(cacheDir, { recursive: true });
  const exe = path.join(cacheDir, 'rcedit-x64.exe');
  if (fs.existsSync(exe) && fs.statSync(exe).size > 10_000) {
    return exe;
  }
  const tmp = `${exe}.download`;
  await downloadFile(RCEDIT_URL, tmp);
  fs.renameSync(tmp, exe);
  return exe;
}

exports.default = async function afterPackEmbedWinIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const desktopRoot = path.resolve(__dirname, '..');
  const icoPath = path.join(desktopRoot, 'build', 'icon.ico');
  if (!fs.existsSync(icoPath)) {
    throw new Error(`afterPack: missing Windows icon at ${icoPath} (run npm run sync-brand-icon)`);
  }

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  if (!fs.existsSync(exePath)) {
    throw new Error(`afterPack: missing Windows exe at ${exePath}`);
  }

  const rcedit = await resolveRceditPath();
  if (process.platform !== 'win32') {
    let wineCmd = 'wine';
    try {
      execFileSync(wineCmd, ['--version']);
    } catch {
      const fs = require('fs');
      if (fs.existsSync('/opt/homebrew/bin/wine')) {
        wineCmd = '/opt/homebrew/bin/wine';
      }
    }
    
    try {
      execFileSync(wineCmd, [rcedit, exePath, '--set-icon', icoPath], { stdio: 'inherit' });
      console.info('[afterPack] Embedded Windows icon into', exePath, `(via ${wineCmd})`);
    } catch (err) {
      console.warn('[afterPack] Warning: Could not run rcedit via wine. Is wine installed? The Windows .exe will not have a custom icon.', err.message);
    }
  } else {
    execFileSync(rcedit, [exePath, '--set-icon', icoPath], { stdio: 'inherit' });
    console.info('[afterPack] Embedded Windows icon into', exePath);
  }
};

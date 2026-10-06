'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const accountId = (process.env.CLOUDFLARE_ACCOUNT_ID || '').trim();
const accessKey = (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '').trim();
const secretKey = (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '').trim();
const bucket = (process.env.CLOUDFLARE_R2_BUCKET || 'aigenius-desktop-ota').trim();
const prefix = 'desktop/ui';

if (!accountId || !accessKey || !secretKey) {
  console.error(
    '[publish-ui-ota] Missing Cloudflare R2 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_R2_ACCESS_KEY_ID, and CLOUDFLARE_R2_SECRET_ACCESS_KEY.',
  );
  process.exit(1);
}

const otaDir = path.join(__dirname, '..', 'dist-ota');
const manifestPath = path.join(otaDir, 'ui-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('[publish-ui-ota] Manifest not found:', manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const zipName = `ui-${manifest.uiVersion}.zip`;
const zipPath = path.join(otaDir, zipName);
if (!manifest.uiVersion || !fs.existsSync(zipPath)) {
  console.error('[publish-ui-ota] UI bundle not found:', zipPath);
  process.exit(1);
}

const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;

function upload(filePath, objectKey, cacheControl, contentType) {
  const useShell = process.platform === 'win32';
  const quote = (value) => (useShell ? `"${String(value).replace(/"/g, '')}"` : value);
  const args = [
    's3',
    'cp',
    quote(filePath),
    quote(`s3://${bucket}/${objectKey}`),
    '--endpoint-url',
    endpoint,
    '--cache-control',
    cacheControl,
    '--content-type',
    contentType,
    '--only-show-errors',
  ];

  const result = spawnSync(useShell ? 'aws.cmd' : 'aws', args, {
    env: {
      ...process.env,
      AWS_ACCESS_KEY_ID: accessKey,
      AWS_SECRET_ACCESS_KEY: secretKey,
      AWS_DEFAULT_REGION: 'auto',
      AWS_REQUEST_CHECKSUM_CALCULATION: 'when_required',
      AWS_RESPONSE_CHECKSUM_VALIDATION: 'when_required',
    },
    stdio: 'inherit',
    windowsHide: true,
    shell: useShell,
  });

  if (result.error) {
    console.error('[publish-ui-ota] AWS CLI is required to upload to Cloudflare R2:', result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.info(`[publish-ui-ota] Publishing UI ${manifest.uiVersion} to Cloudflare R2 bucket ${bucket}/${prefix}`);

upload(
  zipPath,
  `${prefix}/${zipName}`,
  'public,max-age=31536000,immutable',
  'application/zip',
);
upload(
  manifestPath,
  `${prefix}/ui-manifest.json`,
  'public,max-age=60,must-revalidate',
  'application/json',
);

console.info(`[publish-ui-ota] Live on Cloudflare CDN: ${manifest.bundleUrl}`);
const publicBase = (process.env.CLOUDFLARE_CDN_URL || 'https://ota.runpage.site').replace(/\/+$/, '');
console.info(`[publish-ui-ota] Manifest: ${publicBase}/ui-manifest.json`);

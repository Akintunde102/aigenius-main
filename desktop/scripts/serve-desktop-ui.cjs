'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const HOST = process.env.HOSTNAME || process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 23001);
const ROOT = process.env.AIGENIUS_DESKTOP_UI_ROOT
  ? path.resolve(process.env.AIGENIUS_DESKTOP_UI_ROOT)
  : path.resolve(__dirname, '..', '..', 'desktop-renderer', 'dist');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.map': 'application/json; charset=utf-8',
};

function contentType(filePath) {
  return MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

function safeJoin(root, requestPath) {
  const normalized = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, normalized);
  if (!filePath.startsWith(root)) {
    return null;
  }
  return filePath;
}

function resolveFile(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relPath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = safeJoin(ROOT, relPath);
  if (!filePath) {
    return null;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }
  const withIndex = safeJoin(ROOT, path.join(relPath, 'index.html'));
  if (withIndex && fs.existsSync(withIndex) && fs.statSync(withIndex).isFile()) {
    return withIndex;
  }
  return safeJoin(ROOT, 'index.html');
}

const server = http.createServer((req, res) => {
  const filePath = resolveFile(req.url || '/');
  if (!filePath || !fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType(filePath),
    'Content-Length': stat.size,
    'Cache-Control': filePath.includes(`${path.sep}assets${path.sep}`)
      ? 'public, max-age=31536000, immutable'
      : 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.info(`[aigenius-desktop-ui] serving ${ROOT} at http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
  console.error('[aigenius-desktop-ui] server error:', err);
  process.exit(1);
});

'use strict';

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const serverRoot = path.resolve(desktopRoot, '..', 'desktop-server');

const platform = (process.env.AIGENIUS_PACKAGE_PLATFORM || process.argv[2] || process.platform).trim();
const arch = (process.env.AIGENIUS_PACKAGE_ARCH || process.argv[3] || process.arch).trim();

const packRoot = path.join(serverRoot, 'pack-deps', `${platform}-${arch}`);
const nodeModulesDir = path.join(packRoot, 'node_modules');

const JUNK_DIR_NAMES = new Set([
  'test',
  'tests',
  '__tests__',
  'docs',
  'doc',
  'example',
  'examples',
  '.github',
]);

const JUNK_FILE_EXTENSIONS = new Set(['.map', '.md', '.markdown', '.ts', '.flow']);

if (!fs.existsSync(nodeModulesDir)) {
  console.log(`[prune-binaries] No node_modules found at ${nodeModulesDir}, skipping.`);
  process.exit(0);
}

console.log(`[prune-binaries] Pruning node_modules for ${platform}-${arch} at ${nodeModulesDir}...`);

const extensionsToDelete = [];
if (platform === 'darwin') {
  extensionsToDelete.push('.dll', '.exe', '.so');
} else if (platform === 'win32') {
  extensionsToDelete.push('.dylib', '.so');
} else if (platform === 'linux') {
  extensionsToDelete.push('.dll', '.exe', '.dylib');
}

let removedCount = 0;
let removedBytes = 0;

function recordRemoval(fullPath) {
  try {
    const stat = fs.statSync(fullPath);
    removedBytes += stat.size;
    removedCount++;
  } catch {
    /* ignore */
  }
}

function walkAndPrune(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === '@types' && dir.endsWith('node_modules')) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        recordRemoval(fullPath);
        continue;
      }
      if (JUNK_DIR_NAMES.has(entry.name)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        recordRemoval(fullPath);
        continue;
      }
      walkAndPrune(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();
    let shouldDelete = extensionsToDelete.includes(ext) || JUNK_FILE_EXTENSIONS.has(ext);

    // Never prune ONNX Runtime dylibs — versioned names (e.g. libonnxruntime.1.24.3.dylib)
    // must stay beside onnxruntime_binding.node or the mini-server crashes at import time.
    if (dir.includes('onnxruntime-node') && entry.name.endsWith('.dylib')) {
      shouldDelete = false;
    }

    if (shouldDelete) {
      try {
        recordRemoval(fullPath);
        fs.unlinkSync(fullPath);
      } catch {
        /* ignore */
      }
    }
  }
}

walkAndPrune(nodeModulesDir);

const onnxBinDir = path.join(nodeModulesDir, 'onnxruntime-node', 'bin');
if (fs.existsSync(onnxBinDir)) {
  const dirs = fs.readdirSync(onnxBinDir);
  for (const d of dirs) {
    const fullPath = path.join(onnxBinDir, d);
    if (!fs.statSync(fullPath).isDirectory()) continue;

    // In modern onnxruntime-node, platforms are nested inside 'napi-v3' or 'napi-v6'
    let subDirsToPrune = [];
    if (d.startsWith('napi-')) {
      const innerDirs = fs.readdirSync(fullPath);
      for (const inner of innerDirs) {
        if (fs.statSync(path.join(fullPath, inner)).isDirectory()) {
          subDirsToPrune.push({ name: inner, fullPath: path.join(fullPath, inner) });
        }
      }
    } else {
      subDirsToPrune.push({ name: d, fullPath: fullPath });
    }

    for (const sub of subDirsToPrune) {
      const lower = sub.name.toLowerCase();
      const isMac = lower.includes('darwin') || lower.includes('osx') || lower.includes('mac');
      const isWin = lower.includes('win');
      const isLinux = lower.includes('linux') || lower.includes('ubuntu');
      const isArm = lower.includes('arm');
      const isX64 = lower.includes('x64');

      let shouldDeleteDir = false;
      if (platform === 'darwin' && (isWin || isLinux)) shouldDeleteDir = true;
      if (platform === 'win32' && (isMac || isLinux)) shouldDeleteDir = true;
      if (platform === 'linux' && (isWin || isMac)) shouldDeleteDir = true;
      if (arch === 'arm64' && isX64) shouldDeleteDir = true;
      if (arch === 'x64' && isArm) shouldDeleteDir = true;

      if (shouldDeleteDir) {
        console.log(`[prune-binaries] Removing unused ONNX platform dir: ${sub.name}`);
        fs.rmSync(sub.fullPath, { recursive: true, force: true });
      }
    }
  }
}

function sharpPackagesForTarget(targetPlatform, targetArch) {
  const keep = new Set();
  if (targetPlatform === 'darwin') {
    const suffix = targetArch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
    keep.add(`sharp-${suffix}`);
    keep.add(`sharp-libvips-${suffix}`);
  } else if (targetPlatform === 'win32') {
    const suffix = targetArch === 'arm64' ? 'win32-arm64' : 'win32-x64';
    keep.add(`sharp-${suffix}`);
  } else if (targetPlatform === 'linux') {
    const suffix = targetArch === 'arm64' ? 'linux-arm64' : 'linux-x64';
    keep.add(`sharp-${suffix}`);
    keep.add(`sharp-libvips-${suffix}`);
    keep.add(`sharp-linuxmusl-${suffix}`);
    keep.add(`sharp-libvips-linuxmusl-${targetArch === 'arm64' ? 'arm64' : 'x64'}`);
  }
  return keep;
}

const imgDir = path.join(nodeModulesDir, '@img');
if (fs.existsSync(imgDir)) {
  const keepSharp = sharpPackagesForTarget(platform, arch);
  for (const entry of fs.readdirSync(imgDir)) {
    if (!entry.startsWith('sharp-') && !entry.startsWith('sharp-libvips-')) {
      continue;
    }
    if (keepSharp.has(entry)) {
      continue;
    }
    const fullPath = path.join(imgDir, entry);
    console.log(`[prune-binaries] Removing unused sharp platform package: ${entry}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }
}

console.log(
  `[prune-binaries] Done. Removed ${removedCount} files (~${(removedBytes / 1024 / 1024).toFixed(2)} MB estimated).`,
);

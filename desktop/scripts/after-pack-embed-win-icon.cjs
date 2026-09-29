'use strict';

const fs = require('fs');
const path = require('path');
const resedit = require('resedit');

exports.default = async function afterPackEmbedWinIcon(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const desktopRoot = path.resolve(__dirname, '..');
  const icoPath = path.join(desktopRoot, 'build', 'icon.ico');
  if (!fs.existsSync(icoPath)) {
    throw new Error(`afterPack: missing Windows icon at ${icoPath}`);
  }

  const exeName = `${context.packager.appInfo.productFilename}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  if (!fs.existsSync(exePath)) {
    throw new Error(`afterPack: missing Windows exe at ${exePath}`);
  }

  console.info('[afterPack] Embedding Windows icon using pure-JS resedit...');
  const exeBuffer = fs.readFileSync(exePath);
  const exe = resedit.NtExecutable.from(exeBuffer);
  const res = resedit.NtExecutableResource.from(exe);

  const iconBuffer = fs.readFileSync(icoPath);
  const iconFile = resedit.Data.IconFile.from(iconBuffer);

  resedit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    1,
    1033,
    iconFile.icons.map(item => item.data)
  );

  res.outputResource(exe);
  const newExeBuffer = exe.generate();
  fs.writeFileSync(exePath, Buffer.from(newExeBuffer));

  console.info('[afterPack] Successfully embedded Windows icon into', exePath);
};

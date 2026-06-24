const fs = require('fs');
const path = require('path');

// Try local node_modules first, then parent node_modules (for hoisted monorepos)
const possibleSrcs = [
    path.join(__dirname, '../node_modules/monaco-editor/min'),
    path.join(__dirname, '../../node_modules/monaco-editor/min')
];

let src = null;
for (const s of possibleSrcs) {
    if (fs.existsSync(s)) {
        src = s;
        break;
    }
}

const dest = path.join(__dirname, '../public/monaco-editor/min');

if (src) {
    console.log(`Copying Monaco Editor from ${src} to ${dest}...`);
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    copyRecursiveSync(src, dest);
    console.log('Successfully copied Monaco Editor assets.');
} else {
    console.error('Error: monaco-editor not found in node_modules (tried local and parent).');
    console.error('Please run "yarn install" or "npm install" first.');
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        // Only copy if different to avoid unnecessary writes
        if (!fs.existsSync(dest) || fs.statSync(src).size !== fs.statSync(dest).size) {
            fs.copyFileSync(src, dest);
        }
    }
}

/**
 * `vite-plugin-storybook-nextjs` passes SWC options that Next 13's bundled `@swc/core` rejects
 * (`preferEsm`, `isServerCompiler`, …). Strip known-incompatible fields from the plugin dist
 * before Storybook builds (no-op if already patched or the plugin changes).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "../node_modules/vite-plugin-storybook-nextjs/dist/index.cjs"),
  path.join(__dirname, "../node_modules/vite-plugin-storybook-nextjs/dist/index.js"),
];

const preferEsmBlock =
  "\n    // For app router we prefer to bundle ESM,\n    // On server side of pages router we prefer CJS.\n    preferEsm: esm";

const isServerCompilerLine = "\n    isServerCompiler: isServerEnvironment,";

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.warn("[storybook-swc-patch] skip (missing):", file);
    continue;
  }
  let s = fs.readFileSync(file, "utf8");
  let changed = false;
  if (s.includes("preferEsm: esm") && s.includes(preferEsmBlock)) {
    s = s.replace(preferEsmBlock, "");
    changed = true;
  }
  if (s.includes("isServerCompiler: isServerEnvironment") && s.includes(isServerCompilerLine)) {
    s = s.replace(isServerCompilerLine, "");
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(file, s, "utf8");
    console.log("[storybook-swc-patch] patched", path.basename(file));
  }
}

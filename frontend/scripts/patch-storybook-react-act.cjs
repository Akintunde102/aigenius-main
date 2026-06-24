/**
 * Vite/Rolldown can bundle `import * as React` so `{ ...React }` omits `act` (non-own export).
 * `@storybook/react` then falls back to `import("react-dom/test-utils")`, which resolves poorly
 * with the Next plugin aliases — `reactAct` becomes undefined → "actImplementation is not a function".
 * Using the namespace object preserves `React.act` (live binding).
 */
"use strict";

const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "@storybook",
  "react",
  "dist",
  "_browser-chunks",
  "chunk-L3JF7GGZ.js",
);

if (!fs.existsSync(file)) {
  console.warn("[patch-sb-react-act] skip (missing):", file);
  process.exit(0);
}

const from = "var clonedReact = { ...React };";
const to = "var clonedReact = React;";
let s = fs.readFileSync(file, "utf8");

if (s.includes(to)) {
  process.exit(0);
}
if (!s.includes(from)) {
  console.warn("[patch-sb-react-act] pattern missing; Storybook may have changed layout:", file);
  process.exit(0);
}

fs.writeFileSync(file, s.replace(from, to), "utf8");
console.log("[patch-sb-react-act] patched", path.basename(file));

/**
 * Storybook 10 + `@storybook/nextjs-vite` assume a newer Next.js tree than 13.4.x.
 * Add minimal files/modules that the toolchain resolves at build time.
 */
"use strict";

const fs = require("fs");
const path = require("path");

function writeIfMissing(filePath, contents, marker) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    console.warn("[storybook-next13-shims] skip (dir missing):", dir);
    return;
  }
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath, "utf8");
    if (!existing.includes(marker)) {
      console.warn("[storybook-next13-shims] file exists, not ours — skip:", filePath);
    }
    return;
  }
  fs.writeFileSync(filePath, contents, "utf8");
  console.log("[storybook-next13-shims] wrote", filePath);
}

const root = path.join(__dirname, "..");
const nextCompiled = path.join(root, "node_modules", "next", "dist", "compiled", "react-dom", "cjs");

const testUtilsShim = path.join(nextCompiled, "react-dom-test-utils.production.js");
const testUtilsContents = `'use strict';
// Shim for Storybook — see scripts/storybook-next13-shims.cjs
module.exports = require('react-dom/test-utils');
`;
writeIfMissing(testUtilsShim, testUtilsContents, "storybook-next13-shims");

// Copied from Next 14.2.x so `vite-plugin-storybook-nextjs` navigation mocks can import it.
const redirectStatusPath = path.join(
  root,
  "node_modules",
  "next",
  "dist",
  "client",
  "components",
  "redirect-status-code.js",
);
const redirectStatusContents = `"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RedirectStatusCode", {
    enumerable: true,
    get: function() {
        return RedirectStatusCode;
    }
});
var RedirectStatusCode;
(function(RedirectStatusCode) {
    RedirectStatusCode[RedirectStatusCode["SeeOther"] = 303] = "SeeOther";
    RedirectStatusCode[RedirectStatusCode["TemporaryRedirect"] = 307] = "TemporaryRedirect";
    RedirectStatusCode[RedirectStatusCode["PermanentRedirect"] = 308] = "PermanentRedirect";
})(RedirectStatusCode || (RedirectStatusCode = {}));
// Shim for Storybook — see scripts/storybook-next13-shims.cjs
`;
writeIfMissing(redirectStatusPath, redirectStatusContents, "storybook-next13-shims");

/**
 * Babel config for React Compiler trial builds only.
 * Copied to babel.config.js by scripts/build-desktop-compiler.cjs — not used in normal dev (SWC).
 */

/** @type {import('@babel/core').TransformOptions} */
module.exports = {
  presets: ['next/babel'],
  plugins: [['babel-plugin-react-compiler', { target: '18' }]],
};

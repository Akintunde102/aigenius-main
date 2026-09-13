import { describe, expect, it, jest } from '@jest/globals';
import { parseSymbols, parseImports, parseSymbolsAsync } from './symbol-parser';

describe('parseSymbols', () => {
  it('extracts TypeScript exports', () => {
    const content = `
export class Foo {
  bar() {}
}
export function baz() {}
export const x = 1;
`;
    const symbols = parseSymbols(content, 'ts');
    expect(symbols.some((s) => s.kind === 'class' && s.name === 'Foo')).toBe(true);
    expect(symbols.some((s) => s.kind === 'function' && s.name === 'baz')).toBe(true);
    expect(symbols.some((s) => s.kind === 'const' && s.name === 'x')).toBe(true);
  });

  it('returns empty for non-code extensions', () => {
    expect(parseSymbols('hello', 'txt')).toEqual([]);
  });
});

describe('parseSymbolsAsync', () => {
  it('falls back to regex parsing when tree-sitter is unavailable (packaged build)', async () => {
    // `web-tree-sitter` is intentionally excluded from packaged builds; the dynamic import
    // must reject without crashing the caller. See install-server-deps-for-platform.cjs.
    jest.doMock('./tree-sitter-bridge', () => {
      throw new Error("Cannot find package 'web-tree-sitter'");
    });

    const content = `export class Foo {\n  bar() {}\n}\nexport function baz() {}\n`;
    const symbols = await parseSymbolsAsync(content, 'ts');

    expect(symbols.some((s) => s.kind === 'class' && s.name === 'Foo')).toBe(true);
    expect(symbols.some((s) => s.kind === 'function' && s.name === 'baz')).toBe(true);

    jest.dontMock('./tree-sitter-bridge');
  });
});

describe('parseImports', () => {
  it('finds ES module imports', () => {
    const content = `import fs from 'fs';\nimport { x } from './local';`;
    const imports = parseImports(content, 'ts');
    expect(imports.some((i) => i.module === 'fs' && !i.isRelative)).toBe(true);
    expect(imports.some((i) => i.module === './local' && i.isRelative)).toBe(true);
  });
});

import { describe, expect, it } from '@jest/globals';
import { parseSymbols, parseImports } from './symbol-parser';

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

describe('parseImports', () => {
  it('finds ES module imports', () => {
    const content = `import fs from 'fs';\nimport { x } from './local';`;
    const imports = parseImports(content, 'ts');
    expect(imports.some((i) => i.module === 'fs' && !i.isRelative)).toBe(true);
    expect(imports.some((i) => i.module === './local' && i.isRelative)).toBe(true);
  });
});

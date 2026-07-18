import { describe, expect, it, beforeEach } from '@jest/globals';
import {
  applyEditorDefaultsToToolArgs,
  getMainActiveEditor,
  setMainActiveEditor,
} from './active-editor-main';

describe('active-editor-main (Phase 6–7 tool defaults)', () => {
  beforeEach(() => {
    setMainActiveEditor(null);
  });

  it('applies open file path and cursor to go-to-definition args', () => {
    setMainActiveEditor({
      path: '/projects/demo/src/auth.ts',
      name: 'auth.ts',
      line: 42,
      character: 8,
      selection: 'validateToken',
    });

    const args = applyEditorDefaultsToToolArgs({}, { path: true, line: true, character: true });
    expect(args).toEqual({
      path: '/projects/demo/src/auth.ts',
      line: 42,
      character: 8,
    });
  });

  it('does not override explicit tool arguments', () => {
    setMainActiveEditor({
      path: '/open.ts',
      name: 'open.ts',
      line: 1,
      character: 1,
    });

    const args = applyEditorDefaultsToToolArgs(
      { path: '/explicit.ts', line: 99 },
      { path: true, line: true, character: true },
    );
    expect(args.path).toBe('/explicit.ts');
    expect(args.line).toBe(99);
  });

  it('uses selection as symbol for find-references when symbol omitted', () => {
    setMainActiveEditor({
      path: '/src/util.ts',
      name: 'util.ts',
      line: 10,
      character: 4,
      selection: 'helperFn',
    });

    const args = applyEditorDefaultsToToolArgs({}, { symbol: true });
    expect(args.symbol).toBe('helperFn');
  });

  it('snapshot: typical editor context payload', () => {
    setMainActiveEditor({
      path: 'C:/Users/dev/project/src/service.ts',
      name: 'service.ts',
      line: 15,
      character: 12,
      selection: 'UserService',
    });
    expect(getMainActiveEditor()).toMatchSnapshot();
  });
});

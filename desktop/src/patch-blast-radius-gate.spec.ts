import { describe, expect, it, beforeEach } from '@jest/globals';
import type { PatchOp } from './local-apply-patch-types';
import {
  checkBlastRadiusGate,
  recordBlastRadiusCheck,
  riskyPatchPaths,
} from './patch-blast-radius-gate';

describe('patch-blast-radius-gate', () => {
  beforeEach(() => {
    process.env.AIGENIUS_SKIP_BLAST_RADIUS_GATE = '1';
  });

  it('riskyPatchPaths flags apply_hunk on ts files', () => {
    const ops: PatchOp[] = [
      {
        kind: 'apply_hunk',
        path: 'C:\\Users\\me\\project\\src\\foo.ts',
        search: 'old',
        replace: 'new',
      },
    ];
    const risky = riskyPatchPaths(ops);
    expect(risky.some((p) => p.includes('foo.ts'))).toBe(true);
  });

  it('checkBlastRadiusGate blocks when no prior blast radius', () => {
    delete process.env.AIGENIUS_SKIP_BLAST_RADIUS_GATE;
    const file = 'C:\\Users\\me\\project\\src\\bar.ts';
    const ops: PatchOp[] = [
      { kind: 'update_file', path: file, content: 'export const x = 1;' },
    ];
    expect(checkBlastRadiusGate(ops)).toContain('Blast-radius check required');
    recordBlastRadiusCheck([file]);
    expect(checkBlastRadiusGate(ops)).toBeNull();
    process.env.AIGENIUS_SKIP_BLAST_RADIUS_GATE = '1';
  });
});

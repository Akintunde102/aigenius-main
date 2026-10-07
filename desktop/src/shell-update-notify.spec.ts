import type { OtaCheckResult } from './desktop-ui-ota';
import { shellUpdatePayloadFromOtaResult } from './shell-update-notify';

describe('shellUpdatePayloadFromOtaResult', () => {
  it('returns null when OTA is up to date', () => {
    const result: OtaCheckResult = { status: 'up-to-date', currentVersion: '1.0.0' };
    expect(shellUpdatePayloadFromOtaResult(result)).toBeNull();
  });

  it('maps incompatible-shell to store channel when windowsStore is set', () => {
    const result: OtaCheckResult = {
      status: 'incompatible-shell',
      requiredShellVersion: '2.0.0',
      installedShellVersion: '1.0.0',
    };
    expect(shellUpdatePayloadFromOtaResult(result, { isWindowsStore: true })).toEqual({
      requiredShellVersion: '2.0.0',
      installedShellVersion: '1.0.0',
      updateChannel: 'microsoft-store',
    });
  });

  it('maps incompatible-shell to standalone channel outside Store', () => {
    const result: OtaCheckResult = {
      status: 'incompatible-shell',
      requiredShellVersion: '2.0.0',
      installedShellVersion: '1.0.0',
    };
    expect(shellUpdatePayloadFromOtaResult(result, { isWindowsStore: false })).toEqual({
      requiredShellVersion: '2.0.0',
      installedShellVersion: '1.0.0',
      updateChannel: 'standalone',
    });
  });
});

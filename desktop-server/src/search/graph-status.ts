export type GraphStatus = 'none' | 'pending' | 'complete' | 'skipped' | 'error';

export function normalizeGraphStatus(value: string | null | undefined): GraphStatus {
  if (value === 'complete' || value === 'pending' || value === 'skipped' || value === 'error') {
    return value;
  }
  return 'none';
}

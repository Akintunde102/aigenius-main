export function toolStreamingInlineStatus(loading: boolean, success?: boolean): string {
  if (loading) return 'running…';
  if (success === false) return 'failed';
  return 'done';
}

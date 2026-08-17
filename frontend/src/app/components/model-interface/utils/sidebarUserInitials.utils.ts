/** Initials for chat sidebar avatar from hydrated user object. */
export function getSidebarUserInitials(user: unknown): string {
  if (!user || typeof user !== 'object') return 'U';
  const u = user as Record<string, unknown>;
  const fn = typeof u.firstName === 'string' ? u.firstName.trim() : '';
  const ln = typeof u.lastName === 'string' ? u.lastName.trim() : '';
  if (fn && ln) return `${fn[0]!}${ln[0]!}`.toUpperCase();
  if (fn) return fn.slice(0, 2).toUpperCase();
  const email = typeof u.email === 'string' ? u.email.trim() : '';
  if (email) return email.slice(0, 2).toUpperCase();
  return 'U';
}

import { Navigate, useLocation } from 'react-router-dom';
import { hasAuthSession } from '@/lib/utils/auth-session';

export function ChatAuthGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!hasAuthSession()) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/desktop-login?next=${next}`} replace />;
  }

  return <>{children}</>;
}

import { Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

const PublicCiviWidget = lazy(() =>
  import('@/components/public/PublicCiviWidget').then((module) => ({ default: module.PublicCiviWidget })),
);

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function PublicCiviHost() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  if (loading || user) return null;
  if (AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return null;

  return (
    <Suspense fallback={null}>
      <PublicCiviWidget />
    </Suspense>
  );
}

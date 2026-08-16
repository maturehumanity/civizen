import { Route } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { lazyWithChunkReload } from '@/lib/lazy-with-chunk-reload';

const Happiness = lazyWithChunkReload(() => import('@/pages/happiness/Happiness'));
const HappinessCheckIn = lazyWithChunkReload(() => import('@/pages/happiness/HappinessCheckIn'));
const HappinessReview = lazyWithChunkReload(() => import('@/pages/happiness/HappinessReview'));
const HappinessWork = lazyWithChunkReload(() => import('@/pages/happiness/HappinessWork'));

export const happinessAppRoutes = (
  <>
    <Route path="/happiness" element={<ProtectedRoute><Happiness /></ProtectedRoute>} />
    <Route path="/happiness/check-in" element={<ProtectedRoute><HappinessCheckIn /></ProtectedRoute>} />
    <Route path="/happiness/review" element={<ProtectedRoute><HappinessReview /></ProtectedRoute>} />
    <Route path="/happiness/work" element={<ProtectedRoute><HappinessWork /></ProtectedRoute>} />
  </>
);

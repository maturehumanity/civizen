import { Route } from 'react-router-dom';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { lazyWithChunkReload } from '@/lib/lazy-with-chunk-reload';

const Happiness = lazyWithChunkReload(() => import('@/pages/happiness/Happiness'));
const HappinessCheckIn = lazyWithChunkReload(() => import('@/pages/happiness/HappinessCheckIn'));
const HappinessReview = lazyWithChunkReload(() => import('@/pages/happiness/HappinessReview'));
const HappinessImprove = lazyWithChunkReload(() => import('@/pages/happiness/HappinessImprove'));
const HappinessWork = lazyWithChunkReload(() => import('@/pages/happiness/HappinessWork'));
const HappinessPrivacy = lazyWithChunkReload(() => import('@/pages/happiness/HappinessPrivacy'));
const WellbeingInsights = lazyWithChunkReload(() => import('@/pages/wellbeing/WellbeingInsights'));
const HumanOutcomeReview = lazyWithChunkReload(() => import('@/pages/wellbeing/HumanOutcomeReview'));

export const happinessAppRoutes = (
  <>
    <Route path="/happiness" element={<ProtectedRoute><Happiness /></ProtectedRoute>} />
    <Route path="/happiness/check-in" element={<ProtectedRoute><HappinessCheckIn /></ProtectedRoute>} />
    <Route path="/happiness/review" element={<ProtectedRoute><HappinessReview /></ProtectedRoute>} />
    <Route path="/happiness/improve" element={<ProtectedRoute><HappinessImprove /></ProtectedRoute>} />
    <Route path="/happiness/work" element={<ProtectedRoute><HappinessWork /></ProtectedRoute>} />
    <Route path="/happiness/privacy" element={<ProtectedRoute><HappinessPrivacy /></ProtectedRoute>} />
    <Route path="/wellbeing-insights" element={<ProtectedRoute><WellbeingInsights /></ProtectedRoute>} />
    <Route path="/wellbeing-insights/outcome" element={<ProtectedRoute><HumanOutcomeReview /></ProtectedRoute>} />
  </>
);

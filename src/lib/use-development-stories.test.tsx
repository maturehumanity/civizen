import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useDevelopmentStories } from '@/lib/use-development-stories';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ profile: { id: 'profile-1' } }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(async () => ({ data: [], error: null })),
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

vi.mock('@/lib/development-stories', () => ({
  getSeedDevelopmentStories: () => [
    {
      id: 'seed-1',
      requestedAt: '2026-01-01T00:00:00.000Z',
      storyKind: 'development',
      section: 'Home',
      area: 'Feed',
      title: 'Seed',
      originalInstruction: 'Do it',
      rephrasedDescription: 'Do it carefully',
      createdFeatures: [],
      expectedBehavior: 'Works',
    },
  ],
}));

describe('useDevelopmentStories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch or ingest when disabled', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { result } = renderHook(() => useDevelopmentStories({ enabled: false }));

    expect(result.current.loading).toBe(false);
    await waitFor(() => {
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });

  it('loads when enabled', async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { result } = renderHook(() => useDevelopmentStories({ enabled: true }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(supabase.rpc).toHaveBeenCalled();
  });
});

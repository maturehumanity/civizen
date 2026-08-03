import { supabase } from '@/integrations/supabase/client';
import {
  type SocialProvider,
  isSocialProvider,
} from '@/lib/civizen-org-account';

export type SocialConnectionStatus = {
  provider: SocialProvider;
  connected: boolean;
  configured: boolean;
  externalAccountName: string | null;
  status: string | null;
  lastError: string | null;
};

export type SocialCrosspostStatus = {
  provider: SocialProvider;
  status: 'published' | 'failed' | string;
  externalPostId: string | null;
};

type InvokeErrorBody = {
  error?: string;
};

async function invokeSocialAccounts<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('social-accounts', { body });
  if (error) {
    let message = error.message || 'Social accounts request failed.';
    try {
      const context = (error as { context?: Response }).context;
      if (context) {
        const payload = (await context.json()) as InvokeErrorBody;
        if (payload?.error) message = payload.error;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }
  if (data && typeof data === 'object' && 'error' in data && (data as InvokeErrorBody).error) {
    throw new Error(String((data as InvokeErrorBody).error));
  }
  return data as T;
}

export async function fetchSocialConnectionStatuses(): Promise<SocialConnectionStatus[]> {
  const result = await invokeSocialAccounts<{ connections?: SocialConnectionStatus[] }>({
    action: 'status',
  });
  return (result.connections || []).filter((row) => isSocialProvider(row.provider));
}

export async function startSocialOAuth(provider: SocialProvider): Promise<string> {
  const result = await invokeSocialAccounts<{ authorizeUrl?: string }>({
    action: 'oauth-start',
    provider,
  });
  if (!result.authorizeUrl) {
    throw new Error('Could not start social account connection.');
  }
  return result.authorizeUrl;
}

export async function disconnectSocialAccount(provider: SocialProvider): Promise<void> {
  await invokeSocialAccounts({ action: 'disconnect', provider });
}

export async function publishPostToSocial(params: {
  postId: string;
  provider: SocialProvider;
}): Promise<{ externalPostId?: string | null }> {
  return invokeSocialAccounts({
    action: 'publish',
    postId: params.postId,
    provider: params.provider,
  });
}

export async function fetchSocialCrosspostsForPosts(
  postIds: string[],
): Promise<Record<string, SocialCrosspostStatus[]>> {
  if (postIds.length === 0) return {};

  const { data, error } = await (supabase as unknown as {
    from: (table: string) => {
      select: (columns: string) => {
        in: (column: string, values: string[]) => Promise<{
          data: Array<{
            post_id: string;
            provider: string;
            status: string;
            external_post_id: string | null;
          }> | null;
          error: { message?: string } | null;
        }>;
      };
    };
  })
    .from('social_crossposts')
    .select('post_id, provider, status, external_post_id')
    .in('post_id', postIds);

  if (error) {
    // Table may not be readable yet or migration pending — treat as empty.
    return {};
  }

  const byPost: Record<string, SocialCrosspostStatus[]> = {};
  for (const row of data || []) {
    if (!isSocialProvider(row.provider)) continue;
    const list = byPost[row.post_id] || (byPost[row.post_id] = []);
    list.push({
      provider: row.provider,
      status: row.status,
      externalPostId: row.external_post_id,
    });
  }
  return byPost;
}

export function providerDisplayName(provider: SocialProvider): string {
  if (provider === 'linkedin') return 'LinkedIn';
  if (provider === 'facebook') return 'Facebook';
  return 'X';
}

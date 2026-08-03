import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  isOfficialCivizenOrgProfile,
  SOCIAL_PROVIDERS,
  type SocialProvider,
} from '@/lib/civizen-org-account';
import {
  disconnectSocialAccount,
  fetchSocialConnectionStatuses,
  providerDisplayName,
  startSocialOAuth,
  type SocialConnectionStatus,
} from '@/lib/social-accounts';
import { ArrowLeft, Loader2, Share2 } from 'lucide-react';
import { toast } from 'sonner';

function emptyStatuses(): SocialConnectionStatus[] {
  return SOCIAL_PROVIDERS.map((provider) => ({
    provider,
    connected: false,
    configured: false,
    externalAccountName: null,
    status: null,
    lastError: null,
  }));
}

export default function SocialAccountsSettings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { profile } = useAuth();
  const { t } = useLanguage();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<SocialProvider | null>(null);
  const [connections, setConnections] = useState<SocialConnectionStatus[]>(emptyStatuses);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const statuses = await fetchSocialConnectionStatuses();
      setConnections(statuses.length > 0 ? statuses : emptyStatuses());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.socialAccountsLoadFailed'));
      setConnections(emptyStatuses());
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await isOfficialCivizenOrgProfile(profile?.id, { username: profile?.username });
      if (cancelled) return;
      setAllowed(ok);
      if (!ok) {
        setLoading(false);
        return;
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.id, profile?.username, refresh]);

  useEffect(() => {
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (!connected && !error) return;

    if (connected) {
      toast.success(t('settings.socialAccountsConnected', { network: providerDisplayName(connected as SocialProvider) }));
      void refresh();
    } else if (error) {
      toast.error(t('settings.socialAccountsConnectFailed'));
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, refresh, t]);

  const handleConnect = async (provider: SocialProvider) => {
    setBusyProvider(provider);
    try {
      const url = await startSocialOAuth(provider);
      window.location.assign(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.socialAccountsConnectFailed'));
      setBusyProvider(null);
    }
  };

  const handleDisconnect = async (provider: SocialProvider) => {
    setBusyProvider(provider);
    try {
      await disconnectSocialAccount(provider);
      toast.success(t('settings.socialAccountsDisconnected', { network: providerDisplayName(provider) }));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('settings.socialAccountsDisconnectFailed'));
    } finally {
      setBusyProvider(null);
    }
  };

  if (allowed === false) {
    return (
      <AppLayout>
        <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
          <Button type="button" variant="ghost" size="sm" className="w-fit gap-2 px-0" onClick={() => navigate('/settings')}>
            <ArrowLeft className="h-4 w-4" />
            {t('settings.socialAccountsBack')}
          </Button>
          <Card className="border-border/70 p-4">
            <p className="text-sm text-muted-foreground">{t('settings.socialAccountsOrgOnly')}</p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <Button type="button" variant="ghost" size="sm" className="w-fit gap-2 px-0" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-4 w-4" />
          {t('settings.socialAccountsBack')}
        </Button>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Share2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{t('settings.socialAccounts')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.socialAccountsDescription')}</p>
          </div>
        </div>

        {loading || allowed === null ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((row) => {
              const busy = busyProvider === row.provider;
              const name = providerDisplayName(row.provider);
              return (
                <Card key={row.provider} className="border-border/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {row.connected
                          ? t('settings.socialAccountsConnectedAs', {
                              name: row.externalAccountName || name,
                            })
                          : row.configured
                            ? t('settings.socialAccountsNotConnected')
                            : t('settings.socialAccountsNotConfigured')}
                      </p>
                      {row.lastError ? (
                        <p className="mt-1 text-xs text-destructive">{row.lastError}</p>
                      ) : null}
                    </div>
                    {row.connected ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void handleDisconnect(row.provider)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.socialAccountsDisconnect')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || !row.configured}
                        onClick={() => void handleConnect(row.provider)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('settings.socialAccountsConnect')}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

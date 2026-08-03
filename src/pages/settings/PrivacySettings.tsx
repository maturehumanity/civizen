import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  disableBiometricSignIn,
  enableBiometricSignIn,
  getBiometricSignInCapability,
  isBiometricSignInSupportedPlatform,
} from '@/lib/biometric-sign-in';
import { ArrowLeft, Fingerprint, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PrivacySettings() {
  const navigate = useNavigate();
  const { session, profile } = useAuth();
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [deviceReady, setDeviceReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState('unsupported_platform');
  const nativeSupported = isBiometricSignInSupportedPlatform();

  const refresh = useCallback(async () => {
    const capability = await getBiometricSignInCapability();
    setDeviceReady(capability.deviceReady);
    setEnabled(capability.canUnlock);
    setStatus(capability.status);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleToggle = async (nextEnabled: boolean) => {
    if (!session?.user || busy) return;
    setBusy(true);
    try {
      if (nextEnabled) {
        const { error } = await enableBiometricSignIn(
          {
            accessToken: session.access_token,
            refreshToken: session.refresh_token,
            userId: session.user.id,
            email: session.user.email ?? undefined,
            displayName: profile?.full_name ?? undefined,
          },
          { reason: t('settings.biometricEnablePrompt') },
        );
        if (error) {
          toast.error(error.message || t('settings.biometricEnableFailed'));
          return;
        }
        toast.success(t('settings.biometricEnabled'));
      } else {
        const { error } = await disableBiometricSignIn();
        if (error) {
          toast.error(error.message || t('settings.biometricDisableFailed'));
          return;
        }
        toast.success(t('settings.biometricDisabled'));
      }
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const availabilityHint = (() => {
    if (!nativeSupported) return t('settings.biometricAndroidOnly');
    if (status === 'none_enrolled') return t('settings.biometricNoneEnrolled');
    if (!deviceReady) return t('settings.biometricUnavailable');
    return t('settings.biometricDescription');
  })();

  return (
    <AppLayout>
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-2 px-0"
          onClick={() => navigate('/settings')}
        >
          <ArrowLeft className="h-4 w-4" />
          {t('settings.biometricBack')}
        </Button>

        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Fingerprint className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{t('settings.privacy')}</h1>
            <p className="text-sm text-muted-foreground">{t('settings.privacyDescription')}</p>
          </div>
        </div>

        <Card className="space-y-4 border-border/80 p-4">
          <div className="flex items-start gap-4">
            <div className="flex-1 space-y-1">
              <h2 className="text-sm font-semibold text-foreground">{t('settings.biometricTitle')}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">{availabilityHint}</p>
            </div>
            {busy ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" /> : null}
            <Switch
              checked={enabled}
              disabled={busy || !nativeSupported || !deviceReady || !session?.user}
              onCheckedChange={(checked) => void handleToggle(checked)}
              aria-label={t('settings.biometricTitle')}
            />
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

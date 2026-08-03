import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { loadSupabaseClient } from '@/integrations/supabase/load-client';
import {
  TERMS_ACCEPTANCE_VERSION,
  buildTermsAcceptanceProfilePatch,
  resolveTermsReconsentGate,
} from '@/lib/terms-version';

type TermsReconsentGateProps = {
  children: ReactNode;
};

/**
 * Blocks protected app surfaces until the signed-in profile has affirmatively
 * accepted the current Terms version. Allowed legal/support paths still render.
 */
export function TermsReconsentGate({ children }: TermsReconsentGateProps) {
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const location = useLocation();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decision = resolveTermsReconsentGate({
    loading,
    hasUser: Boolean(user),
    profileLoaded: Boolean(profile),
    termsVersion: profile?.terms_version,
    pathname: location.pathname,
  });

  if (decision === 'pass-through') {
    return <>{children}</>;
  }

  if (decision === 'wait-for-profile') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse-soft text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  const acceptTerms = async () => {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const supabase = await loadSupabaseClient();
      const patch = buildTermsAcceptanceProfilePatch('reconsent');
      const { error: updateError } = await supabase
        .from('profiles')
        .update(patch)
        .eq('user_id', user.id)
        .is('deleted_at', null);

      if (updateError) {
        throw updateError;
      }

      await refreshProfile();
    } catch (err) {
      console.error('Failed to record Terms acceptance:', err);
      setError(t('terms.reconsentError'));
    } finally {
      setSubmitting(false);
    }
  };

  const declineTerms = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Decline must not write terms_version / terms_accepted_at.
      await signOut();
    } catch (err) {
      console.error('Failed to sign out after Terms decline:', err);
      setError(t('terms.reconsentError'));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md rounded-3xl border-border/70 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-display font-bold text-foreground">{t('terms.reconsentTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('terms.reconsentDescription')}</p>
            <p className="text-xs text-muted-foreground">
              {t('terms.versionLabel')}: <span className="font-medium text-foreground">{TERMS_ACCEPTANCE_VERSION}</span>
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm">
          <Link to="/terms" className="block text-primary underline-offset-4 hover:underline">
            {t('terms.title')}
          </Link>
          <Link to="/about/legal-status" className="block text-primary underline-offset-4 hover:underline">
            {t('legalStatusNotice.title')}
          </Link>
          <Link to="/settings/help" className="block text-primary underline-offset-4 hover:underline">
            {t('settings.helpSupport')}
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <div className="mt-6 flex flex-col gap-3">
          <Button type="button" disabled={submitting} onClick={() => void acceptTerms()}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('terms.reconsentAccept')}
          </Button>
          <Button type="button" variant="outline" disabled={submitting} onClick={() => void declineTerms()}>
            {t('terms.reconsentDecline')}
          </Button>
        </div>
      </Card>
    </div>
  );
}

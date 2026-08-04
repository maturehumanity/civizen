import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { MarketLumaActivitySection } from '@/components/market/MarketLumaActivitySection';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { LUMA_PROTOTYPE_NOTICE, formatLumaFromLumens } from '@/lib/prototype-credits';
import { useLumaWalletBalance } from '@/lib/use-luma-wallet-balance';

export default function PrototypeCreditsPage() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { profile, loading: authLoading } = useAuth();
  const { balanceLumens, loading: balanceLoading, error: balanceError } = useLumaWalletBalance();
  const [ledgerTick] = useState(0);
  const amountLocale = language === 'en' ? 'en-US' : language;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex min-h-[40vh] items-center justify-center px-4">
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        </div>
      </AppLayout>
    );
  }

  if (!profile?.id) {
    return (
      <AppLayout>
        <div className="px-4 py-6">
          <p className="text-sm text-muted-foreground">{t('settings.walletSignIn')}</p>
          <Button type="button" variant="link" className="mt-2 px-0" onClick={() => navigate('/settings')}>
            {t('settings.walletBack')}
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6" data-build-key="prototypeCreditsPage" data-build-label="Prototype credits page">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <AppPageHeader
            title={t('settings.walletPageTitle')}
            subtitle={t('settings.walletPageSubtitle')}
            fallbackPath="/settings"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.02 }}
          data-build-key="prototypeCreditsNotice"
          data-build-label="Prototype credits controlling notice"
        >
          <Card className="border-amber-500/40 bg-amber-500/5 p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-foreground">{LUMA_PROTOTYPE_NOTICE}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.04 }}
          data-build-key="prototypeCreditsAllocation"
          data-build-label="Demonstration allocation"
        >
          <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <Coins className="mt-0.5 h-9 w-9 shrink-0 text-primary/80" aria-hidden />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="text-base font-semibold text-foreground">{t('market.lumaBalanceTitle')}</h2>
                {balanceLoading ? (
                  <p className="text-sm text-muted-foreground">{t('market.lumaBalanceLoading')}</p>
                ) : balanceError ? (
                  <p className="text-sm text-destructive">{t('market.lumaBalanceUnavailable')}</p>
                ) : balanceLumens !== null ? (
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {formatLumaFromLumens(balanceLumens, { locale: amountLocale })}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('market.lumaBalanceUnavailable')}</p>
                )}
                <p className="text-xs text-muted-foreground">{t('market.lumaBalanceHint')}</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          data-build-key="prototypeCreditsMarketLink"
          data-build-label="Link to marketplace"
        >
          <Button type="button" variant="outline" className="w-full justify-center gap-2" asChild>
            <Link to="/market">{t('settings.walletOpenMarket')}</Link>
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          data-build-key="prototypeCreditsActivity"
          data-build-label="Prototype activity log"
        >
          <MarketLumaActivitySection
            key={`ledger-${profile.id}-${ledgerTick}`}
            profileId={profile.id}
            amountLocale={amountLocale}
            t={t}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          data-build-key="prototypeCreditsHelp"
          data-build-label="Prototype marketplace help"
        >
          <Card className="border-border/70 bg-card/95 p-5 shadow-sm">
            <div className="min-w-0 space-y-2">
              <h2 className="text-base font-semibold text-foreground">{t('market.paymentsInfoTitle')}</h2>
              <p className="text-sm text-muted-foreground">{t('market.paymentsInfoBody')}</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}

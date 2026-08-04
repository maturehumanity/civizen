import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  FUNDING_ADMIN_SECTIONS,
  parseFundingAdminSection,
  type FundingAdminSection,
} from '@/lib/funding/admin-sections';
import { cn } from '@/lib/utils';

import FundingAuditAdmin from '@/pages/settings/FundingAuditAdmin';
import FundingComplianceAdmin from '@/pages/settings/FundingComplianceAdmin';
import FundingContributorsAdmin from '@/pages/settings/FundingContributorsAdmin';
import FundingInterestAdmin from '@/pages/settings/FundingInterestAdmin';
import FundingLedgerAdmin from '@/pages/settings/FundingLedgerAdmin';

const SECTION_LABEL_KEY: Record<FundingAdminSection, string> = {
  interest: 'settings.adminFundingSectionInterest',
  ledger: 'settings.adminFundingSectionLedger',
  audit: 'settings.adminFundingSectionAudit',
  compliance: 'settings.adminFundingSectionCompliance',
  contributors: 'settings.adminFundingSectionContributors',
};

export default function FundingAdmin() {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabTriggerRefs = useRef<Partial<Record<FundingAdminSection, HTMLButtonElement | null>>>({});
  const section = useMemo(
    () => parseFundingAdminSection(searchParams.get('section')),
    [searchParams],
  );

  const setSection = (next: FundingAdminSection) => {
    if (next === section) return;
    setSearchParams(
      next === 'interest' ? {} : { section: next },
      { replace: true },
    );
  };

  useEffect(() => {
    const active = tabTriggerRefs.current[section];
    if (!active) return;
    active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [section]);

  return (
    <AppLayout>
      <div className="min-w-0 space-y-6 overflow-x-clip px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 space-y-4">
          <AppPageHeader
            title={t('settings.adminFunding')}
            subtitle={t('settings.adminFundingDescription')}
            fallbackPath="/settings"
            leading={
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Coins className="h-6 w-6" />
              </div>
            }
          />

          <Tabs
            value={section}
            onValueChange={(value) => setSection(parseFundingAdminSection(value))}
            className="w-full min-w-0"
          >
            {/*
              Underline text tabs (not pills): denser for admin section switching.
              Strip is width-constrained so overflow scrolls horizontally; scrollbar is hidden.
            */}
            <div className="-mx-4 min-w-0 overflow-x-auto overscroll-x-contain scroll-smooth touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList
                aria-label={t('settings.adminFundingSection')}
                className="inline-flex h-auto w-max min-w-full justify-start gap-0 rounded-none border-b border-border/60 bg-transparent p-0 text-foreground shadow-none"
              >
                {FUNDING_ADMIN_SECTIONS.map((item) => (
                  <TabsTrigger
                    key={item}
                    value={item}
                    ref={(node) => {
                      tabTriggerRefs.current[item] = node;
                    }}
                    className={cn(
                      'shrink-0 rounded-none border-b-2 border-transparent bg-transparent px-2.5 py-2 text-xs font-medium shadow-none',
                      'text-muted-foreground hover:text-foreground',
                      'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none',
                      'focus-visible:ring-1 focus-visible:ring-ring sm:px-3 sm:text-sm',
                    )}
                  >
                    {t(SECTION_LABEL_KEY[item])}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
        </motion.div>

        <div className="min-w-0">
          {section === 'interest' ? <FundingInterestAdmin embedded /> : null}
          {section === 'ledger' ? <FundingLedgerAdmin embedded /> : null}
          {section === 'audit' ? <FundingAuditAdmin embedded /> : null}
          {section === 'compliance' ? <FundingComplianceAdmin embedded /> : null}
          {section === 'contributors' ? <FundingContributorsAdmin embedded /> : null}
        </div>
      </div>
    </AppLayout>
  );
}

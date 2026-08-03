import { Link } from 'react-router-dom';

import { FundPageShell } from '@/components/funding/FundPageShell';
import { FundingInterestForm } from '@/components/funding/FundingInterestForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FundSupport() {
  const { t } = useLanguage();

  return (
    <FundPageShell
      title={t('fund.support.title')}
      description={t('fund.support.description')}
      pageTitle={t('fund.support.pageTitle')}
      pageDescription={t('fund.support.pageDescription')}
    >
      <ul className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
        <li>{t('fund.support.point1')}</li>
        <li>{t('fund.support.point2')}</li>
        <li>{t('fund.support.point3')}</li>
      </ul>

      <p className="text-sm text-muted-foreground">
        <Link to="/about/legal-status" className="text-primary underline-offset-4 hover:underline">
          {t('legalStatusNotice.title')}
        </Link>
      </p>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('fund.support.formTitle')}</h2>
        <FundingInterestForm lane="donation" showAccredited={false} />
      </section>
    </FundPageShell>
  );
}

import { Link } from 'react-router-dom';

import { FundPageShell } from '@/components/funding/FundPageShell';
import { FundingInterestForm } from '@/components/funding/FundingInterestForm';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FundContribute() {
  const { t } = useLanguage();

  return (
    <FundPageShell
      title={t('fund.contribute.title')}
      description={t('fund.contribute.description')}
      pageTitle={t('fund.contribute.pageTitle')}
      pageDescription={t('fund.contribute.pageDescription')}
    >
      <ul className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
        <li>{t('fund.contribute.point1')}</li>
        <li>{t('fund.contribute.point2')}</li>
        <li>{t('fund.contribute.point3')}</li>
      </ul>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/contribute/policy">{t('fund.contribute.policyLink')}</Link>
        </Button>
        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/contribute">{t('fund.contribute.civicCta')}</Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('fund.contribute.formTitle')}</h2>
        <FundingInterestForm lane="contributor" showAmount={false} />
      </section>
    </FundPageShell>
  );
}

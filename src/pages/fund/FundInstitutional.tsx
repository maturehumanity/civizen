import { FundPageShell } from '@/components/funding/FundPageShell';
import { FundingInterestForm } from '@/components/funding/FundingInterestForm';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { agreementsCreatePath } from '@/lib/agreements-model';
import { Link } from 'react-router-dom';

export default function FundInstitutional() {
  const { t } = useLanguage();

  return (
    <FundPageShell
      title={t('fund.institutional.title')}
      description={t('fund.institutional.description')}
      pageTitle={t('fund.institutional.pageTitle')}
      pageDescription={t('fund.institutional.pageDescription')}
    >
      <ul className="space-y-2 rounded-2xl border border-border/60 bg-card/70 p-4 text-sm text-muted-foreground">
        <li>{t('fund.institutional.point1')}</li>
        <li>{t('fund.institutional.point2')}</li>
        <li>{t('fund.institutional.point3')}</li>
      </ul>

      <Button type="button" variant="outline" asChild>
        <Link to={agreementsCreatePath({ source: 'funding', relatedTitle: t('fund.institutional.title'), agreementType: 'funding' })}>
          {t('agreements.createAction')}
        </Link>
      </Button>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('fund.institutional.formTitle')}</h2>
        <FundingInterestForm lane="institutional" />
      </section>
    </FundPageShell>
  );
}

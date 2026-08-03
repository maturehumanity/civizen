import { Link } from 'react-router-dom';

import { FundPageShell } from '@/components/funding/FundPageShell';
import { FundingInterestForm } from '@/components/funding/FundingInterestForm';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FundInvest() {
  const { t } = useLanguage();

  return (
    <FundPageShell
      title={t('fund.invest.title')}
      description={t('fund.invest.description')}
      pageTitle={t('fund.invest.pageTitle')}
      pageDescription={t('fund.invest.pageDescription')}
    >
      <section className="space-y-3 rounded-2xl border border-accent/30 bg-accent/5 p-5">
        <h2 className="text-lg font-semibold text-foreground">{t('fund.invest.riskTitle')}</h2>
        <p className="text-sm leading-relaxed text-foreground/90">{t('fund.invest.riskBody')}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('fund.invest.participationWording')}</p>
        <p className="text-sm">
          <Link to="/about/legal-status" className="text-primary underline-offset-4 hover:underline">
            {t('legalStatusNotice.title')}
          </Link>
        </p>
      </section>

      <ul className="space-y-2 text-sm text-muted-foreground">
        <li>{t('fund.invest.point1')}</li>
        <li>{t('fund.invest.point2')}</li>
        <li>{t('fund.invest.point3')}</li>
      </ul>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t('fund.invest.formTitle')}</h2>
        <FundingInterestForm
          lane="investor"
          requireRiskDisclosure
          showAccredited
          submitLabelKey="fund.form.submitInvestor"
        />
      </section>
    </FundPageShell>
  );
}

import { Link } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HAPPINESS_CONTRIBUTE_PATH, HAPPINESS_JOBS_PATH } from '@/lib/happiness/integrations';

type Translate = (key: string) => string;

export function WorkDomainDelegate({
  t,
  jobsPath = HAPPINESS_JOBS_PATH,
}: {
  t: Translate;
  jobsPath?: string;
}) {
  return (
    <Card className="space-y-3 rounded-2xl border-border/70 p-4">
      <p className="text-sm font-medium text-foreground">{t('happiness.plans.workDelegateTitle')}</p>
      <p className="text-sm text-muted-foreground">{t('happiness.plans.workDelegateBody')}</p>
      <div className="flex flex-col gap-2">
        <Button asChild>
          <Link to="/happiness/work">{t('happiness.openWorkFulfillment')}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to={jobsPath}>{t('happiness.plans.openJobs')}</Link>
        </Button>
        <Link to={HAPPINESS_CONTRIBUTE_PATH} className="text-sm text-primary underline-offset-4 hover:underline">
          {t('happiness.plans.tryContributeTrial')}
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">{t('happiness.plans.jobVsContributionFit')}</p>
    </Card>
  );
}

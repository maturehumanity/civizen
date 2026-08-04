import { motion } from 'framer-motion';
import { Link, Navigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  getContributePlaceholderLane,
  isContributePlaceholderId,
} from '@/lib/contribute-lanes';

export default function ContributeLane() {
  const { laneId } = useParams<{ laneId: string }>();
  const { t } = useLanguage();

  if (!laneId || !isContributePlaceholderId(laneId)) {
    return <Navigate to="/contribute" replace />;
  }

  const lane = getContributePlaceholderLane(laneId);
  if (!lane) {
    return <Navigate to="/contribute" replace />;
  }

  const Icon = lane.icon;

  return (
    <AppLayout>
      <div className="space-y-6 px-4 py-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <AppPageHeader
            title={t(lane.titleKey)}
            subtitle={t(lane.descriptionKey)}
            fallbackPath="/contribute"
            leading={
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Icon className={`h-7 w-7 ${lane.iconClassName}`} />
              </div>
            }
          />
        </motion.div>

        <Card className="space-y-3 border-border/70 bg-card/95 p-5 shadow-sm">
          <h2 className="font-semibold text-foreground">{t('contribute.placeholder.comingSoonTitle')}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {t('contribute.placeholder.comingSoonBody')}
          </p>
          {laneId === 'impact' ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t('contribute.placeholder.impactHint')}
            </p>
          ) : null}
        </Card>

        {lane.relatedLinks && lane.relatedLinks.length > 0 ? (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">
              {t('contribute.placeholder.relatedTitle')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {lane.relatedLinks.map((link) => (
                <Button key={link.path} asChild variant="outline" size="sm">
                  <Link to={link.path}>{t(link.labelKey)}</Link>
                </Button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </AppLayout>
  );
}

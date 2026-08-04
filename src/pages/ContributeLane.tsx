import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
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
        <Link
          to="/contribute"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('contribute.backToHub')}
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-4"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Icon className={`h-7 w-7 ${lane.iconClassName}`} />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {t(lane.titleKey)}
            </h1>
            <p className="text-base text-muted-foreground">{t(lane.descriptionKey)}</p>
          </div>
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

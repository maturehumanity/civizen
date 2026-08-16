import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { PUBLIC_JOBS_PATH } from '@/lib/public-jobs-path';

type OnboardingHeroProps = {
  reducedMotion: boolean | null;
};

export function OnboardingHero({ reducedMotion }: OnboardingHeroProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-primary/20 bg-gradient-to-br from-primary/10 via-card to-accent/5 px-6 py-10 text-center shadow-soft dark:border-primary/25 dark:from-primary/20 dark:via-card/90 dark:to-accent/10 dark:shadow-glow sm:px-12 sm:py-14">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-20 -top-24 h-56 w-56 rounded-full bg-primary/15 blur-3xl dark:bg-primary/25"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-accent/10 blur-3xl dark:bg-accent/20"
      />

      <motion.div
        className="relative mx-auto max-w-2xl"
        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-6">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {t('onboarding.title')}
          </h1>
          <p className="mt-1 text-lg font-semibold text-accent sm:text-xl">{t('onboarding.slogan')}</p>
        </div>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
          {t('onboarding.summary')}
        </p>

        <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <Button onClick={() => navigate('/signup')} className="h-12 gap-2 px-8 text-base dark:shadow-glow" size="lg">
            {t('onboarding.joinNetwork')}
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => navigate('/login')}
            variant="outline"
            className="h-12 border-primary/30 bg-background/80 px-8 text-base backdrop-blur-sm dark:bg-background/40"
            size="lg"
          >
            {t('onboarding.signIn')}
          </Button>
        </div>
        <Link
          to={PUBLIC_JOBS_PATH}
          className="mt-5 inline-block text-sm font-medium text-primary hover:underline"
          data-testid="onboarding-hero-jobs"
        >
          {t('onboarding.heroJobs')}
        </Link>
      </motion.div>
    </section>
  );
}

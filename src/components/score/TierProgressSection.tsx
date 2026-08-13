import { Card } from '@/components/ui/card';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CivizenScoreResponse } from '@/lib/civizen-score';
import { scoreCoverageCaption, scoreEvidenceEstimateCaption, scoreProgressCaption } from '@/lib/civizen-score-caption';
import {
  getDevelopmentalScoreColor,
  getTierRule,
  type CivizenTier,
} from '@/lib/civizen-score-tiers';
import { Blocks, Compass, Handshake, Info, Shield, Sparkles, type LucideIcon } from 'lucide-react';

const tierIcons: Record<CivizenTier, LucideIcon> = {
  explorer: Compass,
  builder: Blocks,
  contributor: Handshake,
  catalyst: Sparkles,
  steward: Shield,
};

function confidenceLabel(
  confidence: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  return t(`score.confidence.${confidence}`);
}

interface TierBadgeProps {
  tier: CivizenTier;
  size?: 'sm' | 'md';
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const { t } = useLanguage();
  const Icon = tierIcons[tier];
  const label = t(`score.tier.${tier}`);
  const rule = getTierRule(tier);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border bg-card/80 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      } font-semibold uppercase tracking-wide ${rule.accentClass}`}
      style={{ borderColor: `${rule.colorHex}55` }}
      aria-label={t('score.tierAria', { tier: label })}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} aria-hidden />
      {label}
    </span>
  );
}

interface TierProgressSectionProps {
  score: CivizenScoreResponse;
}

export function TierProgressSection({ score }: TierProgressSectionProps) {
  const { t } = useLanguage();
  const { tier } = score;
  if (!tier.finalTier) return null;

  const nextLabel = tier.nextTier ? t(`score.tier.${tier.nextTier}`) : null;
  const progress = tier.progress;

  return (
    <section className="w-full max-w-lg space-y-3" aria-label={t('score.tierProgressHeading')}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-foreground">
          {nextLabel
            ? t('score.progressToTier', { tier: nextLabel })
            : t('score.highestTierReached')}
        </h2>
        <HoverCard openDelay={160} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-card/80 text-primary"
              aria-label={t('score.tierEligibilityTitle')}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
            </button>
          </HoverCardTrigger>
          <HoverCardContent className="w-72 p-3 text-left text-xs leading-relaxed text-muted-foreground">
            {t('score.tierEligibilityDisclaimer')}
          </HoverCardContent>
        </HoverCard>
      </div>

      <Card className="space-y-3 p-4">
        <p className="text-sm text-muted-foreground">{getTierRule(tier.finalTier).description}</p>

        {scoreProgressCaption(score, t) ? (
          <p className="text-sm font-medium text-foreground">{scoreProgressCaption(score, t)}</p>
        ) : null}

        {progress.requirements.length > 0 ? (
          <ul className="space-y-2">
            {progress.requirements.map((req) => (
              <li
                key={req.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-border/50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{req.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('score.requirementCurrent')}:{' '}
                    {formatRequirementValue(req.currentValue, t)}
                    {' · '}
                    {t('score.requirementRequired')}:{' '}
                    {formatRequirementValue(req.requiredValue, t)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold ${
                    req.met ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {req.met ? t('score.requirementMet') : t('score.requirementNotMet')}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {tier.unmetRequirements.length > 0 && !tier.qualifiedForBaseTier ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">{t('score.qualificationBlocked')}</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              {tier.unmetRequirements.map((req) => (
                <li key={req.id}>{req.explanation || req.label}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function formatRequirementValue(
  value: number | string | boolean | null | undefined,
  t: (key: string) => string,
): string {
  if (value == null) return t('score.notYetScored');
  if (typeof value === 'boolean') return value ? t('common.yes') : t('common.no');
  return String(value);
}

interface ScoreTierSummaryProps {
  score: CivizenScoreResponse;
  compact?: boolean;
}

export function ScoreTierSummary({ score, compact = false }: ScoreTierSummaryProps) {
  const { t } = useLanguage();
  const overall = score.overall.score;
  const established = score.overall.status === 'established' && overall != null;
  const tier = score.tier.finalTier ?? 'explorer';
  const color = getDevelopmentalScoreColor(established ? overall : null, tier);
  const estimateCaption = scoreEvidenceEstimateCaption(score, t);
  const coverageCaption = scoreCoverageCaption(score, t);

  if (!established) {
    return (
      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        <p className={`font-display font-bold ${color} ${compact ? 'text-2xl' : 'text-3xl'}`}>
          {t('score.notEstablishedYet')}
        </p>
        <p className={`font-display font-semibold ${color} ${compact ? 'text-base' : 'text-lg'}`}>
          {t(`score.tier.${tier}`)}
        </p>
        {estimateCaption ? (
          <p className="text-sm text-muted-foreground">{estimateCaption}</p>
        ) : (
          <p className="text-sm text-muted-foreground">{t('home.scoreBuildingHint')}</p>
        )}
        {coverageCaption ? <p className="text-sm text-muted-foreground">{coverageCaption}</p> : null}
      </div>
    );
  }

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      <p className={`font-display font-bold ${compact ? 'text-2xl' : 'text-3xl'} ${color}`}>
        {overall.toFixed(1)} / 100
      </p>
      <TierBadge tier={tier} size={compact ? 'sm' : 'md'} />
      <p className="text-sm text-muted-foreground">
        {t('score.confidenceLabel')}: {confidenceLabel(score.overall.confidence, t)}
      </p>
      {scoreProgressCaption(score, t) ? (
        <p className="text-sm text-muted-foreground">{scoreProgressCaption(score, t)}</p>
      ) : null}
    </div>
  );
}

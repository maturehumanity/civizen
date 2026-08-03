import { motion } from 'framer-motion';
import { formatScore } from '@/lib/scoring';
import {
  formatScorePercent,
  getDevelopmentalScoreColor,
  getTierColorHex,
  TIER_RING_BANDS,
  TIER_RING_SEPARATORS,
  type CivizenTier,
} from '@/lib/civizen-score-tiers';
import { useLanguage } from '@/contexts/LanguageContext';

interface CivizenScoreProps {
  score: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
  /** When score is null, show this instead of the percent. */
  emptyLabel?: string;
  tier?: CivizenTier | null;
}

export function CivizenScore({
  score,
  size = 'md',
  showLabel = true,
  animate = true,
  emptyLabel,
  tier = null,
}: CivizenScoreProps) {
  const { t } = useLanguage();
  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-2xl',
    lg: 'w-32 h-32 text-4xl',
  };

  const hasScore = score != null && !Number.isNaN(score);
  const displayScore = hasScore ? score : 0;
  const displayTier = tier ?? 'explorer';
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = displayScore / 100;
  const strokeWidth = 10;
  const progressGapFraction = 0.006;
  const cx = 50;
  const cy = 50;
  const progressColor = getTierColorHex(displayTier);

  const Component = animate ? motion.div : 'div';
  const scoreColor = getDevelopmentalScoreColor(displayScore, displayTier);

  return (
    <div className="flex flex-col items-center gap-2">
      <Component
        className={`relative ${sizeClasses[size]} flex items-center justify-center`}
        initial={animate ? { scale: 0.8, opacity: 0 } : undefined}
        animate={animate ? { scale: 1, opacity: 1 } : undefined}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden>
          <g transform={`rotate(-90 ${cx} ${cy})`}>
            {TIER_RING_BANDS.map((band) => {
              const span = (band.toPercent - band.fromPercent) / 100;
              const start = band.fromPercent / 100;
              const gap = 0.006;
              const usable = Math.max(0.004, span - gap);
              const dash = usable * circumference;
              const gapDash = circumference - dash;
              const offset = -(start + gap / 2) * circumference;
              return (
                <circle
                  key={`band-${band.tier}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={getTierColorHex(band.tier)}
                  strokeOpacity={0.32}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  style={{
                    strokeDasharray: `${dash} ${gapDash}`,
                    strokeDashoffset: offset,
                  }}
                />
              );
            })}
            {TIER_RING_BANDS.map((band) => {
              const from = band.fromPercent / 100;
              const to = band.toPercent / 100;
              if (progress <= from) return null;
              const filledEnd = Math.min(progress, to);
              const halfGap = progressGapFraction / 2;
              const start = from + (from > 0 ? halfGap : 0);
              const end = filledEnd - (to < 1 && filledEnd >= to - 1e-6 ? halfGap : 0);
              const length = Math.max(0, end - start);
              if (length <= 0) return null;
              const dash = length * circumference;
              const gapDash = circumference - dash;
              const offset = -start * circumference;
              return (
                <motion.circle
                  key={`fill-${band.tier}`}
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={progressColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="butt"
                  style={{
                    strokeDasharray: `${dash} ${gapDash}`,
                    strokeDashoffset: offset,
                  }}
                  initial={animate ? { opacity: 0 } : undefined}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                />
              );
            })}
          </g>
          {TIER_RING_SEPARATORS.map((mark) => {
            const angle = -Math.PI / 2 + (mark.atPercent / 100) * 2 * Math.PI;
            const half = strokeWidth / 2 + 0.5;
            const cos = Math.cos(angle);
            const sin = Math.sin(angle);
            const x1 = cx + (radius - half) * cos;
            const y1 = cy + (radius - half) * sin;
            const x2 = cx + (radius + half) * cos;
            const y2 = cy + (radius + half) * sin;
            return (
              <g key={`sep-${mark.tier}`}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className="stroke-background"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={getTierColorHex(mark.tier)}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
        <motion.span
          className={`font-display font-bold leading-none ${scoreColor}`}
          initial={animate ? { opacity: 0 } : undefined}
          animate={animate ? { opacity: 1 } : undefined}
          transition={{ delay: 0.5 }}
        >
          {emptyLabel && !hasScore ? emptyLabel : formatScorePercent(displayScore)}
        </motion.span>
      </Component>
      {showLabel && (
        <motion.div
          className="text-center"
          initial={animate ? { opacity: 0, y: 10 } : undefined}
          animate={animate ? { opacity: 1, y: 0 } : undefined}
          transition={{ delay: 0.7 }}
        >
          <p className="text-sm font-medium text-foreground">{t('home.yourCivizenScore')}</p>
          <p className={`text-xs ${scoreColor}`}>{t(`score.tier.${displayTier}`)}</p>
        </motion.div>
      )}
    </div>
  );
}

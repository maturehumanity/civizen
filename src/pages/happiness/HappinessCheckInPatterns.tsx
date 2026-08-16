import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { explainCheckInPatterns, formatCheckInPattern } from '@/lib/happiness/checkin-patterns';
import type { HappinessCause, HappinessCheckIn } from '@/lib/happiness/types';

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function CheckInPatternCard({
  t,
  checkIns,
  causes,
  onImprove,
}: {
  t: Translate;
  checkIns: HappinessCheckIn[];
  causes: HappinessCause[];
  onImprove: () => void;
}) {
  const patterns = explainCheckInPatterns(checkIns, causes);
  if (!patterns.length) return null;
  const hasProblem = patterns.some((pattern) => pattern.polarity === 'problem');
  return (
    <Card className="rounded-2xl border-border/70 p-5" data-checkin-patterns="">
      <p className="text-sm font-medium text-foreground">{t('happiness.patternsTitle')}</p>
      <ul className="mt-2 space-y-1.5">
        {patterns.map((pattern) => (
          <li key={`${pattern.category}:${pattern.polarity}`} className="text-sm text-muted-foreground">
            {formatCheckInPattern(pattern, t)}
          </li>
        ))}
      </ul>
      {hasProblem ? (
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={onImprove}>
          {t('happiness.patternImproveHint')}
        </Button>
      ) : null}
    </Card>
  );
}

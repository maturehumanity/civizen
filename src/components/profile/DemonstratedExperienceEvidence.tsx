import { useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { demonstratedExperienceFromVerified, type DemonstratedExperience } from '@/lib/opportunities';
import { listVerifiedDemonstratedExperience } from '@/lib/opportunities-profile';

export function DemonstratedExperienceEvidence({
  profileId,
  active,
}: {
  profileId: string;
  active: boolean;
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<DemonstratedExperience[]>([]);

  useEffect(() => {
    if (!active || !profileId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void listVerifiedDemonstratedExperience(profileId)
      .then((verified) => {
        if (cancelled) return;
        setRows(
          verified.flatMap((row) => {
            const item = demonstratedExperienceFromVerified({
              opportunity: row.opportunity,
              participation: row.participation,
              skills: row.skills,
            });
            return item ? [item] : [];
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      });
    return () => {
      cancelled = true;
    };
  }, [active, profileId]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-1 border-t border-border/60 pt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('profile.experienceDetails.demonstratedTitle')}
      </p>
      <p className="text-xs text-muted-foreground">{t('profile.experienceDetails.demonstratedHint')}</p>
      <ul className="space-y-1 text-sm text-foreground">
        {rows.map((row) => (
          <li key={row.participationId}>
            {row.title}
            {row.skills.length > 0 ? (
              <span className="text-muted-foreground"> · {row.skills.join(', ')}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

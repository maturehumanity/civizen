import { useEffect, useState } from 'react';

import { useLanguage } from '@/contexts/LanguageContext';
import { listVerifiedSkillEvidenceForProfile } from '@/lib/opportunities-profile';

export function DemonstratedSkillEvidence({
  profileId,
  active,
}: {
  profileId: string;
  active: boolean;
}) {
  const { t } = useLanguage();
  const [rows, setRows] = useState<Array<{ skillName: string; opportunityTitle: string; participationId: string }>>(
    [],
  );

  useEffect(() => {
    if (!active || !profileId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    void listVerifiedSkillEvidenceForProfile(profileId)
      .then((verified) => {
        if (cancelled) return;
        setRows(
          verified.map((row) => ({
            skillName: row.skillName,
            opportunityTitle: row.opportunityTitle,
            participationId: row.participationId,
          })),
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
        {t('profile.skillsDetails.demonstratedTitle')}
      </p>
      <p className="text-xs text-muted-foreground">{t('profile.skillsDetails.demonstratedHint')}</p>
      <ul className="space-y-1 text-sm text-foreground">
        {rows.map((row) => (
          <li key={`${row.participationId}-${row.skillName}`}>
            {row.skillName}
            {row.opportunityTitle ? (
              <span className="text-muted-foreground"> · {row.opportunityTitle}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

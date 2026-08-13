import type { OpportunityEvidence } from '@/lib/opportunities';

export function OpportunityEvidenceList({
  items,
  emptyLabel,
  referenceLabel,
}: {
  items: OpportunityEvidence[];
  emptyLabel?: string;
  referenceLabel: string;
}) {
  if (items.length === 0) {
    return emptyLabel ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null;
  }
  return (
    <ul className="space-y-2 text-sm text-muted-foreground">
      {items.map((item) => (
        <li key={item.id}>
          {item.description}
          {item.referenceUrl ? (
            <>
              {' · '}
              <a className="underline" href={item.referenceUrl} target="_blank" rel="noreferrer">
                {item.referenceLabel || referenceLabel}
              </a>
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

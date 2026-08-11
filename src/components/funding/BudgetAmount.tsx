import { formatMinorCompact } from '@/lib/finance/money';
import { cn } from '@/lib/utils';

type BudgetAmountProps = {
  amountMinor: number;
  currency: string;
  className?: string;
};

/**
 * Shows whole dollars when |amount| ≥ $1,000; reveals cents only while hovering this number.
 */
export function BudgetAmount({ amountMinor, currency, className }: BudgetAmountProps) {
  const { display, precise, hideCents } = formatMinorCompact(Number(amountMinor), currency);
  return (
    <span
      className={cn(
        'group/money inline-block tabular-nums whitespace-nowrap',
        className,
      )}
      title={precise}
    >
      {hideCents ? (
        <>
          <span className="group-hover/money:hidden">{display}</span>
          <span className="hidden group-hover/money:inline">{precise}</span>
        </>
      ) : (
        precise
      )}
    </span>
  );
}

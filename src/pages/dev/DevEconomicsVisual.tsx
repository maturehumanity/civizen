import FundingEconomicsAdmin from '@/pages/settings/FundingEconomicsAdmin';

/**
 * DEV-only visual harness for Funding → Economics layout review.
 * Not linked from navigation. Not available in production builds.
 */
export default function DevEconomicsVisual() {
  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <p className="mb-3 text-xs text-muted-foreground">DEV visual harness · Economics only</p>
      <div className="mx-auto max-w-5xl border-b border-border/60 pb-2 mb-3 text-sm">
        Budget · Program plan · <span className="font-medium">Economics</span> · Overview · Sources · Interest
      </div>
      <FundingEconomicsAdmin embedded />
    </div>
  );
}

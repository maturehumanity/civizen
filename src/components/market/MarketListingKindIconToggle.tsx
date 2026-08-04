import { Handshake, Package } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { MarketListingKind } from '@/lib/use-market-published-listings';
import { cn } from '@/lib/utils';

type MarketListingKindIconToggleProps = {
  value: MarketListingKind;
  onChange: (kind: MarketListingKind) => void;
  productsLabel: string;
  servicesLabel: string;
  groupLabel: string;
};

function kindButtonClass(active: boolean) {
  return cn(
    'h-8 w-8 shrink-0',
    active
      ? 'bg-primary/15 text-primary hover:bg-primary/20 hover:text-primary'
      : 'text-muted-foreground hover:text-foreground',
  );
}

export function MarketListingKindIconToggle({
  value,
  onChange,
  productsLabel,
  servicesLabel,
  groupLabel,
}: MarketListingKindIconToggleProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-0.5" role="group" aria-label={groupLabel}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={kindButtonClass(value === 'product')}
              onClick={() => onChange('product')}
              aria-label={productsLabel}
              aria-pressed={value === 'product'}
              data-testid="market-listing-kind-products"
            >
              <Package className="h-4 w-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{productsLabel}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={kindButtonClass(value === 'service')}
              onClick={() => onChange('service')}
              aria-label={servicesLabel}
              aria-pressed={value === 'service'}
              data-testid="market-listing-kind-services"
            >
              <Handshake className="h-4 w-4" aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{servicesLabel}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

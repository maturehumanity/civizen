import { Repeat2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type HomeRepostMenuProps = {
  activeIdentityLabel: string;
  repostLabel: string;
  repostWithThoughtsLabel: string;
  plainRepostDescription: string;
  thoughtsDescription: string;
  postingAsLabel: string;
  alreadyRepostedLabel: string;
  undoRepostLabel: string;
  count: number;
  alreadyReposted: boolean;
  busy: boolean;
  disabled?: boolean;
  onPlainRepost: () => void;
  onRepostWithThoughts: () => void;
  onUndoRepost: () => void;
};

export function HomeRepostMenu({
  activeIdentityLabel,
  repostLabel,
  repostWithThoughtsLabel,
  plainRepostDescription,
  thoughtsDescription,
  postingAsLabel,
  alreadyRepostedLabel,
  undoRepostLabel,
  count,
  alreadyReposted,
  busy,
  disabled,
  onPlainRepost,
  onRepostWithThoughts,
  onUndoRepost,
}: HomeRepostMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className={`gap-1.5 rounded-xl px-2.5 sm:gap-2 sm:px-3 ${
            alreadyReposted
              ? 'bg-primary/10 text-primary hover:bg-primary/15'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
          }`}
          disabled={disabled || busy}
          aria-label={repostLabel}
        >
          <Repeat2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{repostLabel}</span>
          {count > 0 ? <span className="tabular-nums">({count})</span> : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(92vw,18rem)]">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {postingAsLabel}: <span className="font-medium text-foreground">{activeIdentityLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {alreadyReposted ? (
          <>
            <DropdownMenuItem disabled className="text-muted-foreground">
              {alreadyRepostedLabel}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={(event) => {
              event.preventDefault();
              onUndoRepost();
            }}>
              {undoRepostLabel}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              className="flex flex-col items-start gap-0.5 py-2"
              onSelect={(event) => {
                event.preventDefault();
                onPlainRepost();
              }}
            >
              <span className="font-medium text-foreground">{repostLabel}</span>
              <span className="text-xs text-muted-foreground">{plainRepostDescription}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex flex-col items-start gap-0.5 py-2"
              onSelect={(event) => {
                event.preventDefault();
                onRepostWithThoughts();
              }}
            >
              <span className="font-medium text-foreground">{repostWithThoughtsLabel}</span>
              <span className="text-xs text-muted-foreground">{thoughtsDescription}</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

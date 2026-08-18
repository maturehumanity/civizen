import { ExternalLink } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { previewPostContent, type PostPreview } from '@/lib/post-reposts';
import { cn } from '@/lib/utils';

type HomePostEmbeddedOriginalProps = {
  original: PostPreview | null;
  unavailableLabel: string;
  originalBadgeLabel: string;
  seeFullLabel: string;
  onOpenFull: () => void;
  className?: string;
};

function initials(name: string | null | undefined) {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export function HomePostEmbeddedOriginal({
  original,
  unavailableLabel,
  originalBadgeLabel,
  seeFullLabel,
  onOpenFull,
  className,
}: HomePostEmbeddedOriginalProps) {
  if (!original) {
    return (
      <div
        className={cn(
          'rounded-xl border border-dashed border-border/70 bg-muted/20 px-3 py-3 text-sm text-muted-foreground',
          className,
        )}
      >
        {unavailableLabel}
      </div>
    );
  }

  const authorName = original.author?.full_name || original.author?.username || 'Someone';
  const preview = previewPostContent(original.content);
  const published = new Date(original.created_at);
  const dateLabel = Number.isNaN(published.getTime())
    ? ''
    : published.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

  return (
    <button
      type="button"
      onClick={onOpenFull}
      className={cn(
        'w-full rounded-xl border border-border/70 bg-background/80 px-3 py-3 text-left transition hover:border-border hover:bg-muted/30',
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={original.author?.avatar_url || undefined} />
          <AvatarFallback className="bg-secondary text-xs text-secondary-foreground">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{authorName}</p>
          <p className="text-[11px] text-muted-foreground">
            {originalBadgeLabel}
            {dateLabel ? ` · ${dateLabel}` : ''}
          </p>
        </div>
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{preview.text}</p>
      {preview.truncated ? (
        <span className="mt-2 inline-flex text-xs font-medium text-primary">{seeFullLabel}</span>
      ) : null}
    </button>
  );
}

type HomeFullOriginalDialogBodyProps = {
  original: PostPreview;
};

export function HomeFullOriginalBody({ original }: HomeFullOriginalDialogBodyProps) {
  const authorName = original.author?.full_name || original.author?.username || 'Someone';
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={original.author?.avatar_url || undefined} />
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {initials(authorName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{authorName}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(original.created_at).toLocaleString()}
          </p>
        </div>
      </div>
      <p className="whitespace-pre-wrap break-words text-sm text-foreground">{original.content}</p>
    </div>
  );
}

export function HomeEmbeddedOpenHint({ label }: { label: string }) {
  return (
    <Button type="button" variant="link" className="h-auto p-0 text-xs">
      {label}
    </Button>
  );
}

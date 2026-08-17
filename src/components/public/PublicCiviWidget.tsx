import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Send, X } from 'lucide-react';

import { CiviAssistantHeading, CiviAvatar } from '@/components/ui/civi-avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import type { HistoryTurn } from '@/lib/assistant/types';
import { splitChatPageLinks } from '@/lib/chat-page-links';
import { askCiviPublic, sanitizeCiviPublicHistory } from '@/lib/civi-public';
import { splitAssistantMessageBlocks } from '@/lib/split-assistant-message';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'civizen.public-civi';
const SIZE_KEY = 'civizen.public-civi-size';
const DEFAULT_WIDTH = 352;
const DEFAULT_HEIGHT = 448;
const MIN_WIDTH = 280;
const MIN_HEIGHT = 320;
const VIEW_MARGIN = 24;

type ChatItem = HistoryTurn & { id: string };
type PanelSize = { width: number; height: number };
export type ResizeEdge = 'n' | 'w' | 'nw';

function clampSize(width: number, height: number): PanelSize {
  const maxW = typeof window === 'undefined' ? DEFAULT_WIDTH : Math.max(MIN_WIDTH, window.innerWidth - VIEW_MARGIN);
  const maxH = typeof window === 'undefined' ? DEFAULT_HEIGHT : Math.max(MIN_HEIGHT, window.innerHeight - VIEW_MARGIN);
  const nextW = Number.isFinite(width) ? width : DEFAULT_WIDTH;
  const nextH = Number.isFinite(height) ? height : DEFAULT_HEIGHT;
  return {
    width: Math.min(maxW, Math.max(MIN_WIDTH, Math.round(nextW))),
    height: Math.min(maxH, Math.max(MIN_HEIGHT, Math.round(nextH))),
  };
}

/** Top/left/corner drag: moving toward the outside enlarges the panel. */
export function panelSizeAfterEdgeDrag(
  start: PanelSize,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
  edge: ResizeEdge,
): PanelSize {
  const nextWidth = edge === 'n' ? start.width : start.width + (startX - clientX);
  const nextHeight = edge === 'w' ? start.height : start.height + (startY - clientY);
  return clampSize(nextWidth, nextHeight);
}

export function panelSizeAfterNwDrag(
  start: PanelSize,
  startX: number,
  startY: number,
  clientX: number,
  clientY: number,
): PanelSize {
  return panelSizeAfterEdgeDrag(start, startX, startY, clientX, clientY, 'nw');
}

/** Keep the last question + answer fully visible when they fit; otherwise pin the question at the top. */
export function scrollTopForLastExchange(pairTop: number, pairBottom: number, viewHeight: number): number {
  if (viewHeight <= 0) return 0;
  const height = pairBottom - pairTop;
  if (height <= viewHeight) return Math.max(0, pairBottom - viewHeight);
  return Math.max(0, pairTop);
}

function loadSize(): PanelSize {
  if (typeof window === 'undefined') return { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  try {
    const raw = window.localStorage.getItem(SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PanelSize>;
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return clampSize(parsed.width, parsed.height);
      }
    }
  } catch {
    /* ignore */
  }
  return clampSize(Math.min(window.innerWidth - VIEW_MARGIN, DEFAULT_WIDTH), Math.min(window.innerHeight * 0.7, DEFAULT_HEIGHT));
}

function persistSize(size: PanelSize) {
  try {
    window.localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch {
    /* ignore */
  }
}

function CiviLinkedText({ text, includeChoices = true }: { text: string; includeChoices?: boolean }) {
  return splitChatPageLinks(text, { includeChoices }).map((part, index) =>
    part.type === 'page' ? (
      <Link
        key={`${part.href}-${index}`}
        to={part.href}
        className={cn('text-primary underline underline-offset-2', part.value.includes(' / ') && 'whitespace-nowrap')}
      >
        {part.value}
      </Link>
    ) : (
      <span key={`text-${index}`}>{part.value}</span>
    ),
  );
}

function loadStored(): ChatItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row) => row && (row.role === 'user' || row.role === 'assistant') && typeof row.content === 'string')
      .map((row, index) => ({
        id: row.id || `stored-${index}`,
        role: row.role,
        content: row.content,
      }));
  } catch {
    return [];
  }
}

export function PublicCiviWidget() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>(loadStored);
  const [size, setSize] = useState<PanelSize>(loadSize);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragRef = useRef<{
    edge: ResizeEdge;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);
  const sizeRef = useRef(size);
  sizeRef.current = size;

  useEffect(() => {
    const onResize = () => setSize((current) => clampSize(current.width, current.height));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      event.preventDefault();
      setSize(
        panelSizeAfterEdgeDrag(
          { width: drag.startW, height: drag.startH },
          drag.startX,
          drag.startY,
          event.clientX,
          event.clientY,
          drag.edge,
        ),
      );
    };
    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const next = panelSizeAfterEdgeDrag(
        { width: drag.startW, height: drag.startH },
        drag.startX,
        drag.startY,
        event.clientX,
        event.clientY,
        drag.edge,
      );
      dragRef.current = null;
      setSize(next);
      persistSize(next);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-24)));
    } catch {
      /* ignore */
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    const node = listRef.current;
    const frame = window.requestAnimationFrame(() => {
      if (!node) return;
      const turns = [...node.querySelectorAll<HTMLElement>('[data-civi-turn]')];
      if (!turns.length) {
        node.scrollTop = 0;
        return;
      }
      let start = turns.length - 1;
      for (let index = turns.length - 1; index >= 0; index -= 1) {
        if (turns[index]?.dataset.civiRole === 'user') {
          start = index;
          break;
        }
      }
      const first = turns[start];
      const last = turns[start + 1] ?? first;
      if (!first || !last) return;
      node.scrollTop = scrollTopForLastExchange(
        first.offsetTop,
        last.offsetTop + last.offsetHeight,
        node.clientHeight,
      );
    });
    inputRef.current?.focus();
    return () => window.cancelAnimationFrame(frame);
  }, [open, messages, busy]);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const userItem: ChatItem = { id: `user-${Date.now()}`, role: 'user', content: text };
    const nextMessages = [...messages, userItem];
    setMessages(nextMessages);
    setDraft('');
    setBusy(true);
    try {
      const history = sanitizeCiviPublicHistory(nextMessages);
      const reply = await askCiviPublic(text, history.slice(0, -1));
      setMessages((prev) => [
        ...prev,
        {
          id: `civi-${Date.now()}`,
          role: 'assistant',
          content: reply || t('chatBar.private.civiPublic.failed'),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `civi-${Date.now()}`, role: 'assistant', content: t('chatBar.private.civiPublic.failed') },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onResizePointerDown = (edge: ResizeEdge) => (event: React.PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startW: sizeRef.current.width,
      startH: sizeRef.current.height,
    };
  };

  if (!open) {
    return (
      <div className="pointer-events-none fixed bottom-4 right-4 z-50">
        <button
          type="button"
          data-testid="public-civi-open"
          aria-label={t('chatBar.private.civiPublic.open')}
          className="pointer-events-auto rounded-full shadow-glow"
          onClick={() => setOpen(true)}
        >
          <CiviAvatar className="h-14 w-14" picker={false} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ width: size.width, height: size.height }}>
      <section
        data-testid="public-civi-panel"
        className="relative flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
      >
        <button
          type="button"
          data-testid="public-civi-resize-n"
          aria-label={t('chatBar.private.civiPublic.resizeHeight')}
          className="group/n absolute left-6 right-6 top-0 z-20 flex h-3 cursor-ns-resize touch-none items-start justify-center"
          onPointerDown={onResizePointerDown('n')}
        >
          <span className="mt-0.5 h-1.5 w-10 rounded-full bg-primary opacity-0 transition-opacity group-hover/n:opacity-80" aria-hidden />
        </button>
        <button
          type="button"
          data-testid="public-civi-resize-w"
          aria-label={t('chatBar.private.civiPublic.resizeWidth')}
          className="group/w absolute bottom-6 left-0 top-6 z-20 flex w-3 cursor-ew-resize touch-none items-center justify-start"
          onPointerDown={onResizePointerDown('w')}
        >
          <span className="ml-0.5 h-10 w-1.5 rounded-full bg-primary opacity-0 transition-opacity group-hover/w:opacity-80" aria-hidden />
        </button>
        <button
          type="button"
          data-testid="public-civi-resize"
          aria-label={t('chatBar.private.civiPublic.resize')}
          className="group/nw absolute left-0 top-0 z-30 flex h-5 w-5 cursor-nwse-resize touch-none items-start justify-start rounded-tl-2xl"
          onPointerDown={onResizePointerDown('nw')}
        >
          <span className="ml-1 mt-1 h-2.5 w-2.5 rounded-full bg-primary opacity-0 transition-opacity group-hover/nw:opacity-80" aria-hidden />
        </button>
        <header className="flex items-center gap-2 border-b border-border px-3 py-2">
          <CiviAvatar className="h-9 w-9" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              <CiviAssistantHeading />
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('chatBar.private.civiPublic.minimize')}
            onClick={() => setOpen(false)}
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t('chatBar.private.civiPublic.close')}
            onClick={() => {
              setOpen(false);
              setMessages([]);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div
          ref={listRef}
          data-testid="public-civi-thread"
          className="civi-thread-scroll min-h-0 flex-1 space-y-3 px-4 py-3 touch-pan-y"
          style={{ scrollbarWidth: 'none' }}
        >
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('chatBar.private.civiPublic.emptyHint')}</p>
          ) : (
            messages.map((item) => {
              const blocks = item.role === 'assistant' ? splitAssistantMessageBlocks(item.content) : null;
              return (
                <div
                  key={item.id}
                  data-civi-turn=""
                  data-civi-role={item.role}
                  className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    data-testid={item.role === 'user' ? 'civi-chat-bubble-user' : 'civi-chat-bubble-assistant'}
                    className={cn(
                      'civi-chat-bubble max-w-[85%] px-3 py-2 text-sm',
                      item.role === 'user'
                        ? 'civi-chat-bubble--user bg-primary text-primary-foreground'
                        : 'civi-chat-bubble--assistant bg-muted text-foreground',
                    )}
                  >
                    {blocks ? (
                      <>
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:break-word]">
                          <CiviLinkedText text={blocks.primary} />
                        </p>
                        {blocks.details.map((detail) => (
                          <p
                            key={detail.slice(0, 24)}
                            className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground"
                          >
                            <CiviLinkedText text={detail} includeChoices={false} />
                          </p>
                        ))}
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap break-words [overflow-wrap:break-word]">{item.content}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {busy ? <p className="text-xs text-muted-foreground">…</p> : null}
        </div>

        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            rows={1}
            placeholder={t('chatBar.private.civiPublic.placeholder')}
            aria-label={t('chatBar.private.civiPublic.placeholder')}
            className="min-h-10 max-h-24 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="rounded-full bg-primary p-2 text-primary-foreground disabled:opacity-50"
            aria-label={t('chatBar.private.civiPublic.send')}
            disabled={busy || !draft.trim()}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </div>
  );
}

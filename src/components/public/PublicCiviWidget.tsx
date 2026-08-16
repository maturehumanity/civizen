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

type ChatItem = HistoryTurn & { id: string };

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
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
    if (node) node.scrollTop = node.scrollHeight;
    inputRef.current?.focus();
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
    <div className="fixed bottom-4 right-4 z-50 w-[min(100vw-1.5rem,22rem)]">
      <section
        data-testid="public-civi-panel"
        className="flex h-[min(70vh,28rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
      >
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

        <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('chatBar.private.civiPublic.emptyHint')}</p>
          ) : (
            messages.map((item) => {
              const blocks = item.role === 'assistant' ? splitAssistantMessageBlocks(item.content) : null;
              return (
                <div key={item.id} className={cn('flex', item.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                      item.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
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

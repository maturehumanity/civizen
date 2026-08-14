import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Palette,
  Underline,
} from 'lucide-react';

import { useLanguage } from '@/contexts/LanguageContext';
import {
  agreementHtmlIsEmpty,
  looksLikeAgreementHtml,
  sanitizeAgreementHtml,
  textToAgreementHtml,
} from '@/lib/agreements-html';
import { cn } from '@/lib/utils';

type AgreementRichTextProps = {
  value: string;
  placeholder: string;
  ariaLabel: string;
  testId: string;
  autoFocus?: boolean;
  /** Inline continues in the sentence and wraps at words. Block is for a whole paragraph. */
  flow?: 'inline' | 'block';
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  onCancel?: () => void;
  invalid?: boolean;
};

type FormatMenuId = 'font' | 'color' | 'size' | 'list' | 'align';
type AlignCommand = 'justifyLeft' | 'justifyCenter' | 'justifyRight' | 'justifyFull';

const EDITOR_LIST_CLASS = '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:m-0';

const FONT_FAMILIES: { id: string; stack: string; label?: string; labelKey?: string }[] = [
  { id: 'inherit', labelKey: 'agreements.format.fontDefault', stack: 'inherit' },
  { id: 'Georgia', label: 'Georgia', stack: 'Georgia, serif' },
  { id: 'Times New Roman', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { id: 'Palatino', label: 'Palatino', stack: 'Palatino, "Palatino Linotype", serif' },
  { id: 'Garamond', label: 'Garamond', stack: 'Garamond, serif' },
  { id: 'Arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { id: 'Helvetica', label: 'Helvetica', stack: 'Helvetica, Arial, sans-serif' },
  { id: 'Calibri', label: 'Calibri', stack: 'Calibri, Candara, sans-serif' },
  { id: 'Verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { id: 'Trebuchet MS', label: 'Trebuchet MS', stack: '"Trebuchet MS", sans-serif' },
  { id: 'Tahoma', label: 'Tahoma', stack: 'Tahoma, Geneva, sans-serif' },
  { id: 'Courier New', label: 'Courier New', stack: '"Courier New", Courier, monospace' },
];

const FONT_SIZES = [
  { px: '12px', labelKey: 'agreements.format.size12' as const },
  { px: '14px', labelKey: 'agreements.format.size14' as const },
  { px: '16px', labelKey: 'agreements.format.size16' as const },
  { px: '18px', labelKey: 'agreements.format.size18' as const },
  { px: '24px', labelKey: 'agreements.format.size24' as const },
];

const TEXT_COLORS = ['#e8eaed', '#3dd6c6', '#f5c16c', '#f07178', '#7aa2f7'];

const ALIGN_OPTIONS: { command: AlignCommand; icon: typeof AlignLeft; labelKey: string }[] = [
  { command: 'justifyLeft', icon: AlignLeft, labelKey: 'agreements.format.alignLeft' },
  { command: 'justifyCenter', icon: AlignCenter, labelKey: 'agreements.format.alignCenter' },
  { command: 'justifyRight', icon: AlignRight, labelKey: 'agreements.format.alignRight' },
  { command: 'justifyFull', icon: AlignJustify, labelKey: 'agreements.format.alignJustify' },
];

function ToolButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={pressed}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs text-white/90 hover:bg-white/10',
        pressed ? 'bg-white/15' : '',
      )}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FormatFlyout({
  id,
  label,
  menu,
  setMenu,
  icon,
  panelClassName,
  children,
}: {
  id: FormatMenuId;
  label: string;
  menu: FormatMenuId | null;
  setMenu: (id: FormatMenuId | null) => void;
  icon: React.ReactNode;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const open = menu === id;
  return (
    <div
      className="relative"
      onMouseEnter={() => setMenu(id)}
      onMouseLeave={() => setMenu(null)}
    >
      <ToolButton label={label} pressed={open} onClick={() => setMenu(open ? null : id)}>
        {icon}
      </ToolButton>
      {open ? (
        <div className="absolute left-0 top-full z-40 pt-1">
          <div className={cn('min-w-[9.5rem] overflow-hidden rounded-xl bg-zinc-900 py-1 shadow-lg', panelClassName)}>
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  style,
  children,
}: {
  label: string;
  onClick: () => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] text-white/90 hover:bg-white/10"
      style={style}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function AgreementFormattedBody({
  html,
  className,
  empty,
}: {
  html: string;
  className?: string;
  empty?: string;
}) {
  if (agreementHtmlIsEmpty(html)) {
    return empty ? <p className={className}>{empty}</p> : null;
  }
  if (looksLikeAgreementHtml(html)) {
    return (
      <div
        className={cn(className, EDITOR_LIST_CLASS)}
        dangerouslySetInnerHTML={{ __html: sanitizeAgreementHtml(html) }}
      />
    );
  }
  return <p className={cn(className, 'whitespace-pre-wrap')}>{html}</p>;
}

export function AgreementRichText({
  value,
  placeholder,
  ariaLabel,
  testId,
  autoFocus,
  flow = 'block',
  onChange,
  onBlur,
  onCancel,
  invalid,
}: AgreementRichTextProps) {
  const { t } = useLanguage();
  const inline = flow === 'inline';
  const rootRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [align, setAlign] = useState<AlignCommand>('justifyLeft');
  const [focused, setFocused] = useState(false);
  const [menu, setMenu] = useState<FormatMenuId | null>(null);
  const empty = agreementHtmlIsEmpty(value);
  const [editorEmpty, setEditorEmpty] = useState(empty);
  const AlignIcon = ALIGN_OPTIONS.find((option) => option.command === align)?.icon || AlignLeft;

  const currentHtml = () => {
    const html = sanitizeAgreementHtml(editorRef.current?.innerHTML || '');
    return agreementHtmlIsEmpty(html) ? '' : html;
  };

  const emit = () => {
    const html = currentHtml();
    setEditorEmpty(!html);
    onChange(html);
  };

  const command = (name: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(name, false, commandValue);
    emit();
  };

  const closeMenu = () => setMenu(null);

  const applyFontName = (name: string) => {
    editorRef.current?.focus();
    document.execCommand('fontName', false, name);
    emit();
    closeMenu();
  };

  const applyFontSize = (px: string) => {
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '7');
    const editor = editorRef.current;
    if (editor) {
      editor.querySelectorAll('font[size="7"]').forEach((el) => {
        const span = document.createElement('span');
        span.style.fontSize = px;
        while (el.firstChild) span.appendChild(el.firstChild);
        el.replaceWith(span);
      });
      editor.querySelectorAll('span').forEach((el) => {
        const size = el.style.fontSize;
        if (size === 'xxx-large' || size === 'xx-large') el.style.fontSize = px;
      });
    }
    emit();
    closeMenu();
  };

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || focused) return;
    const next = empty ? '' : textToAgreementHtml(value);
    if (editor.innerHTML !== next) editor.innerHTML = next;
    setEditorEmpty(empty);
  }, [empty, focused, value]);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  return (
    <div
      ref={rootRef}
      data-agreement-token="true"
      className={cn('relative align-baseline', inline ? 'inline max-w-full' : 'w-full')}
    >
      {focused ? (
        <div
          role="toolbar"
          aria-label={t('agreements.format.toolbar')}
          className="absolute bottom-full left-0 z-30 mb-1 flex items-center gap-0.5 rounded-full bg-zinc-900 px-1.5 py-1 shadow-lg"
          onMouseDown={(event) => event.preventDefault()}
        >
          <FormatFlyout
            id="font"
            label={t('agreements.format.font')}
            menu={menu}
            setMenu={setMenu}
            panelClassName="max-h-64 overflow-y-auto"
            icon={<span className="text-[13px] font-semibold">A</span>}
          >
            {FONT_FAMILIES.map((font) => {
              const label = font.labelKey ? t(font.labelKey) : font.label || font.id;
              return (
                <MenuItem
                  key={font.id}
                  label={label}
                  style={font.id === 'inherit' ? undefined : { fontFamily: font.stack }}
                  onClick={() => applyFontName(font.id === 'inherit' ? 'sans-serif' : font.id)}
                >
                  {label}
                </MenuItem>
              );
            })}
          </FormatFlyout>
          <FormatFlyout
            id="color"
            label={t('agreements.format.color')}
            menu={menu}
            setMenu={setMenu}
            panelClassName="flex min-w-0 gap-1 px-2 py-1.5"
            icon={<Palette className="h-3.5 w-3.5" />}
          >
            {TEXT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={color}
                className="h-4 w-4 rounded-full border border-white/20"
                style={{ background: color }}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  command('foreColor', color);
                  closeMenu();
                }}
              />
            ))}
          </FormatFlyout>
          <FormatFlyout
            id="size"
            label={t('agreements.format.size')}
            menu={menu}
            setMenu={setMenu}
            icon={<span className="text-[11px] font-semibold tracking-tight">Tt</span>}
          >
            {FONT_SIZES.map((item) => (
              <MenuItem
                key={item.px}
                label={t(item.labelKey)}
                style={{ fontSize: item.px }}
                onClick={() => applyFontSize(item.px)}
              >
                {t(item.labelKey)}
              </MenuItem>
            ))}
          </FormatFlyout>
          <FormatFlyout
            id="list"
            label={t('agreements.format.list')}
            menu={menu}
            setMenu={setMenu}
            icon={<List className="h-3.5 w-3.5" />}
          >
            <MenuItem
              label={t('agreements.format.listBullets')}
              onClick={() => {
                command('insertUnorderedList');
                closeMenu();
              }}
            >
              <List className="h-3.5 w-3.5 shrink-0" />
              {t('agreements.format.listBullets')}
            </MenuItem>
            <MenuItem
              label={t('agreements.format.listNumbers')}
              onClick={() => {
                command('insertOrderedList');
                closeMenu();
              }}
            >
              <ListOrdered className="h-3.5 w-3.5 shrink-0" />
              {t('agreements.format.listNumbers')}
            </MenuItem>
          </FormatFlyout>
          <ToolButton label={t('agreements.format.bold')} onClick={() => command('bold')}>
            <Bold className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton label={t('agreements.format.italic')} onClick={() => command('italic')}>
            <Italic className="h-3.5 w-3.5" />
          </ToolButton>
          <ToolButton label={t('agreements.format.underline')} onClick={() => command('underline')}>
            <Underline className="h-3.5 w-3.5" />
          </ToolButton>
          <FormatFlyout
            id="align"
            label={t('agreements.format.align')}
            menu={menu}
            setMenu={setMenu}
            icon={<AlignIcon className="h-3.5 w-3.5" />}
          >
            {ALIGN_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <MenuItem
                  key={option.command}
                  label={t(option.labelKey)}
                  onClick={() => {
                    setAlign(option.command);
                    command(option.command);
                    closeMenu();
                  }}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t(option.labelKey)}
                </MenuItem>
              );
            })}
          </FormatFlyout>
        </div>
      ) : null}
      <div
        ref={editorRef}
        role="textbox"
        tabIndex={0}
        aria-multiline="true"
        aria-label={ariaLabel}
        aria-placeholder={placeholder}
        aria-invalid={invalid || undefined}
        data-placeholder={placeholder}
        data-agreement-missing={invalid || undefined}
        data-testid={testId}
        contentEditable
        suppressContentEditableWarning
        className={cn(
          'bg-transparent leading-[1.55] text-foreground outline-none',
          EDITOR_LIST_CLASS,
          inline
            ? 'inline max-w-full whitespace-pre-wrap align-baseline [overflow-wrap:break-word]'
            : 'block min-h-[1.5em] w-full overflow-hidden',
          editorEmpty && 'text-primary before:pointer-events-none before:text-primary before:content-[attr(data-placeholder)]',
          focused ? 'border-b border-dashed border-foreground/40' : 'border-b border-transparent',
          invalid && 'rounded-sm ring-2 ring-destructive/70',
        )}
        onFocus={() => setFocused(true)}
        onClick={() => editorRef.current?.focus()}
        onInput={emit}
        onBlur={(event) => {
          if (rootRef.current?.contains(event.relatedTarget as Node)) return;
          setFocused(false);
          setMenu(null);
          const html = currentHtml();
          setEditorEmpty(!html);
          onChange(html);
          onBlur?.(html);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel?.();
            editorRef.current?.blur();
          }
        }}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, text);
          emit();
        }}
      />
    </div>
  );
}

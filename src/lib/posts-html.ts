import {
  escapePlainTextAsHtml,
  htmlToPlainText,
  sanitizeUserHtml,
} from '@/lib/sanitize-user-html';

/** Restrained social-post markup: emphasis, lists, and line spacing. */
export const POST_HTML_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN']);

const FORMATTING_TAG = /<\/?(?:b|i|u|strong|em|ul|ol|li)\b/i;
const POST_MARKUP_TAG = /<\/?(?:b|i|u|strong|em|ul|ol|li|br|div|p|span)\b/i;
const POST_SPACING_STYLE = /line-height\s*:/i;

/** Safe post styles: a few line-height presets only. */
export const POST_ALLOWED_STYLE = /^line-height\s*:\s*(?:1(?:\.25|\.5|\.6)?|2)$/i;

export const POST_SPACING_PRESETS = {
  tight: '1.25',
  default: '1.6',
  loose: '2',
} as const;

export type PostSpacingPreset = keyof typeof POST_SPACING_PRESETS;

export const POST_LIST_CLASS =
  'leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_div]:mb-1.5 [&_div:last-child]:mb-0';

export function sanitizePostHtml(html: string): string {
  return sanitizeUserHtml(html, {
    allowedTags: POST_HTML_TAGS,
    allowedStyleProps: POST_ALLOWED_STYLE,
  });
}

export function looksLikePostHtml(value: string): boolean {
  return POST_MARKUP_TAG.test(value);
}

export function postHtmlToPlainText(value: string): string {
  return htmlToPlainText(value);
}

export function postHtmlIsEmpty(html: string): boolean {
  return !postHtmlToPlainText(html).trim();
}

export function textToPostHtml(value: string): string {
  if (!value) return '';
  if (looksLikePostHtml(value)) return sanitizePostHtml(value);
  return escapePlainTextAsHtml(value);
}

export function postHasSupportedFormatting(html: string): boolean {
  return FORMATTING_TAG.test(html) || POST_SPACING_STYLE.test(html);
}

export function applyPostSpacing(editor: HTMLElement | null, preset: PostSpacingPreset): void {
  if (!editor) return;
  editor.focus();
  const lineHeight = POST_SPACING_PRESETS[preset];
  const first = editor.firstElementChild;
  const reuseWrapper =
    editor.childElementCount === 1 &&
    first instanceof HTMLElement &&
    first.tagName === 'DIV' &&
    Boolean(first.style.lineHeight || first.getAttribute('style')?.includes('line-height'));

  const wrap = reuseWrapper ? first : document.createElement('div');
  wrap.setAttribute('style', `line-height: ${lineHeight}`);
  if (!reuseWrapper) {
    while (editor.firstChild) wrap.appendChild(editor.firstChild);
    editor.appendChild(wrap);
  }
}

/**
 * Persist formatted HTML when the author used supported controls.
 * Unformatted posts stay plain text so historical rows keep rendering as-is.
 */
export function serializePostContent(html: string): string {
  const sanitized = sanitizePostHtml(html);
  if (postHtmlIsEmpty(sanitized)) return '';
  if (!postHasSupportedFormatting(sanitized)) {
    return postHtmlToPlainText(sanitized);
  }
  return sanitized;
}

export function postContentForEditor(value: string): string {
  if (!value) return '';
  if (looksLikePostHtml(value)) return sanitizePostHtml(value);
  return escapePlainTextAsHtml(value);
}

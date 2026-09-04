import {
  escapePlainTextAsHtml,
  htmlToPlainText,
  sanitizeUserHtml,
} from '@/lib/sanitize-user-html';

const ALLOWED_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN', 'FONT']);

export function agreementHtmlToPlainText(value: string): string {
  return htmlToPlainText(value);
}

export function looksLikeAgreementHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function textToAgreementHtml(value: string): string {
  if (!value) return '';
  if (looksLikeAgreementHtml(value)) return sanitizeAgreementHtml(value);
  return escapePlainTextAsHtml(value);
}

export function sanitizeAgreementHtml(html: string): string {
  return sanitizeUserHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedStyleProps: /^(color|font-size|font-family|text-align)\s*:/i,
    extraAllowedAttributes: (tagName, attrName) => {
      if (tagName !== 'FONT') return false;
      return attrName === 'color' || attrName === 'size' || attrName === 'face';
    },
  });
}

export function agreementHtmlIsEmpty(html: string): boolean {
  return !agreementHtmlToPlainText(html).trim();
}

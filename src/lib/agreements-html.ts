const ALLOWED_TAGS = new Set(['B', 'I', 'U', 'STRONG', 'EM', 'UL', 'OL', 'LI', 'BR', 'DIV', 'P', 'SPAN', 'FONT']);

export function agreementHtmlToPlainText(value: string): string {
  if (!value) return '';
  if (!/<[a-z][\s\S]*>/i.test(value)) return value;
  const documentRef = new DOMParser().parseFromString(value, 'text/html');
  documentRef.querySelectorAll('li').forEach((item) => {
    item.prepend(documentRef.createTextNode('• '));
    item.append(documentRef.createTextNode('\n'));
  });
  documentRef.querySelectorAll('br, p, div').forEach((item) => {
    if (item.tagName === 'BR') item.replaceWith('\n');
    else item.append(documentRef.createTextNode('\n'));
  });
  return (documentRef.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

export function looksLikeAgreementHtml(value: string): boolean {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function textToAgreementHtml(value: string): string {
  if (!value) return '';
  if (looksLikeAgreementHtml(value)) return sanitizeAgreementHtml(value);
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export function sanitizeAgreementHtml(html: string): string {
  if (!html) return '';
  const documentRef = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as HTMLElement;
        if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
          element.remove();
          continue;
        }
        if (!ALLOWED_TAGS.has(element.tagName)) {
          const text = documentRef.createTextNode(element.textContent || '');
          element.replaceWith(text);
          continue;
        }
        for (const attr of Array.from(element.attributes)) {
          const name = attr.name.toLowerCase();
          if (name === 'style') {
            const style = element.getAttribute('style') || '';
            const safe = style
              .split(';')
              .map((part) => part.trim())
              .filter((part) => /^(color|font-size|font-family|text-align)\s*:/i.test(part))
              .join('; ');
            if (safe) element.setAttribute('style', safe);
            else element.removeAttribute('style');
          } else if (name === 'color' && element.tagName === 'FONT') {
            continue;
          } else if (name === 'size' && element.tagName === 'FONT') {
            continue;
          } else if (name === 'face' && element.tagName === 'FONT') {
            continue;
          } else {
            element.removeAttribute(attr.name);
          }
        }
        walk(element);
      }
    }
  };
  walk(documentRef.body);
  return documentRef.body.innerHTML;
}

export function agreementHtmlIsEmpty(html: string): boolean {
  return !agreementHtmlToPlainText(html).trim();
}

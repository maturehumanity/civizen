export type SanitizeUserHtmlOptions = {
  allowedTags: ReadonlySet<string>;
  /** When set, only matching CSS declarations are kept on `style`. Otherwise `style` is stripped. */
  allowedStyleProps?: RegExp;
  extraAllowedAttributes?: (tagName: string, attrName: string) => boolean;
};

const UNSAFE_URL = /^(?:\s*(?:javascript|vbscript|data):)/i;

function isUnsafeUrl(value: string): boolean {
  return UNSAFE_URL.test(value.trim());
}

/**
 * Shared HTML sanitizer used by Agreements and Posts.
 * Drops scripts/styles, event handlers, and disallowed tags/attributes.
 * Remaining text of unknown tags is kept; script/style nodes are removed entirely.
 */
export function sanitizeUserHtml(html: string, options: SanitizeUserHtmlOptions): string {
  if (!html) return '';
  const documentRef = new DOMParser().parseFromString(html, 'text/html');
  const walk = (node: Node) => {
    const children = Array.from(node.childNodes);
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const element = child as HTMLElement;
      if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
        element.remove();
        continue;
      }
      if (!options.allowedTags.has(element.tagName)) {
        const text = documentRef.createTextNode(element.textContent || '');
        element.replaceWith(text);
        continue;
      }
      for (const attr of Array.from(element.attributes)) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on') || name === 'srcdoc') {
          element.removeAttribute(attr.name);
          continue;
        }
        if (name === 'href' || name === 'src' || name === 'xlink:href') {
          if (isUnsafeUrl(attr.value) || !options.extraAllowedAttributes?.(element.tagName, name)) {
            element.removeAttribute(attr.name);
          }
          continue;
        }
        if (name === 'style') {
          if (!options.allowedStyleProps) {
            element.removeAttribute('style');
            continue;
          }
          const style = element.getAttribute('style') || '';
          const safe = style
            .split(';')
            .map((part) => part.trim())
            .filter((part) => options.allowedStyleProps!.test(part) && !isUnsafeUrl(part))
            .join('; ');
          if (safe) element.setAttribute('style', safe);
          else element.removeAttribute('style');
          continue;
        }
        if (options.extraAllowedAttributes?.(element.tagName, name)) continue;
        element.removeAttribute(attr.name);
      }
      walk(element);
    }
  };
  walk(documentRef.body);
  return documentRef.body.innerHTML;
}

export function htmlToPlainText(value: string): string {
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

export function escapePlainTextAsHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

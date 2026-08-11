/**
 * Empty contentEditable + floated avatar leaves most of the visual field as
 * non-editor chrome (padding, avatar, placeholder overlay). Clicks there miss
 * the short editor box, so the composer appears dead. Focus from chrome on
 * pointerdown; leave native caret placement when the editor itself is hit.
 */
export function focusHomePostComposerFromChrome(
  event: { target: EventTarget | null; preventDefault: () => void },
  editor: HTMLElement | null,
  options?: { disabled?: boolean },
): boolean {
  if (options?.disabled || !editor) return false;
  const target = event.target;
  if (!(target instanceof Node)) return false;
  if (target === editor || editor.contains(target)) return false;
  event.preventDefault();
  editor.focus();
  return true;
}

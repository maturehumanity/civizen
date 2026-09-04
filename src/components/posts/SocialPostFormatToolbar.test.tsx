import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SocialPostFormatToolbar } from '@/components/posts/SocialPostFormatToolbar';

vi.mock('@/contexts/LanguageContext', async () => {
  const { baseTranslations, translateMessage } = await import('@/lib/i18n');
  return {
    useLanguage: () => ({
      language: 'en',
      t: (key: string, vars?: Record<string, string | number>) =>
        translateMessage(baseTranslations, key, vars),
    }),
  };
});

describe('SocialPostFormatToolbar', () => {
  it('exposes the restrained social controls and not Agreement document controls', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    document.body.append(editor);

    render(<SocialPostFormatToolbar editorRef={{ current: editor }} />);

    expect(screen.getByRole('toolbar', { name: 'Text formatting' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bold' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Bulleted list' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Line spacing' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Font' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Text color' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Text size' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Align text' })).toBeNull();
  });

  it('applies a line-spacing preset to the editor', () => {
    const editor = document.createElement('div');
    editor.contentEditable = 'true';
    editor.innerHTML = 'Line one<br>Line two';
    document.body.append(editor);

    render(<SocialPostFormatToolbar editorRef={{ current: editor }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Line spacing' }));
    fireEvent.click(screen.getByRole('button', { name: 'Relaxed' }));

    expect(editor.firstElementChild?.getAttribute('style')).toBe('line-height: 2');
  });
});

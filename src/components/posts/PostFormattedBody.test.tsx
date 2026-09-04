import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PostFormattedBody } from '@/components/posts/PostFormattedBody';

describe('PostFormattedBody', () => {
  it('renders legacy plain text without interpreting tags as markup', () => {
    const { container } = render(
      <PostFormattedBody content={'Use less than 3 tools.\nKeep it plain.'} />,
    );
    expect(container.textContent).toContain('Use less than 3 tools.');
    expect(container.textContent).toContain('Keep it plain.');
    expect(container.querySelector('b')).toBeNull();
  });

  it('renders supported formatting after sanitizing', () => {
    const { container } = render(
      <PostFormattedBody content={'<b>Bold</b> and <script>alert(1)</script><i>italic</i>'} />,
    );
    expect(container.querySelector('b')?.textContent).toBe('Bold');
    expect(container.querySelector('i')?.textContent).toBe('italic');
    expect(container.innerHTML).not.toContain('script');
    expect(container.innerHTML).not.toContain('alert');
  });

  it('keeps restrained line spacing on formatted posts', () => {
    const { container } = render(
      <PostFormattedBody content={'<div style="line-height: 2">Spaced line</div>'} />,
    );
    expect(container.querySelector('div[style]')?.getAttribute('style')).toContain('line-height: 2');
    expect(container.textContent).toContain('Spaced line');
  });
});

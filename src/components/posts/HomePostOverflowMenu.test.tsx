import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { HomePostOverflowMenu } from '@/components/posts/HomePostOverflowMenu';

describe('HomePostOverflowMenu', () => {
  it('exposes Edit post only when the viewer is eligible', () => {
    render(
      <HomePostOverflowMenu
        moreLabel="Post actions"
        editLabel="Edit post"
        deleteLabel="Delete post"
        canEdit
        canDelete
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );

    const trigger = screen.getByTestId('home-post-overflow');
    expect(trigger).toHaveAttribute('data-post-can-edit', 'true');
    expect(trigger).toHaveAttribute('data-post-can-delete', 'true');
    expect(trigger).toHaveAttribute('aria-label', 'Post actions');
    expect(trigger).toHaveAttribute('title', 'Post actions');
  });

  it('hides Edit post when the viewer is not allowed to edit', () => {
    render(
      <HomePostOverflowMenu
        moreLabel="Post actions"
        editLabel="Edit post"
        deleteLabel="Delete post"
        canEdit={false}
        canDelete
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );

    const trigger = screen.getByTestId('home-post-overflow');
    expect(trigger).toHaveAttribute('data-post-can-edit', 'false');
    expect(trigger).toHaveAttribute('data-post-can-delete', 'true');
  });

  it('renders nothing when the viewer cannot edit or delete', () => {
    const { container } = render(
      <HomePostOverflowMenu
        moreLabel="Post actions"
        editLabel="Edit post"
        deleteLabel="Delete post"
        canEdit={false}
        canDelete={false}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

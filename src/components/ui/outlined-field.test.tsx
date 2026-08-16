import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Input } from '@/components/ui/input';
import { OutlinedField } from '@/components/ui/outlined-field';

describe('OutlinedField', () => {
  it('places the label on the field border via legend', () => {
    render(
      <OutlinedField label="Full name" htmlFor="outlined-name">
        <Input id="outlined-name" defaultValue="Armen Yeremyan" />
      </OutlinedField>,
    );

    const field = screen.getByRole('group');
    const legend = field.querySelector('legend');
    expect(legend).toHaveTextContent('Full name');
    expect(legend).toBeVisible();
    expect(screen.getByLabelText('Full name')).toHaveValue('Armen Yeremyan');
  });
});

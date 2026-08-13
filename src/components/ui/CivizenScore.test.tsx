import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CivizenScore } from '@/components/ui/CivizenScore';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => (key === 'home.yourCivizenScore' ? 'Your Civizen Score' : key) }),
}));

describe('CivizenScore ring presentation', () => {
  it('shows a dash when there is no score', () => {
    render(<CivizenScore score={null} emptyLabel="—" showLabel={false} animate={false} />);
    expect(screen.getByText('—')).toBeTruthy();
  });

  it('shows an established percent without an Estimate caption', () => {
    render(
      <CivizenScore
        score={62.1}
        presentation="established"
        showLabel={false}
        animate={false}
      />,
    );
    expect(screen.getByText('62%')).toBeTruthy();
    expect(screen.queryByText('Estimate')).toBeNull();
  });

  it('shows a provisional estimate with an Estimate caption', () => {
    render(
      <CivizenScore
        score={49.8}
        presentation="provisional"
        centerCaption="Estimate"
        showLabel={false}
        animate={false}
      />,
    );
    expect(screen.getByText('49.8')).toBeTruthy();
    expect(screen.getByText('Estimate')).toBeTruthy();
    expect(screen.queryByText('—')).toBeNull();
  });
});

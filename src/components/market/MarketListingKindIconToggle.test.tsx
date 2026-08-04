import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MarketListingKindIconToggle } from '@/components/market/MarketListingKindIconToggle';

describe('MarketListingKindIconToggle', () => {
  it('uses Package for products and Handshake for services with accessible names', () => {
    const onChange = vi.fn();
    render(
      <MarketListingKindIconToggle
        value="product"
        onChange={onChange}
        productsLabel="Products"
        servicesLabel="Services"
        groupLabel="Listing type"
      />,
    );

    expect(screen.getByTestId('market-listing-kind-products')).toHaveAttribute('aria-label', 'Products');
    expect(screen.getByTestId('market-listing-kind-services')).toHaveAttribute('aria-label', 'Services');
    expect(screen.getByTestId('market-listing-kind-products').querySelector('svg')).toBeTruthy();
    expect(screen.getByTestId('market-listing-kind-services').querySelector('.lucide-handshake')).toBeTruthy();

    fireEvent.click(screen.getByTestId('market-listing-kind-services'));
    expect(onChange).toHaveBeenCalledWith('service');
  });
});

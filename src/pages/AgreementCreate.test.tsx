import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { baseTranslations, translateMessage } from '@/lib/i18n';
import AgreementCreate from '@/pages/AgreementCreate';

vi.mock('@/components/layout/AppLayout', () => ({
  AppLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, vars?: Record<string, string | number>) => translateMessage(baseTranslations, key, vars),
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: { id: 'user-1', full_name: 'Alex Rivera', username: 'alex' },
  }),
}));

vi.mock('@/lib/agreements-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/agreements-api')>('@/lib/agreements-api');
  return {
    ...actual,
    searchAgreementParties: async () => [],
    createCollaborationAgreement: async () => 'agr-1',
    peekNextAgreementNumber: async () => ({ year: 2026, sequence: 1, referenceCode: 'AGR-2026-0001' }),
  };
});

describe('AgreementCreate', () => {
  it('prefills related activity and parties inside the agreement document', () => {
    render(
      <MemoryRouter
        initialEntries={['/agreements/new?from=opportunity&relatedId=opp-1&relatedTitle=Campus%20pilot&partyName=Cedar%20River%20University']}
      >
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('on');
    expect(screen.getByLabelText('Agreement number')).toHaveValue('1');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Service(s) Provision');
    expect(screen.getAllByText('Campus pilot').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Campus pilot')).toBeTruthy();
    expect(screen.getByDisplayValue('Cedar River University')).toBeTruthy();
    expect(screen.getByDisplayValue('Alex Rivera')).toBeTruthy();
    const partyInput = screen.getByDisplayValue('Alex Rivera');
    expect(partyInput.getAttribute('size')).toBe('1');
    expect(partyInput.previousElementSibling?.textContent).toBe('Alex Rivera');
    expect(screen.getByTestId('agreement-document')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Client role' })).toHaveTextContent('Client');
    expect(screen.getByRole('button', { name: 'Service Provider role' })).toHaveTextContent('Service Provider');
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Other party')).not.toBeInTheDocument();
    expect(screen.queryByText('Is this a person or an organization?')).not.toBeInTheDocument();
  });

  it('opens a Pilot agreement template without asking for the type again', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=pilot']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Pilot / Collaboration');
    expect(screen.getByText(/This agreement is entered into between/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create agreement' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-add-evaluation'));
    expect(screen.getByLabelText('How the pilot will be evaluated')).toBeInTheDocument();
  });

  it('opens Employment as a document template with progressive sections', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=employment']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Employment');
    expect(screen.getByTestId('agreement-document')).toHaveTextContent('This agreement is entered into between');
    expect(screen.getByLabelText('Search or enter employer')).toHaveAttribute('placeholder', 'Employer');
    expect(screen.getByLabelText('Search or enter employee')).toHaveAttribute('placeholder', 'Employee');
    expect(screen.getByLabelText('Position title')).toHaveAttribute('placeholder', 'position');
    expect(screen.queryByPlaceholderText('Search or enter person or organization')).not.toBeInTheDocument();
    expect(screen.queryByText('Add compensation details')).toBeInTheDocument();
    expect(screen.queryByText('+ Add compensation details')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Compensation')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-add-compensation'));
    expect(screen.getByLabelText('Compensation')).toBeInTheDocument();
    expect(screen.getByText(/not legal advice/i)).toBeInTheDocument();
    expect(screen.getByText('Add terms')).toBeInTheDocument();
  });

  it('opens a Sale / Purchase document with known listing facts already filled', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=sale_purchase&from=market_listing&relatedTitle=Lab%20microscope&partyName=Cedar%20River%20University&product=Lab%20microscope&quantity=2&unitPrice=400&currency=USD']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Sale / Purchase');
    expect(screen.getByTestId('agreement-document')).toHaveTextContent('The Seller agrees to sell, and the Buyer agrees to purchase');
    expect(screen.getByDisplayValue('Lab microscope')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2')).toBeInTheDocument();
    expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    expect(screen.queryByLabelText('Payment terms')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('agreements-add-payment'));
    expect(screen.getByLabelText('Payment terms')).toBeInTheDocument();
  });

  it('opens a flexible custom agreement for an unsupported type name', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=custom&customType=Distribution%20Agreement']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Distribution Agreement');
    expect(screen.getByText(/This agreement is entered into between/)).toBeInTheDocument();
    expect(screen.getByTestId('agreements-add-custom-section')).toBeInTheDocument();
  });

  it('prefills Employment from a Job launch', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=employment&from=job&relatedTitle=Baker&position=Baker&workLocation=Bakersfield%2C%20CA&employmentSelfRole=employee']}>
        <AgreementCreate />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Employment');
    expect(screen.getByDisplayValue('Baker')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bakersfield, CA')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alex Rivera')).toBeInTheDocument();
    expect(screen.getAllByText('Baker').length).toBeGreaterThan(0);
  });

  it('uses Agreement # across types and names each party role in the sentence', () => {
    const cases: Array<{ type: string; heading: string }> = [
      { type: 'general', heading: 'General' },
      { type: 'partnership', heading: 'Partnership / Collaboration' },
      { type: 'funding', heading: 'Funding / Sponsorship' },
      { type: 'nda', heading: 'Confidentiality / NDA' },
      { type: 'lease', heading: 'Lease' },
    ];
    for (const item of cases) {
      const view = render(
        <MemoryRouter initialEntries={[`/agreements/new?type=${item.type}`]}>
          <AgreementCreate />
        </MemoryRouter>,
      );
      expect(screen.getByTestId('app-page-header-title')).toHaveTextContent('Agreement #');
      expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent(item.heading);
      expect(screen.getByTestId('agreement-document').textContent).toMatch(/is entered into between/);
      expect(screen.getByTestId('agreement-document').textContent).toMatch(/\(the /);
      expect(screen.getByTestId('agreement-document').textContent).not.toMatch(/\n\s*and\s*\n/);
      view.unmount();
    }
  });

  it('lets the Service heading switch to Contribution(s) from the hover menu', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    const heading = screen.getByRole('button', { name: 'Agreement type' });
    fireEvent.mouseEnter(heading.parentElement!);
    expect(screen.queryByRole('option', { name: 'Service(s) Provision' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Contribution(s)' }));
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Contribution(s)');
    expect(screen.getByRole('button', { name: 'Recipient role' })).toHaveTextContent('Recipient');
    expect(screen.getByRole('button', { name: 'Contributor role' })).toHaveTextContent('Contributor');
  });

  it('renames the heading on click instead of opening a Rename row', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Agreement type' }));
    expect(screen.getByTestId('agreement-choice-rename')).toHaveValue('Service(s) Provision');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rename' })).not.toBeInTheDocument();
  });

  it('opens a Lease document with Car and other lease kinds available', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=lease']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Lease');
    expect(screen.getByRole('button', { name: 'Landlord role' })).toHaveTextContent('Landlord');
    expect(screen.getByRole('button', { name: 'Tenant role' })).toHaveTextContent('Tenant');
    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Agreement type' }).parentElement!);
    expect(screen.queryByRole('option', { name: 'Lease' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Car lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Residential lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Commercial lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Vehicle lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Equipment lease' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Office lease' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Car lease' }));
    expect(screen.getByRole('button', { name: 'Agreement type' })).toHaveTextContent('Car lease');
    expect(screen.getByRole('button', { name: 'Lessor role' })).toHaveTextContent('Lessor');
    expect(screen.getByRole('button', { name: 'Lessee role' })).toHaveTextContent('Lessee');
  });

  it('lets an open-ended term replace an end date', () => {
    render(
      <MemoryRouter initialEntries={['/agreements/new?type=service_contribution']}>
        <AgreementCreate />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('end date')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Until completed' }));
    expect(screen.getByTestId('agreement-token-endAt')).toHaveTextContent('completed');
    expect(screen.queryByLabelText('end date')).not.toBeInTheDocument();
  });
});

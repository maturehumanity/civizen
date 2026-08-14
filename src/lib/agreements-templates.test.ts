import { describe, expect, it } from 'vitest';

import {
  agreementDocumentTemplate,
  applyDocumentHeading,
  compileAgreementDocument,
  seedAgreementDocumentState,
} from '@/lib/agreements-templates';

describe('agreement document templates', () => {
  it('gives Employment a distinct template from Service / Contribution', () => {
    const employment = agreementDocumentTemplate('employment');
    const service = agreementDocumentTemplate('service_contribution');
    expect(employment.documentHeading).toBe('Employment');
    expect(service.documentHeading).toBe('Service(s) Provision');
    const employmentText = employment.essential.flatMap((section) => section.paragraphs.flatMap((paragraph) => paragraph.runs.filter((run) => typeof run === 'string'))).join(' ');
    const serviceText = service.essential.flatMap((section) => section.paragraphs.flatMap((paragraph) => paragraph.runs.filter((run) => typeof run === 'string'))).join(' ');
    expect(employmentText).toContain('This agreement is entered into between');
    expect(employmentText).toContain('position');
    expect(serviceText).toContain('does not establish employment');
    expect(serviceText).not.toContain('Employer');
  });

  it('switches Service(s) Provision to Contribution(s) and updates default party roles', () => {
    const template = agreementDocumentTemplate('service_contribution');
    const state = seedAgreementDocumentState({
      type: 'service_contribution',
      launch: { agreementType: 'service_contribution' },
      actor: { fullName: 'Alex Rivera', profileId: 'user-1' },
    });
    expect(state.documentHeading).toBe('Service(s) Provision');
    expect(state.partyRoles).toMatchObject({ party_a: 'Client', party_b: 'Service Provider' });
    const next = applyDocumentHeading(template, state, 'Contribution(s)', 'contribution');
    expect(next.documentHeading).toBe('Contribution(s)');
    expect(next.partyRoles).toMatchObject({ party_a: 'Recipient', party_b: 'Contributor' });
  });

  it('offers several Lease kinds including Car, not only Equipment', () => {
    const template = agreementDocumentTemplate('lease');
    expect(template.documentHeading).toBe('Lease');
    expect(template.headingOptions.map((item) => item.label)).toEqual([
      'Lease',
      'Residential lease',
      'Commercial lease',
      'Car lease',
      'Vehicle lease',
      'Equipment lease',
      'Office lease',
      'Property rental',
    ]);
    const state = seedAgreementDocumentState({
      type: 'lease',
      launch: { agreementType: 'lease' },
      actor: { fullName: 'Alex Rivera', profileId: 'user-1' },
    });
    expect(state.partyRoles).toMatchObject({ lessor: 'Landlord', lessee: 'Tenant' });
    const car = applyDocumentHeading(template, state, 'Car lease', 'car');
    expect(car.documentHeading).toBe('Car lease');
    expect(car.partyRoles).toMatchObject({ lessor: 'Lessor', lessee: 'Lessee' });
  });

  it('uses short in-sentence party placeholders', () => {
    const employment = agreementDocumentTemplate('employment');
    const general = agreementDocumentTemplate('general');
    const tokens = [...employment.essential, ...general.essential]
      .flatMap((section) => section.paragraphs.flatMap((paragraph) => paragraph.runs))
      .filter((run): run is Exclude<typeof run, string> => typeof run !== 'string');
    expect(tokens.find((run) => run.id === 'employer')?.placeholder).toBe('Employer');
    expect(tokens.find((run) => run.id === 'employee')?.placeholder).toBe('Employee');
    expect(tokens.find((run) => run.id === 'party_a')?.placeholder).toBe('Party');
    expect(tokens.find((run) => run.id === 'position')?.placeholder).toBe('position');
  });

  it('stores custom type names on the agreement without using a specialized template', () => {
    const template = agreementDocumentTemplate('custom', 'Distribution Agreement');
    expect(template.documentHeading).toBe('Distribution Agreement');
    expect(template.allowCustomSections).toBe(true);
    const opening = template.essential[0]?.paragraphs[0]?.runs[0];
    expect(opening).toBe('This agreement is entered into between ');
  });

  it('compiles inline employment values into structured data', () => {
    const template = agreementDocumentTemplate('employment');
    const state = seedAgreementDocumentState({
      type: 'employment',
      launch: {
        source: 'job',
        agreementType: 'employment',
        position: 'Baker',
        workLocation: 'Bakersfield, CA',
        partyName: 'Jordan Lee',
        employmentSelfRole: 'employer',
      },
      actor: { fullName: 'Alex Rivera', profileId: 'user-1' },
    });
    expect(state.values.position).toBe('Baker');
    expect(state.parties.employer.query).toBe('Alex Rivera');
    expect(state.parties.employee.query).toBe('Jordan Lee');
    const compiled = compileAgreementDocument({
      type: 'employment',
      template,
      state,
      typeLabel: 'Employment Agreement',
    });
    expect(compiled.title).toContain('Baker');
    expect(compiled.content.structured?.employment?.position).toBe('Baker');
    expect(compiled.content.structured?.employment?.employer).toBe('Alex Rivera');
    expect(compiled.content.structured?.employment?.employee).toBe('Jordan Lee');
  });

  it('stores an open-ended term as until completed without an end date', () => {
    const template = agreementDocumentTemplate('service_contribution');
    const state = seedAgreementDocumentState({
      type: 'service_contribution',
      launch: { agreementType: 'service_contribution' },
      actor: { fullName: 'Alex Rivera', profileId: 'user-1' },
    });
    state.values.endOpen = 'until_completed';
    state.values.startAt = '2026-09-01';
    const compiled = compileAgreementDocument({
      type: 'service_contribution',
      template,
      state,
      typeLabel: 'Service / Contribution Agreement',
    });
    expect(compiled.endAt).toBeNull();
    expect(compiled.content.structured?.endAt).toBeNull();
    expect(compiled.content.sections.some((section) => section.body.includes('until completed'))).toBe(true);
  });
});

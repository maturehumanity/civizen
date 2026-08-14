import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { AgreementChoiceWord } from '@/components/agreements/AgreementChoiceWord';
import { AgreementInlineToken } from '@/components/agreements/AgreementInlineToken';
import { AgreementPartyToken } from '@/components/agreements/AgreementPartyToken';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  applyDocumentHeading,
  unusedOptionalSections,
  visibleTemplateSections,
  type AgreementDocumentState,
  type AgreementDocumentTemplate,
  type AgreementTemplateRun,
} from '@/lib/agreements-templates';
import type { PartyPersonOrOrg, SelectedAgreementParty } from '@/lib/agreements-model';

type AgreementDocumentEditorProps = {
  template: AgreementDocumentTemplate;
  state: AgreementDocumentState;
  excludeProfileId?: string | null;
  onChange: (state: AgreementDocumentState) => void;
};

const PUNCTUATION_ONLY = /^[.,;:]+$/;

function translatedOrFallback(t: (key: string) => string, key: string, fallback: string) {
  const value = t(key);
  return value === key ? fallback : value;
}

function addLabel(raw: string) {
  return raw.replace(/^\+\s*/, '');
}

function renderRun(
  run: Exclude<AgreementTemplateRun, string>,
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
  excludeProfileId: string | null | undefined,
  onChange: (state: AgreementDocumentState) => void,
) {
  if (run.kind === 'party') {
    const slot = state.parties[run.id] || { query: '', selected: null, classification: null };
    const role = state.partyRoles[run.id] || template.defaultRoles[run.id] || 'Party';
    const roleOptions = (template.roleOptions[run.id] || [role]).map((label) => ({
      id: label.toLowerCase().replace(/\s+/g, '_'),
      label,
    }));
    return (
      <>
        <AgreementPartyToken
          id={run.id}
          placeholder={run.placeholder}
          ariaLabel={run.ariaLabel}
          query={slot.query}
          selected={slot.selected}
          classification={slot.classification}
          excludeProfileId={excludeProfileId}
          onQueryChange={(query) => {
            onChange({
              ...state,
              parties: {
                ...state.parties,
                [run.id]: { query, selected: null, classification: null },
              },
            });
          }}
          onSelect={(party: SelectedAgreementParty) => {
            onChange({
              ...state,
              parties: {
                ...state.parties,
                [run.id]: {
                  query: party.displayName,
                  selected: party,
                  classification: party.civizenKind === 'organization' ? 'organization' : 'person',
                },
              },
            });
          }}
          onClassification={(classification: PartyPersonOrOrg) => {
            onChange({
              ...state,
              parties: {
                ...state.parties,
                [run.id]: { ...slot, classification },
              },
            });
          }}
        />
        {' (the '}
        <AgreementChoiceWord
          value={role}
          options={roleOptions}
          ariaLabel={`${role} role`}
          onChange={(label) => {
            onChange({
              ...state,
              partyRoles: { ...state.partyRoles, [run.id]: label },
            });
          }}
        />
        {')'}
      </>
    );
  }
  if (run.kind === 'date' && run.id === 'endAt' && state.values.endOpen === 'until_completed') {
    return (
      <button
        type="button"
        data-testid="agreement-token-endAt"
        aria-label="Until completed"
        className="inline border-0 border-b border-dashed border-foreground/40 bg-transparent p-0 font-medium text-foreground"
        onClick={() => {
          onChange({
            ...state,
            values: { ...state.values, endOpen: '', endAt: '' },
          });
        }}
      >
        completed
      </button>
    );
  }
  return (
    <AgreementInlineToken
      id={run.id}
      value={state.values[run.id] || ''}
      placeholder={run.placeholder}
      ariaLabel={run.ariaLabel}
      kind={run.kind}
      onChange={(value) => {
        const next = { ...state.values, [run.id]: value };
        if (run.id === 'endAt' && value.trim()) next.endOpen = '';
        onChange({ ...state, values: next });
      }}
    />
  );
}

function renderParagraph(
  runs: AgreementTemplateRun[],
  template: AgreementDocumentTemplate,
  state: AgreementDocumentState,
  excludeProfileId: string | null | undefined,
  onChange: (state: AgreementDocumentState) => void,
) {
  const nodes: ReactNode[] = [];
  for (let index = 0; index < runs.length; index += 1) {
    const run = runs[index];
    const next = runs[index + 1];
    const glue = typeof next === 'string' && PUNCTUATION_ONLY.test(next.trim());
    if (typeof run === 'string') {
      nodes.push(run);
      continue;
    }
    const token = renderRun(run, template, state, excludeProfileId, onChange);
    if (glue && run.kind === 'multiline') {
      nodes.push(<span key={run.id}>{token}</span>);
      index += 1;
      continue;
    }
    if (glue) {
      nodes.push(
        <span key={run.id} className="whitespace-nowrap">
          {token}
          {next}
        </span>,
      );
      index += 1;
      continue;
    }
    nodes.push(<span key={run.id}>{token}</span>);
  }
  return nodes;
}

function paragraphHasEndDate(runs: AgreementTemplateRun[]) {
  return runs.some((run) => typeof run !== 'string' && run.id === 'endAt');
}

export function AgreementDocumentEditor({
  template,
  state,
  excludeProfileId,
  onChange,
}: AgreementDocumentEditorProps) {
  const { t } = useLanguage();
  const sections = visibleTemplateSections(template, state);
  const unused = unusedOptionalSections(template, state);

  const addOptional = (id: string) => {
    if (state.visibleOptional.includes(id)) return;
    onChange({ ...state, visibleOptional: [...state.visibleOptional, id] });
  };

  const addCustomSection = () => {
    onChange({
      ...state,
      extraSections: [
        ...state.extraSections,
        { id: `custom-${Date.now()}`, title: '', body: '' },
      ],
    });
  };

  return (
    <article
      data-testid="agreement-document"
      className="px-0 py-1 text-[0.95rem] leading-[1.7] text-foreground"
    >
      <h2 className="mb-4 text-xl font-semibold tracking-tight">
        <AgreementChoiceWord
          value={state.documentHeading || template.documentHeading}
          options={template.headingOptions}
          ariaLabel={t('agreements.fieldType')}
          className="text-xl font-semibold tracking-tight"
          onChange={(label, optionId) => onChange(applyDocumentHeading(template, state, label, optionId))}
        />
      </h2>
      {sections.map((section) => (
        <section key={section.id} className="mb-5 last:mb-0">
          {section.title ? (
            <h3 className="mb-1.5 text-[0.95rem] font-semibold text-foreground">{section.title}</h3>
          ) : null}
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph.id} className="mb-3 text-pretty last:mb-0">
              {renderParagraph(paragraph.runs, template, state, excludeProfileId, onChange)}
              {paragraphHasEndDate(paragraph.runs) && state.values.endOpen !== 'until_completed' ? (
                <>
                  {' '}
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:underline"
                    onClick={() => {
                      onChange({
                        ...state,
                        values: { ...state.values, endAt: '', endOpen: 'until_completed' },
                      });
                    }}
                  >
                    {t('agreements.untilCompleted')}
                  </button>
                </>
              ) : null}
            </p>
          ))}
        </section>
      ))}

      {state.extraSections.map((item, index) => (
        <section key={item.id} className="mb-5 space-y-1">
          <Input
            value={item.title}
            onChange={(event) => {
              const extraSections = state.extraSections.map((section, current) => (
                current === index ? { ...section, title: event.target.value } : section
              ));
              onChange({ ...state, extraSections });
            }}
            placeholder={t('agreements.customSectionTitle')}
            aria-label={t('agreements.customSectionTitle')}
            className="h-8 border-0 border-b border-dashed px-0 text-[0.95rem] font-semibold shadow-none"
          />
          <Textarea
            value={item.body}
            onChange={(event) => {
              const extraSections = state.extraSections.map((section, current) => (
                current === index ? { ...section, body: event.target.value } : section
              ));
              onChange({ ...state, extraSections });
            }}
            placeholder={t('agreements.customSectionBody')}
            aria-label={t('agreements.customSectionBody')}
            className="min-h-[72px] border-0 border-b border-dashed px-0 shadow-none"
          />
        </section>
      ))}

      {unused.length > 0 || template.allowCustomSections ? (
        <div className="mt-6 border-t border-border/40 pt-3">
          <p className="mb-1.5 text-xs text-muted-foreground">{t('agreements.addTerms')}</p>
          <div className="flex flex-col items-start gap-1">
            {unused.map((item) => (
              <button
                key={item.id}
                type="button"
                data-testid={`agreements-add-${item.id}`}
                className="inline-flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
                onClick={() => addOptional(item.id)}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {addLabel(translatedOrFallback(t, item.addLabelKey || '', `Add ${item.title || item.id}`))}
              </button>
            ))}
            {template.allowCustomSections ? (
              <button
                type="button"
                data-testid="agreements-add-custom-section"
                className="inline-flex items-center gap-1 text-left text-sm text-muted-foreground hover:text-foreground"
                onClick={addCustomSection}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                {addLabel(t('agreements.add.anotherSection'))}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function AgreementDocumentActions({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: () => void;
}) {
  const { t } = useLanguage();
  return (
    <Button type="button" data-testid="agreements-create-submit" onClick={onCreate} disabled={busy}>
      {busy ? t('agreements.startWorking') : t('agreements.createConfirm')}
    </Button>
  );
}

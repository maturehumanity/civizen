import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AgreementDocumentActions, AgreementDocumentEditor } from '@/components/agreements/AgreementDocumentEditor';
import { AppLayout } from '@/components/layout/AppLayout';
import { AppPageHeader } from '@/components/layout/AppPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  createCollaborationAgreement,
  payloadFromLaunchContext,
  peekNextAgreementNumber,
} from '@/lib/agreements-api';
import {
  agreementReferenceFromNumber,
  agreementTypeDefinition,
  normalizeAgreementCreateType,
  parseAgreementLaunchContext,
  relatedEntityHref,
  resolveEnteredParty,
} from '@/lib/agreements-model';
import {
  agreementDocumentTemplate,
  compileAgreementDocument,
  compiledPartiesFromDocument,
  seedAgreementDocumentState,
} from '@/lib/agreements-templates';

export default function AgreementCreate() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const launch = useMemo(() => parseAgreementLaunchContext(searchParams.toString()), [searchParams]);
  const agreementType = normalizeAgreementCreateType(launch.agreementType);
  const customTypeName = launch.customType?.trim() || '';
  const actor = useMemo(
    () => ({
      fullName: profile?.full_name || profile?.username,
      profileId: profile?.id,
    }),
    [profile?.full_name, profile?.id, profile?.username],
  );
  const seeded = useMemo(
    () => payloadFromLaunchContext(launch, {
      fullName: actor.fullName,
      profileId: actor.profileId,
      isOrganization: false,
    }),
    [actor.fullName, actor.profileId, launch],
  );
  const template = useMemo(
    () => agreementDocumentTemplate(agreementType, customTypeName),
    [agreementType, customTypeName],
  );
  const [state, setState] = useState(() => seedAgreementDocumentState({
    type: agreementType,
    launch,
    actor,
  }));
  const [busy, setBusy] = useState(false);
  const seedKey = `${agreementType}:${searchParams.toString()}:${actor.profileId || ''}:${actor.fullName || ''}`;
  const seedKeyRef = useRef(seedKey);

  useEffect(() => {
    if (seedKeyRef.current === seedKey) return;
    seedKeyRef.current = seedKey;
    setState((current) => ({
      ...seedAgreementDocumentState({
        type: agreementType,
        launch,
        actor,
      }),
      referenceNumber: current.referenceNumber,
    }));
  }, [actor, agreementType, launch, seedKey]);

  useEffect(() => {
    let active = true;
    void peekNextAgreementNumber().then((peeked) => {
      if (!active) return;
      setState((current) => {
        const next = String(peeked.sequence);
        if (current.referenceNumber && current.referenceNumber !== '1') return current;
        if (current.referenceNumber === next) return current;
        return { ...current, referenceNumber: next };
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const relatedHref = launch.source ? relatedEntityHref(launch.source, launch.relatedId) : null;
  const typeLabel = state.documentHeading
    || customTypeName
    || template.documentHeading
    || t(agreementTypeDefinition(agreementType)?.labelKey || `agreements.types.${agreementType}`);

  const submit = async () => {
    const compiled = compileAgreementDocument({
      type: agreementType,
      customTypeName,
      template,
      state,
      typeLabel,
    });
    const { parties, needsClassification } = compiledPartiesFromDocument(state, (slot) => {
      if (!slot.query.trim() && !slot.selected) return null;
      return resolveEnteredParty({
        query: slot.query,
        selected: slot.selected,
        classification: slot.classification,
      });
    });
    if (compiled.title.trim().length < 3) {
      toast.error(t('agreements.createTitleRequired'));
      return;
    }
    if (needsClassification) {
      toast.error(t('agreements.partyKindAsk'));
      return;
    }
    setBusy(true);
    try {
      const id = await createCollaborationAgreement({
        title: compiled.title.trim(),
        agreementType,
        summary: compiled.purpose.trim(),
        purpose: compiled.purpose.trim(),
        content: compiled.content,
        startAt: compiled.startAt,
        endAt: compiled.endAt,
        parties: parties.length > 0 ? parties : seeded.parties,
        related: seeded.related,
        referenceCode: state.referenceNumber.trim()
          ? agreementReferenceFromNumber(state.referenceNumber)
          : null,
      });
      toast.success(t('agreements.createdToast'));
      navigate(`/agreements/${id}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : t('agreements.createError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5">
        <AppPageHeader
          title={(
            <span className="inline-flex items-baseline gap-[0.35em]">
              <span>{t('agreements.numberPrefix')}</span>
              <input
                data-testid="agreement-number"
                aria-label={t('agreements.numberLabel')}
                value={state.referenceNumber}
                placeholder="1"
                size={Math.max(state.referenceNumber.length, 1)}
                inputMode="numeric"
                autoComplete="off"
                onChange={(event) => {
                  setState({
                    ...state,
                    referenceNumber: event.target.value.replace(/[^\d]/g, ''),
                  });
                }}
                className="m-0 w-auto min-w-0 border-0 border-b border-dashed border-foreground/40 bg-transparent p-0 font-display text-2xl font-bold leading-snug text-foreground outline-none"
              />
              <span>{t('agreements.numberOn')}</span>
            </span>
          )}
          fallbackPath="/agreements"
        />

        {launch.relatedTitle ? (
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{launch.relatedTitle}</span>
            {relatedHref ? (
              <>
                {' · '}
                <a href={relatedHref} className="underline-offset-2 hover:underline">
                  {t('agreements.openRelatedActivity')}
                </a>
              </>
            ) : null}
          </p>
        ) : null}

        <AgreementDocumentEditor
          template={template}
          state={state}
          excludeProfileId={profile?.id}
          onChange={setState}
        />

        <p className="text-[11px] leading-snug text-muted-foreground/80">{t('agreements.templateNotLegal')}</p>

        <AgreementDocumentActions busy={busy} onCreate={() => void submit()} />
      </div>
    </AppLayout>
  );
}

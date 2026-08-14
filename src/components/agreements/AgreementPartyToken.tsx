import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { searchAgreementParties, type AgreementPartySuggestion } from '@/lib/agreements-api';
import {
  resolveDirectoryPartyMatch,
  resolveEnteredParty,
  type PartyPersonOrOrg,
  type SelectedAgreementParty,
} from '@/lib/agreements-model';
import { AgreementFitInput } from '@/components/agreements/AgreementInlineToken';

type AgreementPartyTokenProps = {
  id: string;
  placeholder: string;
  ariaLabel?: string;
  query: string;
  selected: SelectedAgreementParty | null;
  classification: PartyPersonOrOrg | null;
  excludeProfileId?: string | null;
  onQueryChange: (query: string) => void;
  onSelect: (party: SelectedAgreementParty) => void;
  onClassification: (value: PartyPersonOrOrg) => void;
};

export function AgreementPartyToken({
  id,
  placeholder,
  ariaLabel,
  query,
  selected,
  classification,
  excludeProfileId,
  onQueryChange,
  onSelect,
  onClassification,
}: AgreementPartyTokenProps) {
  const { t } = useLanguage();
  const [suggestions, setSuggestions] = useState<AgreementPartySuggestion[]>([]);
  const [directoryStatus, setDirectoryStatus] = useState<'idle' | 'pending' | 'done' | 'bound'>('idle');
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const resolved = resolveEnteredParty({ query, selected, classification });

  useEffect(() => {
    if (selected) {
      setSuggestions([]);
      setDirectoryStatus('idle');
      return;
    }
    if (query.trim().length < 2) {
      setSuggestions([]);
      setDirectoryStatus('idle');
      return;
    }
    let active = true;
    setDirectoryStatus('pending');
    const timer = window.setTimeout(() => {
      void searchAgreementParties(query, excludeProfileId).then((rows) => {
        if (!active) return;
        const match = resolveDirectoryPartyMatch(query, rows);
        if (match.status === 'unique') {
          setSuggestions([]);
          setDirectoryStatus('bound');
          onSelectRef.current({
            profileId: match.party.profileId,
            displayName: match.party.displayName,
            civizenKind: match.party.civizenKind,
          });
          return;
        }
        setSuggestions(match.status === 'choose' ? match.parties : []);
        setDirectoryStatus('done');
      });
    }, 250);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [excludeProfileId, query, selected]);

  const askPersonOrOrg = !selected
    && directoryStatus === 'done'
    && suggestions.length === 0
    && resolved.needsClassification;

  return (
    <span className="relative inline max-w-full align-baseline">
      <AgreementFitInput
        id={`agreement-party-${id}`}
        testId={`agreement-token-${id}`}
        value={query}
        placeholder={placeholder}
        ariaLabel={ariaLabel}
        onChange={onQueryChange}
      />
      {suggestions.length > 0 ? (
        <ul className="absolute left-0 z-20 mt-1 min-w-[16rem] overflow-hidden rounded-lg border border-border/70 bg-card text-left shadow-md">
          {suggestions.map((row) => (
            <li key={`${row.civizenKind}-${row.profileId}`}>
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-muted/50"
                onClick={() => onSelect({
                  profileId: row.profileId,
                  displayName: row.displayName,
                  civizenKind: row.civizenKind,
                })}
              >
                <span className="font-medium text-foreground">{row.displayName}</span>
                {row.subtitle ? <span className="text-xs text-muted-foreground">{row.subtitle}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {askPersonOrOrg ? (
        <span className="absolute left-0 top-full z-20 mt-1 flex gap-1 rounded-lg border border-border/70 bg-card p-1 shadow-md">
          <Button
            type="button"
            size="sm"
            variant={classification === 'person' ? 'default' : 'outline'}
            onClick={() => onClassification('person')}
          >
            {t('agreements.partyKindPerson')}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={classification === 'organization' ? 'default' : 'outline'}
            onClick={() => onClassification('organization')}
          >
            {t('agreements.partyKindOrganization')}
          </Button>
        </span>
      ) : null}
    </span>
  );
}

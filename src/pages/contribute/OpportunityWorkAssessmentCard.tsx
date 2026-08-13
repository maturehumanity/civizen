import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  assessmentSummaryScore,
  parseOptionalEvaluationScore,
  scoredEvaluationDimensions,
  type EvaluationDimension,
  type OpportunityWorkAssessment,
  type OpportunityWorkAssessmentScores,
} from '@/lib/opportunities';

function dimensionLabel(dimension: EvaluationDimension, t: (key: string) => string) {
  return t(`contribute.opportunities.dimension.${dimension}`);
}

export function OpportunityAssessmentView({
  dimensions,
  assessment,
}: {
  dimensions: readonly EvaluationDimension[];
  assessment: OpportunityWorkAssessment;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const summary = assessmentSummaryScore(assessment.scores, dimensions);
  const scored = scoredEvaluationDimensions(assessment.scores, dimensions);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">
        {t('contribute.opportunities.assessmentTitle')}
        {summary != null ? ` · ${summary}` : ''}
      </p>
      {scored.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {scored.map((dimension) => dimensionLabel(dimension, t)).join(' · ')}
        </p>
      ) : null}
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {t('contribute.opportunities.moreDetails')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2 text-sm text-muted-foreground">
          {scored.map((dimension) => (
            <p key={dimension}>
              <span className="font-medium text-foreground">{dimensionLabel(dimension, t)}: </span>
              {assessment.scores[dimension]}
            </p>
          ))}
          {assessment.notes ? (
            <p>
              <span className="font-medium text-foreground">
                {t('contribute.opportunities.assessmentNotes')}:{' '}
              </span>
              {assessment.notes}
            </p>
          ) : null}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function parseAssessmentScoreFields(
  fields: Record<string, string>,
  dimensions: readonly EvaluationDimension[],
): { ok: true; scores: OpportunityWorkAssessmentScores } | { ok: false } {
  const scores: OpportunityWorkAssessmentScores = {};
  for (const dimension of dimensions) {
    const parsed = parseOptionalEvaluationScore(fields[dimension] ?? '');
    if (!parsed.ok) return { ok: false };
    scores[dimension] = parsed.value;
  }
  return { ok: true, scores };
}

export function OpportunityAssessmentForm({
  dimensions,
  existing,
  busy,
  onSave,
}: {
  dimensions: readonly EvaluationDimension[];
  existing: OpportunityWorkAssessment | null;
  busy: boolean;
  onSave: (scores: OpportunityWorkAssessmentScores, notes: string) => void;
}) {
  const { t } = useLanguage();
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const dimension of dimensions) {
      const value = existing?.scores[dimension];
      initial[dimension] = typeof value === 'number' ? String(value) : '';
    }
    return initial;
  });
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [showNotes, setShowNotes] = useState(Boolean(existing?.notes));

  const save = () => {
    const parsed = parseAssessmentScoreFields(fields, dimensions);
    if (!parsed.ok) {
      toast.error(t('contribute.opportunities.assessmentScoresInvalid'));
      return;
    }
    onSave(parsed.scores, notes);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">{t('contribute.opportunities.assessmentTitle')}</p>
      <p className="text-xs text-muted-foreground">{t('contribute.opportunities.assessmentEnterHint')}</p>
      {dimensions.map((dimension) => (
        <div key={dimension} className="space-y-1">
          <Label htmlFor={`assess-${dimension}`}>{dimensionLabel(dimension, t)}</Label>
          <Input
            id={`assess-${dimension}`}
            inputMode="decimal"
            value={fields[dimension] ?? ''}
            onChange={(event) =>
              setFields((current) => ({ ...current, [dimension]: event.target.value }))
            }
            placeholder={t('contribute.opportunities.assessmentScoreHint')}
          />
        </div>
      ))}
      <Collapsible open={showNotes} onOpenChange={setShowNotes}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm">
            {t('contribute.opportunities.moreDetails')}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          <Label htmlFor="assess-notes">{t('contribute.opportunities.assessmentNotes')}</Label>
          <Textarea
            id="assess-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder={t('contribute.opportunities.assessmentNotesPlaceholder')}
            rows={3}
          />
        </CollapsibleContent>
      </Collapsible>
      <Button size="sm" disabled={busy} onClick={save}>
        {existing
          ? t('contribute.opportunities.assessmentUpdate')
          : t('contribute.opportunities.assessmentSave')}
      </Button>
    </div>
  );
}

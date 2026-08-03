import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  createContributionRecord,
  createContributorProfile,
  listContributionRecords,
  listContributorProfiles,
  type ContributionRecord,
  type ContributorProfile,
} from '@/lib/funding/distribution';

type FundingContributorsAdminProps = {
  /** @deprecated Panels always render embedded under FundingAdmin. Kept for call-site compatibility. */
  embedded?: boolean;
};

export default function FundingContributorsAdmin(_props: FundingContributorsAdminProps = {}) {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<ContributorProfile[]>([]);
  const [records, setRecords] = useState<ContributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [contributorType, setContributorType] = useState('individual');

  const [contributorId, setContributorId] = useState('');
  const [workType, setWorkType] = useState('verified_work');
  const [verifiedPoints, setVerifiedPoints] = useState('10');
  const [recordNotes, setRecordNotes] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [profileResult, recordResult] = await Promise.all([
      listContributorProfiles(),
      listContributionRecords(),
    ]);
    if (!profileResult.ok) {
      setError(profileResult.message);
      setProfiles([]);
    } else {
      setProfiles(profileResult.data);
      setContributorId((current) => current || profileResult.data[0]?.id || '');
    }
    if (recordResult.ok) setRecords(recordResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreateProfile = async (event: FormEvent) => {
    event.preventDefault();
    if (!displayName.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await createContributorProfile({
      displayName: displayName.trim(),
      contributorType,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('fund.contributors.profileSaved'));
    setDisplayName('');
    await load();
  };

  const onCreateRecord = async (event: FormEvent) => {
    event.preventDefault();
    const points = Number(verifiedPoints);
    if (!contributorId || !workType.trim() || !Number.isFinite(points) || points < 0) {
      setError(t('fund.contributors.invalidRecord'));
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    const result = await createContributionRecord({
      contributorId,
      workType: workType.trim(),
      verifiedPoints: points,
      notes: recordNotes || undefined,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSuccess(t('fund.contributors.recordSaved'));
    setRecordNotes('');
    await load();
  };

  const profileName = (id: string) =>
    profiles.find((p) => p.id === id)?.display_name ?? id.slice(0, 8);

  return (
    <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">
              {t('fund.contributors.title')}
            </h2>
            <p className="text-sm text-muted-foreground">{t('fund.contributors.description')}</p>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-primary">{success}</p> : null}

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-foreground">{t('fund.contributors.newProfile')}</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateProfile}>
            <div className="space-y-2">
              <Label>{t('fund.contributors.displayName')}</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('fund.contributors.contributorType')}</Label>
              <Select value={contributorType} onValueChange={setContributorType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">
                    {t('fund.contributors.types.individual')}
                  </SelectItem>
                  <SelectItem value="organization">
                    {t('fund.contributors.types.organization')}
                  </SelectItem>
                  <SelectItem value="other">{t('fund.contributors.types.other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? t('common.loading') : t('fund.contributors.saveProfile')}
              </Button>
            </div>
          </form>
        </Card>

        <Card className="space-y-4 p-4">
          <h2 className="font-semibold text-foreground">{t('fund.contributors.newRecord')}</h2>
          <form className="grid gap-3 md:grid-cols-2" onSubmit={onCreateRecord}>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.contributors.contributor')}</Label>
              <Select value={contributorId} onValueChange={setContributorId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('fund.contributors.workType')}</Label>
              <Input value={workType} onChange={(e) => setWorkType(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>{t('fund.contributors.verifiedPoints')}</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={verifiedPoints}
                onChange={(e) => setVerifiedPoints(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{t('fund.contributors.notes')}</Label>
              <Textarea value={recordNotes} onChange={(e) => setRecordNotes(e.target.value)} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy || !contributorId}>
                {busy ? t('common.loading') : t('fund.contributors.saveRecord')}
              </Button>
            </div>
          </form>
        </Card>

        {loading ? <p className="text-sm text-muted-foreground">{t('common.loading')}</p> : null}

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">{t('fund.contributors.profilesTitle')}</h2>
          {profiles.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">{t('fund.contributors.emptyProfiles')}</Card>
          ) : (
            profiles.map((p) => (
              <Card key={p.id} className="p-4">
                <p className="font-semibold text-foreground">{p.display_name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.contributor_type} · {p.payout_status} · {p.tax_status}
                </p>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-3">
          <h2 className="font-semibold text-foreground">{t('fund.contributors.recordsTitle')}</h2>
          {records.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">{t('fund.contributors.emptyRecords')}</Card>
          ) : (
            records.map((r) => (
              <Card key={r.id} className="p-4">
                <p className="font-semibold text-foreground">
                  {profileName(r.contributor_id)} · {r.verified_points} pts
                </p>
                <p className="text-sm text-muted-foreground">
                  {r.work_type} · {r.status}
                </p>
              </Card>
            ))
          )}
        </div>
    </div>
  );
}

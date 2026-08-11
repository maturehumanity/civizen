import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { RoundCountryFlag } from '@/components/governance/RoundCountryFlag';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryOptions } from '@/lib/countries';
import { listGeoCities, listGeoRegions, type GeoRegionOption } from '@/lib/geo-locations';
import {
  ageFromDateOfBirth,
  filterMarketJobTypeOptions,
  formatEnglishOrList,
  MARKET_JOB_DAYS,
  MARKET_JOB_PAY_PERIODS,
  MARKET_JOB_TERMS,
  MARKET_JOB_TYPE_SEEDS,
  type MarketJobMode,
} from '@/lib/market-job-types';
import { submitMarketJobInterest } from '@/lib/submit-market-job-interest';
import { isBusinessUsername } from '@/lib/users-admin';
import { cn } from '@/lib/utils';

function canHoverOpen(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() || '';
}

type SentenceTokenProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ariaLabel: string;
  empty: boolean;
  /** When false, empty tokens keep the accent color (used for cycling job types). */
  dimWhenEmpty?: boolean;
  children: ReactNode;
  panel: ReactNode;
  contentClassName?: string;
  triggerClassName?: string;
  onHoverChange?: (hovered: boolean) => void;
};

function SentenceToken({
  open,
  onOpenChange,
  ariaLabel,
  empty,
  dimWhenEmpty = true,
  children,
  panel,
  contentClassName,
  triggerClassName,
  onHoverChange,
}: SentenceTokenProps) {
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    };
  }, []);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openMenu = () => {
    clearCloseTimer();
    onOpenChange(true);
  };

  const scheduleClose = () => {
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => onOpenChange(false), 160);
  };

  const setHovered = (hovered: boolean) => {
    onHoverChange?.(hovered);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        clearCloseTimer();
        onOpenChange(next);
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            'ml-0.5 mr-0.5 inline-flex max-w-[min(22rem,calc(100vw-6rem))] items-center rounded-sm border-b border-dashed border-primary/55 px-0.5 text-left font-medium text-primary transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            empty && dimWhenEmpty && 'text-muted-foreground',
            triggerClassName,
          )}
          onMouseEnter={() => {
            setHovered(true);
            if (canHoverOpen()) openMenu();
          }}
          onMouseLeave={() => {
            setHovered(false);
            if (canHoverOpen()) scheduleClose();
          }}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <span className="inline-flex items-center gap-1.5 whitespace-normal">{children}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn('w-[min(18rem,calc(100vw-2rem))] p-0', contentClassName)}
        onMouseEnter={() => {
          setHovered(true);
          if (canHoverOpen()) openMenu();
        }}
        onMouseLeave={() => {
          setHovered(false);
          if (canHoverOpen()) scheduleClose();
        }}
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {panel}
      </PopoverContent>
    </Popover>
  );
}

function CyclingOptionsLabel({
  options,
  active,
  paused,
  fallback,
}: {
  options: readonly string[];
  active: boolean;
  paused: boolean;
  fallback: string;
}) {
  const [index, setIndex] = useState(0);
  const [preferReducedMotion, setPreferReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPreferReducedMotion(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!active || paused || preferReducedMotion || options.length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % options.length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [active, paused, preferReducedMotion, options]);

  if (!active || options.length === 0) return <>{fallback}</>;
  const label = options[index % options.length] ?? fallback;
  return (
    <span className="inline-block min-w-[4.5ch] font-semibold text-primary transition-opacity duration-300" aria-hidden>
      {label}
    </span>
  );
}

export function MarketJobsInterestForm() {
  const { t, language } = useLanguage();
  const { user, profile } = useAuth();
  const isBusiness = isBusinessUsername(profile?.username);
  const isLoggedIn = Boolean(user?.id);

  const [mode, setMode] = useState<MarketJobMode>(() => (isBusiness ? 'employer' : 'seeker'));
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [jobQuery, setJobQuery] = useState('');
  const [jobOpen, setJobOpen] = useState(false);
  const [jobHovered, setJobHovered] = useState(false);

  const [city, setCity] = useState(() => trimOrEmpty(profile?.city));
  const [regionCode, setRegionCode] = useState(() => trimOrEmpty(profile?.region_code));
  const [countryCode, setCountryCode] = useState(() => trimOrEmpty(profile?.country_code));
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationQuery, setLocationQuery] = useState('');
  const [regions, setRegions] = useState<GeoRegionOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  const [payAmount, setPayAmount] = useState('');
  const [payPeriod, setPayPeriod] = useState('Monthly pay');
  const [payOpen, setPayOpen] = useState(false);

  const [fullName, setFullName] = useState(() => trimOrEmpty(profile?.full_name));
  const [companyName, setCompanyName] = useState(() =>
    isBusiness ? trimOrEmpty(profile?.full_name) : '',
  );
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    () => trimOrEmpty(profile?.phone_country_code) || trimOrEmpty(profile?.country_code) || 'US',
  );
  const [phoneNumber, setPhoneNumber] = useState(() => trimOrEmpty(profile?.phone_number));
  const [age, setAge] = useState(() => ageFromDateOfBirth(profile?.date_of_birth));

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [days, setDays] = useState<string[]>(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  const [hoursFrom, setHoursFrom] = useState('09:00');
  const [hoursTo, setHoursTo] = useState('18:00');
  const [terms, setTerms] = useState<string[]>(['Full-time']);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showContact = jobTypes.length > 0;
  const countryOptions = useMemo(() => getCountryOptions(language), [language]);
  const jobOptions = useMemo(() => filterMarketJobTypeOptions(jobQuery, jobTypes), [jobQuery, jobTypes]);
  const selectedJobSet = useMemo(
    () => new Set(jobTypes.map((item) => item.toLowerCase())),
    [jobTypes],
  );
  const pauseJobCycle = jobOpen || jobHovered;

  useEffect(() => {
    setMode(isBusiness ? 'employer' : 'seeker');
  }, [isBusiness]);

  useEffect(() => {
    const nextName = trimOrEmpty(profile?.full_name);
    const nextPhone = trimOrEmpty(profile?.phone_number);
    const nextPhoneCountry =
      trimOrEmpty(profile?.phone_country_code) || trimOrEmpty(profile?.country_code);
    const nextAge = ageFromDateOfBirth(profile?.date_of_birth);
    const nextCity = trimOrEmpty(profile?.city);
    const nextRegion = trimOrEmpty(profile?.region_code);
    const nextCountry = trimOrEmpty(profile?.country_code);

    if (nextName) setFullName((current) => trimOrEmpty(current) || nextName);
    if (nextPhone) setPhoneNumber((current) => trimOrEmpty(current) || nextPhone);
    if (nextPhoneCountry) {
      setPhoneCountryCode((current) => trimOrEmpty(current) || nextPhoneCountry);
    }
    if (nextAge) setAge((current) => trimOrEmpty(current) || nextAge);
    if (nextCity) setCity((current) => trimOrEmpty(current) || nextCity);
    if (nextRegion) setRegionCode((current) => trimOrEmpty(current) || nextRegion);
    if (nextCountry) setCountryCode((current) => trimOrEmpty(current) || nextCountry);
    if (isBusinessUsername(profile?.username) && nextName) {
      setCompanyName((current) => trimOrEmpty(current) || nextName);
    }
  }, [
    profile?.full_name,
    profile?.phone_number,
    profile?.phone_country_code,
    profile?.date_of_birth,
    profile?.city,
    profile?.region_code,
    profile?.country_code,
    profile?.username,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!countryCode) {
      setRegions([]);
      setCities([]);
      return;
    }
    void listGeoRegions(countryCode).then((next) => {
      if (!cancelled) setRegions(next);
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  useEffect(() => {
    let cancelled = false;
    if (!countryCode || !regionCode) {
      setCities([]);
      return;
    }
    void listGeoCities(countryCode, regionCode).then((next) => {
      if (!cancelled) setCities(next);
    });
    return () => {
      cancelled = true;
    };
  }, [countryCode, regionCode]);

  const locationText = [city, regionCode].filter(Boolean).join(', ');
  const locationEmpty = !city && !regionCode && !countryCode;

  const toggleJobType = (job: string) => {
    setJobTypes((current) => {
      const needle = job.toLowerCase();
      if (current.some((item) => item.toLowerCase() === needle)) {
        return current.filter((item) => item.toLowerCase() !== needle);
      }
      return [...current, job];
    });
    setJobQuery('');
  };

  const toggleDay = (day: string) => {
    setDays((current) =>
      current.includes(day) ? current.filter((item) => item !== day) : [...current, day],
    );
  };

  const toggleTerm = (term: string) => {
    setTerms((current) =>
      current.includes(term) ? current.filter((item) => item !== term) : [...current, term],
    );
  };

  const onSubmit = async () => {
    if (!user?.id || !profile?.id) {
      toast.error(t('market.jobsForm.signInRequired'));
      return;
    }
    setSubmitting(true);
    const result = await submitMarketJobInterest({
      mode,
      jobTypes,
      city,
      regionCode,
      countryCode,
      payAmount,
      payPeriod,
      fullName,
      companyName,
      phoneCountryCode,
      phoneNumber,
      age,
      days,
      hoursFrom,
      hoursTo,
      terms,
      notes,
      userId: user.id,
      profileId: profile.id,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success(t('market.jobsForm.submitSuccess'));
    setJobTypes([]);
    setNotes('');
    setDetailsOpen(false);
  };

  const filteredCountries = countryOptions.filter((option) => {
    const needle = locationQuery.trim().toLowerCase();
    if (!needle) return true;
    return option.label.toLowerCase().includes(needle) || option.code.toLowerCase().includes(needle);
  });

  const filteredRegions = regions.filter((region) => {
    const needle = locationQuery.trim().toLowerCase();
    if (!needle) return true;
    return region.name.toLowerCase().includes(needle) || region.code.toLowerCase().includes(needle);
  });

  const filteredCities = cities.filter((name) => {
    const needle = locationQuery.trim().toLowerCase();
    if (!needle) return true;
    return name.toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-5 px-1" data-testid="market-jobs-interest-form">
      {!isLoggedIn ? (
        <div className="flex justify-center">
          <div
            className="inline-flex rounded-full border border-border/70 bg-muted/20 p-0.5"
            role="group"
            aria-label={t('market.jobsForm.modeLabel')}
            data-testid="market-jobs-mode-tabs"
          >
            <Button
              type="button"
              size="sm"
              variant={mode === 'seeker' ? 'default' : 'ghost'}
              className="h-8 rounded-full px-4 text-xs"
              onClick={() => setMode('seeker')}
              aria-pressed={mode === 'seeker'}
            >
              {t('market.jobsForm.modeSeeker')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'employer' ? 'default' : 'ghost'}
              className="h-8 rounded-full px-4 text-xs"
              onClick={() => setMode('employer')}
              aria-pressed={mode === 'employer'}
            >
              {t('market.jobsForm.modeEmployer')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2 text-center">
        <h3 className="text-xl font-display font-semibold text-foreground sm:text-2xl">
          {mode === 'seeker' ? t('market.jobsForm.seekerHeadline') : t('market.jobsForm.employerHeadline')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {mode === 'seeker' ? t('market.jobsForm.seekerSubtitle') : t('market.jobsForm.employerSubtitle')}
        </p>
      </div>

      <p className="text-base leading-relaxed text-foreground sm:text-lg" data-testid="market-jobs-sentence">
        {mode === 'seeker' ? t('market.jobsForm.seekerLead') : t('market.jobsForm.employerLead')}{' '}
        <SentenceToken
          open={jobOpen}
          onOpenChange={setJobOpen}
          onHoverChange={setJobHovered}
          ariaLabel={t('market.jobsForm.jobTypeLabel')}
          empty={jobTypes.length === 0}
          dimWhenEmpty={false}
          triggerClassName="border-primary/70 font-semibold text-primary hover:bg-primary/15"
          panel={
            <Command>
              <CommandInput
                value={jobQuery}
                onValueChange={setJobQuery}
                placeholder={t('market.jobsForm.jobTypeSearch')}
              />
              <CommandList>
                <CommandEmpty>{t('market.jobsForm.jobTypeEmpty')}</CommandEmpty>
                <CommandGroup>
                  {jobOptions.map((job) => {
                    const selected = selectedJobSet.has(job.toLowerCase());
                    return (
                      <CommandItem
                        key={job}
                        value={job}
                        onSelect={() => {
                          toggleJobType(job);
                          requestAnimationFrame(() => setJobOpen(true));
                        }}
                      >
                        <Check
                          className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')}
                          aria-hidden
                        />
                        {job}
                      </CommandItem>
                    );
                  })}
                  {jobQuery.trim() &&
                  !jobTypes.some((item) => item.toLowerCase() === jobQuery.trim().toLowerCase()) &&
                  !MARKET_JOB_TYPE_SEEDS.some(
                    (seed) => seed.toLowerCase() === jobQuery.trim().toLowerCase(),
                  ) ? (
                    <CommandItem
                      value={`add-${jobQuery.trim()}`}
                      onSelect={() => {
                        toggleJobType(jobQuery.trim());
                        requestAnimationFrame(() => setJobOpen(true));
                      }}
                    >
                      {t('market.jobsForm.addCustom', { label: jobQuery.trim() })}
                    </CommandItem>
                  ) : null}
                </CommandGroup>
              </CommandList>
            </Command>
          }
        >
          {jobTypes.length > 0 ? (
            <span className="font-semibold text-primary">{formatEnglishOrList(jobTypes)}</span>
          ) : (
            <CyclingOptionsLabel
              options={MARKET_JOB_TYPE_SEEDS}
              active
              paused={pauseJobCycle}
              fallback={t('market.jobsForm.jobTypePlaceholder')}
            />
          )}
        </SentenceToken>{' '}
        {mode === 'seeker' ? t('market.jobsForm.seekerMid') : t('market.jobsForm.employerMid')}{' '}
        <SentenceToken
          open={locationOpen}
          onOpenChange={setLocationOpen}
          ariaLabel={t('market.jobsForm.locationLabel')}
          empty={locationEmpty}
          contentClassName="w-[min(22rem,calc(100vw-2rem))]"
          panel={
            <Command>
              <CommandInput
                value={locationQuery}
                onValueChange={setLocationQuery}
                placeholder={t('market.jobsForm.locationSearch')}
              />
              <CommandList className="max-h-64">
                <CommandEmpty>{t('market.jobsForm.locationEmpty')}</CommandEmpty>
                <CommandGroup heading={t('market.jobsForm.countryHeading')}>
                  {filteredCountries.slice(0, 40).map((option) => (
                    <CommandItem
                      key={option.code}
                      value={`${option.label} ${option.code}`}
                      onSelect={() => {
                        setCountryCode(option.code);
                        setRegionCode('');
                        setCity('');
                        setLocationQuery('');
                      }}
                    >
                      <span className="inline-flex items-center gap-2">
                        <RoundCountryFlag countryCode={option.code} locale={language} size="xs" />
                        {option.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {countryCode ? (
                  <CommandGroup heading={t('market.jobsForm.regionHeading')}>
                    {filteredRegions.slice(0, 40).map((region) => (
                      <CommandItem
                        key={region.code}
                        value={`${region.name} ${region.code}`}
                        onSelect={() => {
                          setRegionCode(region.code);
                          setCity('');
                          setLocationQuery('');
                        }}
                      >
                        {region.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
                {countryCode && regionCode ? (
                  <CommandGroup heading={t('market.jobsForm.cityHeading')}>
                    {filteredCities.slice(0, 60).map((name) => (
                      <CommandItem
                        key={name}
                        value={name}
                        onSelect={() => {
                          setCity(name);
                          setLocationQuery('');
                          setLocationOpen(false);
                        }}
                      >
                        {name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ) : null}
              </CommandList>
            </Command>
          }
        >
          {locationEmpty ? (
            t('market.jobsForm.locationPlaceholder')
          ) : (
            <>
              {locationText || t('market.jobsForm.locationPlaceholder')}
              {countryCode ? (
                <RoundCountryFlag
                  countryCode={countryCode}
                  locale={language}
                  size="xs"
                  className="translate-y-px"
                />
              ) : null}
            </>
          )}
        </SentenceToken>
        {mode === 'employer' ? (
          <>
            {' '}
            {t('market.jobsForm.employerPayLead')}{' '}
            <SentenceToken
              open={payOpen}
              onOpenChange={setPayOpen}
              ariaLabel={t('market.jobsForm.payLabel')}
              empty={!payAmount}
              panel={
                <div className="space-y-2 p-3">
                  <Input
                    value={payAmount}
                    onChange={(event) => setPayAmount(event.target.value)}
                    placeholder={t('market.jobsForm.payAmountPlaceholder')}
                    inputMode="decimal"
                  />
                  <div className="flex flex-wrap gap-1">
                    {MARKET_JOB_PAY_PERIODS.map((period) => (
                      <Button
                        key={period}
                        type="button"
                        size="sm"
                        variant={payPeriod === period ? 'default' : 'outline'}
                        className="h-7 rounded-full px-2 text-[11px]"
                        onClick={() => setPayPeriod(period)}
                      >
                        {period}
                      </Button>
                    ))}
                  </div>
                </div>
              }
            >
              {payAmount
                ? `$${payAmount} ${payPeriod}`
                : t('market.jobsForm.payPlaceholder')}
            </SentenceToken>
          </>
        ) : null}
        .
      </p>

      {showContact ? (
        <div className="space-y-3" data-testid="market-jobs-contact">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3 text-sm">
            <label className="min-w-[10rem] flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">{t('market.jobsForm.fullNameLabel')}</span>
              <div className="flex items-center gap-2">
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-9 flex-1 border-0 border-b border-dashed border-border/80 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
                {countryCode ? (
                  <RoundCountryFlag countryCode={countryCode} locale={language} size="sm" />
                ) : null}
              </div>
            </label>
            {mode === 'employer' ? (
              <label className="min-w-[10rem] flex-1 space-y-1">
                <span className="text-xs text-muted-foreground">{t('market.jobsForm.companyLabel')}</span>
                <Input
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="h-9 border-0 border-b border-dashed border-border/80 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </label>
            ) : null}
            <label className="min-w-[11rem] flex-1 space-y-1">
              <span className="text-xs text-muted-foreground">{t('market.jobsForm.phoneLabel')}</span>
              <div className="flex items-center gap-2">
                <Input
                  value={phoneCountryCode}
                  onChange={(event) => setPhoneCountryCode(event.target.value.toUpperCase())}
                  className="h-9 w-14 border-0 border-b border-dashed border-border/80 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  aria-label={t('market.jobsForm.phoneCountryLabel')}
                />
                <Input
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  className="h-9 flex-1 border-0 border-b border-dashed border-border/80 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </label>
            <label className="w-20 space-y-1">
              <span className="text-xs text-muted-foreground">{t('market.jobsForm.ageLabel')}</span>
              <Input
                value={age}
                onChange={(event) => setAge(event.target.value)}
                className="h-9 border-0 border-b border-dashed border-border/80 bg-transparent px-0 shadow-none focus-visible:ring-0"
                inputMode="numeric"
              />
            </label>
          </div>

          <button
            type="button"
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => setDetailsOpen((current) => !current)}
            data-testid="market-jobs-more-toggle"
          >
            {detailsOpen ? t('common.less') : t('common.more')}
          </button>

          {detailsOpen ? (
            <div className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-3" data-testid="market-jobs-details">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('market.jobsForm.daysHeading')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MARKET_JOB_DAYS.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      size="sm"
                      variant={days.includes(day) ? 'secondary' : 'outline'}
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => toggleDay(day)}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">{t('market.jobsForm.hoursFromLabel')}</span>
                  <Input type="time" value={hoursFrom} onChange={(event) => setHoursFrom(event.target.value)} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-xs text-muted-foreground">{t('market.jobsForm.hoursToLabel')}</span>
                  <Input type="time" value={hoursTo} onChange={(event) => setHoursTo(event.target.value)} />
                </label>
              </div>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('market.jobsForm.termsHeading')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {MARKET_JOB_TERMS.map((term) => (
                    <Button
                      key={term}
                      type="button"
                      size="sm"
                      variant={terms.includes(term) ? 'secondary' : 'outline'}
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => toggleTerm(term)}
                    >
                      {term}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">{t('market.jobsForm.notesLabel')}</span>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </label>
            </div>
          ) : null}

          <div className="flex justify-center pt-2">
            <Button
              type="button"
              className="min-w-[12rem] rounded-full"
              onClick={() => void onSubmit()}
              disabled={submitting}
              data-testid="market-jobs-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('market.jobsForm.submitting')}
                </>
              ) : (
                t('market.jobsForm.submit')
              )}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

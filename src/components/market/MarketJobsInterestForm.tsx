import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, Loader2, Plus } from 'lucide-react';
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
import { OutlinedField } from '@/components/ui/outlined-field';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryOptions } from '@/lib/countries';
import { detectVisitorLocation } from '@/lib/device-location';
import { listGeoCities, listGeoRegions, type GeoRegionOption } from '@/lib/geo-locations';
import {
  formatMarketJobPayAmount,
  guideMonthlyPayUsd,
  localizeGuideMonthlyPay,
} from '@/lib/market-job-guide-pay';
import {
  ageFromDateOfBirth,
  filterMarketJobTypeOptions,
  formatEnglishOrList,
  MARKET_JOB_ARRANGEMENTS,
  MARKET_JOB_DAYS,
  MARKET_JOB_LEVELS,
  MARKET_JOB_PAY_PERIODS,
  MARKET_JOB_STARTS,
  MARKET_JOB_TERMS,
  MARKET_JOB_TYPE_SEEDS,
  type MarketJobMode,
} from '@/lib/market-job-types';
import {
  defaultMarketJobLanguages,
  filterMarketJobLanguageOptions,
  marketJobLanguageFlagCountry,
  marketJobLanguageLabel,
} from '@/lib/market-job-languages';
import { parseWorkFitJobsQuery } from '@/lib/market-jobs-work-fit-prefill';
import { submitMarketJobInterest } from '@/lib/submit-market-job-interest';
import { agreementsCreatePath } from '@/lib/agreements-model';
import { MarketJobsBoard } from '@/components/market/MarketJobsBoard';
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
  /** Secondary dropdowns stay quieter so job type, place, and pay stay first. */
  emphasis?: 'primary' | 'secondary';
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
  emphasis = 'primary',
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
          data-token-emphasis={emphasis}
          className={cn(
            'ml-0.5 mr-0.5 inline-flex max-w-[min(22rem,calc(100vw-6rem))] items-center rounded-sm border-b border-dashed px-0.5 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            emphasis === 'secondary'
              ? 'border-primary/35 font-normal text-primary/55 hover:border-primary/70 hover:text-primary'
              : 'border-primary/55 font-medium text-primary hover:border-primary',
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

function useCyclingIndex(length: number, enabled: boolean, paused: boolean) {
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
    if (!enabled || paused || preferReducedMotion || length <= 1) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % length);
    }, 1600);
    return () => window.clearInterval(timer);
  }, [enabled, paused, preferReducedMotion, length]);

  return index;
}

function CyclingOptionsLabel({
  options,
  index,
  active,
  fallback,
}: {
  options: readonly string[];
  index: number;
  active: boolean;
  fallback: string;
}) {
  if (!active || options.length === 0) return <>{fallback}</>;
  const label = options[((index % options.length) + options.length) % options.length] ?? fallback;
  return (
    <span className="inline-block min-w-[4.5ch] font-semibold text-primary transition-opacity duration-300" aria-hidden>
      {label}
    </span>
  );
}

function ChoicePanel({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-col p-1">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={cn(
            'rounded-md px-3 py-1.5 text-left text-sm transition-colors hover:bg-primary/10',
            option === value && 'bg-primary/15 font-medium text-primary',
          )}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function MarketJobsInterestForm() {
  const { t, language } = useLanguage();
  const { user, profile, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const workFitPrefill = parseWorkFitJobsQuery(searchParams.toString());
  const isBusiness = isBusinessUsername(profile?.username);
  const isLoggedIn = Boolean(user?.id);
  const showModeTabs = !authLoading && !isLoggedIn;

  const [mode, setMode] = useState<MarketJobMode>(() => (isBusiness ? 'employer' : 'seeker'));
  const [jobTypes, setJobTypes] = useState<string[]>(() => workFitPrefill.jobTypes);
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
  const [payPeriodOpen, setPayPeriodOpen] = useState(false);
  const [payTouched, setPayTouched] = useState(false);
  const locationTouchedRef = useRef(false);

  const [engagement, setEngagement] = useState<string>('Full-time');
  const [engagementOpen, setEngagementOpen] = useState(false);
  const [level, setLevel] = useState<string>('Mid-level');
  const [levelOpen, setLevelOpen] = useState(false);
  const [arrangement, setArrangement] = useState<string>('job');
  const [arrangementOpen, setArrangementOpen] = useState(false);
  const [startWhen, setStartWhen] = useState<string>('Immediately');
  const [startOpen, setStartOpen] = useState(false);

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
  const [languages, setLanguages] = useState<string[]>(() =>
    defaultMarketJobLanguages(language, trimOrEmpty(profile?.country_code)),
  );
  const [languageOpen, setLanguageOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState('');
  const languagesTouchedRef = useRef(false);
  const [notes, setNotes] = useState(() => workFitPrefill.notes);
  const [submitting, setSubmitting] = useState(false);
  const [boardRefreshKey, setBoardRefreshKey] = useState(0);

  const showContact = jobTypes.length > 0;
  const showMoreDetails = isLoggedIn && showContact;
  const languageOptionsForJobs = useMemo(
    () => filterMarketJobLanguageOptions(languageQuery, languages, language),
    [language, languageQuery, languages],
  );
  const showNameField = !trimOrEmpty(fullName);
  const showCompanyField = mode === 'employer' && !trimOrEmpty(companyName);
  const showPhoneField = !trimOrEmpty(phoneNumber);
  const showAgeField = !trimOrEmpty(age);
  const showIdentityFields = showNameField || showCompanyField || showPhoneField || showAgeField;
  const countryOptions = useMemo(() => getCountryOptions(language), [language]);
  const jobOptions = useMemo(() => filterMarketJobTypeOptions(jobQuery, jobTypes), [jobQuery, jobTypes]);
  const selectedJobSet = useMemo(
    () => new Set(jobTypes.map((item) => item.toLowerCase())),
    [jobTypes],
  );
  const pauseJobCycle = jobOpen || jobHovered;
  const jobCycleIndex = useCyclingIndex(
    MARKET_JOB_TYPE_SEEDS.length,
    jobTypes.length === 0,
    pauseJobCycle,
  );
  const displayedJobType =
    jobTypes[jobTypes.length - 1] ??
    MARKET_JOB_TYPE_SEEDS[((jobCycleIndex % MARKET_JOB_TYPE_SEEDS.length) + MARKET_JOB_TYPE_SEEDS.length) % MARKET_JOB_TYPE_SEEDS.length];

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
    if (nextCity || nextRegion || nextCountry) {
      locationTouchedRef.current = true;
    }
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

  useEffect(() => {
    const hasProfilePlace = Boolean(
      trimOrEmpty(profile?.city) || trimOrEmpty(profile?.region_code) || trimOrEmpty(profile?.country_code),
    );
    if (hasProfilePlace || locationTouchedRef.current) return;
    if (trimOrEmpty(city) || trimOrEmpty(countryCode)) return;

    let cancelled = false;
    void detectVisitorLocation()
      .then((detected) => {
        if (cancelled || locationTouchedRef.current) return;
        if (detected.city) setCity(detected.city);
        if (detected.regionCode) setRegionCode(detected.regionCode);
        if (detected.countryCode) {
          setCountryCode(detected.countryCode);
          setPhoneCountryCode((current) => trimOrEmpty(current) || detected.countryCode || 'US');
        }
      })
      .catch(() => {
        /* Keep the placeholder if IP lookup is unavailable. */
      });
    return () => {
      cancelled = true;
    };
  }, [city, countryCode, profile?.city, profile?.country_code, profile?.region_code]);

  useEffect(() => {
    if (payTouched || !displayedJobType) return;
    const localized = localizeGuideMonthlyPay(guideMonthlyPayUsd(displayedJobType), countryCode || 'US');
    setPayAmount(String(localized.value));
    setPayPeriod('Monthly pay');
  }, [countryCode, displayedJobType, payTouched]);

  useEffect(() => {
    if (languagesTouchedRef.current) return;
    setLanguages(defaultMarketJobLanguages(language, countryCode));
  }, [countryCode, language]);

  const locationText = [city, regionCode].filter(Boolean).join(', ');
  const locationEmpty = !city && !regionCode && !countryCode;
  const payNumber = Number(String(payAmount).replace(/[^\d.]/g, ''));
  const payDisplay =
    Number.isFinite(payNumber) && payNumber > 0
      ? formatMarketJobPayAmount(payNumber, countryCode)
      : t('market.jobsForm.payPlaceholder');

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

  const toggleLanguage = (code: string) => {
    languagesTouchedRef.current = true;
    setLanguages((current) =>
      current.includes(code) ? current.filter((item) => item !== code) : [...current, code],
    );
  };

  const markLocationTouched = () => {
    locationTouchedRef.current = true;
  };

  const onSubmit = async () => {
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
      languages: isLoggedIn ? languages : [],
      terms: [engagement, level, arrangement, startWhen],
      notes,
      userId: user?.id ?? null,
      profileId: profile?.id ?? null,
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
    setBoardRefreshKey((current) => current + 1);
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
      {showModeTabs ? (
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
          open={engagementOpen}
          onOpenChange={setEngagementOpen}
          ariaLabel={t('market.jobsForm.engagementLabel')}
          empty={false}
          emphasis="secondary"
          panel={<ChoicePanel options={MARKET_JOB_TERMS} value={engagement} onChange={(next) => { setEngagement(next); setEngagementOpen(false); }} />}
        >
          {engagement}
        </SentenceToken>{' '}
        <SentenceToken
          open={levelOpen}
          onOpenChange={setLevelOpen}
          ariaLabel={t('market.jobsForm.levelLabel')}
          empty={false}
          emphasis="secondary"
          panel={<ChoicePanel options={MARKET_JOB_LEVELS} value={level} onChange={(next) => { setLevel(next); setLevelOpen(false); }} />}
        >
          {level}
        </SentenceToken>{' '}
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
              index={jobCycleIndex}
              active
              fallback={t('market.jobsForm.jobTypePlaceholder')}
            />
          )}
        </SentenceToken>{' '}
        <SentenceToken
          open={arrangementOpen}
          onOpenChange={setArrangementOpen}
          ariaLabel={t('market.jobsForm.arrangementLabel')}
          empty={false}
          emphasis="secondary"
          panel={<ChoicePanel options={MARKET_JOB_ARRANGEMENTS} value={arrangement} onChange={(next) => { setArrangement(next); setArrangementOpen(false); }} />}
        >
          {arrangement}
        </SentenceToken>{' '}
        {t('market.jobsForm.seekerMid')}{' '}
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
                        markLocationTouched();
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
                          markLocationTouched();
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
                          markLocationTouched();
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
        {', '}
        {t('market.jobsForm.startingLead')}{' '}
        <SentenceToken
          open={startOpen}
          onOpenChange={setStartOpen}
          ariaLabel={t('market.jobsForm.startLabel')}
          empty={false}
          emphasis="secondary"
          panel={<ChoicePanel options={MARKET_JOB_STARTS} value={startWhen} onChange={(next) => { setStartWhen(next); setStartOpen(false); }} />}
        >
          {startWhen === 'Immediately' ? t('market.jobsForm.startImmediately') : startWhen}
        </SentenceToken>
        {', '}
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
                onChange={(event) => {
                  setPayTouched(true);
                  setPayAmount(event.target.value);
                }}
                placeholder={t('market.jobsForm.payAmountPlaceholder')}
                inputMode="decimal"
              />
            </div>
          }
        >
          {payDisplay}
        </SentenceToken>{' '}
        <SentenceToken
          open={payPeriodOpen}
          onOpenChange={setPayPeriodOpen}
          ariaLabel={t('market.jobsForm.payPeriodLabel')}
          empty={false}
          emphasis="secondary"
          panel={<ChoicePanel options={MARKET_JOB_PAY_PERIODS} value={payPeriod} onChange={(next) => { setPayTouched(true); setPayPeriod(next); setPayPeriodOpen(false); }} />}
        >
          {payPeriod}
        </SentenceToken>
        .
      </p>

      {showContact ? (
        <div className="space-y-3" data-testid="market-jobs-contact">
          {showIdentityFields ? (
            <div className="flex flex-wrap items-start gap-x-3 gap-y-3 text-sm" data-testid="market-jobs-identity-fields">
              {showNameField ? (
                <OutlinedField
                  className="min-w-[10rem] flex-1"
                  label={t('market.jobsForm.fullNameLabel')}
                  htmlFor="market-jobs-full-name"
                  endAdornment={
                    countryCode ? (
                      <RoundCountryFlag countryCode={countryCode} locale={language} size="sm" />
                    ) : null
                  }
                >
                  <Input
                    id="market-jobs-full-name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    autoComplete="name"
                  />
                </OutlinedField>
              ) : null}
              {showCompanyField ? (
                <OutlinedField
                  className="min-w-[10rem] flex-1"
                  label={t('market.jobsForm.companyLabel')}
                  htmlFor="market-jobs-company"
                >
                  <Input
                    id="market-jobs-company"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    autoComplete="organization"
                  />
                </OutlinedField>
              ) : null}
              {showPhoneField ? (
                <OutlinedField
                  className="min-w-[11rem] flex-1"
                  label={t('market.jobsForm.phoneLabel')}
                  htmlFor="market-jobs-phone"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={phoneCountryCode}
                      onChange={(event) => setPhoneCountryCode(event.target.value.toUpperCase())}
                      className="w-14"
                      aria-label={t('market.jobsForm.phoneCountryLabel')}
                      autoComplete="tel-country-code"
                    />
                    <Input
                      id="market-jobs-phone"
                      value={phoneNumber}
                      onChange={(event) => setPhoneNumber(event.target.value)}
                      autoComplete="tel-national"
                    />
                  </div>
                </OutlinedField>
              ) : null}
              {showAgeField ? (
                <OutlinedField
                  className="w-24"
                  label={t('market.jobsForm.ageLabel')}
                  htmlFor="market-jobs-age"
                >
                  <Input
                    id="market-jobs-age"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    inputMode="numeric"
                  />
                </OutlinedField>
              ) : null}
            </div>
          ) : null}

          {showMoreDetails ? (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => setDetailsOpen((current) => !current)}
              data-testid="market-jobs-more-toggle"
            >
              {detailsOpen ? t('common.less') : t('common.more')}
            </button>
          ) : null}

          {showMoreDetails && detailsOpen ? (
            <div className="space-y-4" data-testid="market-jobs-details">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('market.jobsForm.daysHeading')}
                </p>
                <div className="flex flex-wrap gap-1.5" role="group" aria-label={t('market.jobsForm.daysHeading')}>
                  {MARKET_JOB_DAYS.map((day) => {
                    const selected = days.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        aria-label={day}
                        aria-pressed={selected}
                        className={cn(
                          'h-8 w-8 rounded-full text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected
                            ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                            : 'border border-border text-muted-foreground hover:bg-muted/60',
                        )}
                        onClick={() => toggleDay(day)}
                      >
                        {day.slice(0, 1)}
                      </button>
                    );
                  })}
                </div>
              </div>
              <OutlinedField label={t('market.jobsForm.hoursLabel')} htmlFor="market-jobs-hours-from">
                <div className="flex items-center gap-2">
                  <Input
                    id="market-jobs-hours-from"
                    type="time"
                    value={hoursFrom}
                    onChange={(event) => setHoursFrom(event.target.value)}
                    aria-label={t('market.jobsForm.hoursFromLabel')}
                  />
                  <span className="text-muted-foreground" aria-hidden>
                    –
                  </span>
                  <Input
                    id="market-jobs-hours-to"
                    type="time"
                    value={hoursTo}
                    onChange={(event) => setHoursTo(event.target.value)}
                    aria-label={t('market.jobsForm.hoursToLabel')}
                  />
                </div>
              </OutlinedField>
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('market.jobsForm.languagesHeading')}
                </p>
                <div
                  className="flex flex-wrap items-center gap-1.5"
                  role="group"
                  aria-label={t('market.jobsForm.languagesHeading')}
                >
                  {languages.map((code) => {
                    const flagCountry = marketJobLanguageFlagCountry(code);
                    return (
                      <button
                        key={code}
                        type="button"
                        aria-label={marketJobLanguageLabel(code, language)}
                        aria-pressed
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => toggleLanguage(code)}
                      >
                        {flagCountry ? (
                          <RoundCountryFlag
                            countryCode={flagCountry}
                            locale={language}
                            size="md"
                            className="h-8 w-8"
                          />
                        ) : (
                          <span className="text-[10px] font-semibold uppercase">{code.slice(0, 2)}</span>
                        )}
                      </button>
                    );
                  })}
                  <Popover open={languageOpen} onOpenChange={setLanguageOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-label={t('market.jobsForm.addLanguage')}
                        data-testid="market-jobs-add-language"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[min(18rem,calc(100vw-2rem))] p-0">
                      <Command>
                        <CommandInput
                          value={languageQuery}
                          onValueChange={setLanguageQuery}
                          placeholder={t('market.jobsForm.languageSearch')}
                        />
                        <CommandList>
                          <CommandEmpty>{t('market.jobsForm.languageEmpty')}</CommandEmpty>
                          <CommandGroup>
                            {languageOptionsForJobs.map((option) => {
                              const selected = languages.includes(option.code);
                              return (
                                <CommandItem
                                  key={option.code}
                                  value={`${option.label} ${option.code}`}
                                  onSelect={() => {
                                    toggleLanguage(option.code);
                                    setLanguageQuery('');
                                  }}
                                >
                                  <Check
                                    className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')}
                                    aria-hidden
                                  />
                                  <span className="inline-flex items-center gap-2">
                                    {marketJobLanguageFlagCountry(option.code) ? (
                                      <RoundCountryFlag
                                        countryCode={marketJobLanguageFlagCountry(option.code)}
                                        locale={language}
                                        size="xs"
                                      />
                                    ) : null}
                                    {option.label}
                                  </span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <OutlinedField label={t('market.jobsForm.notesLabel')} htmlFor="market-jobs-notes">
                <Textarea
                  id="market-jobs-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </OutlinedField>
            </div>
          ) : null}

          <div className="flex flex-col items-center gap-3 pt-2">
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
            {profile?.id ? (
              <Button type="button" variant="outline" size="sm" asChild>
                <Link
                  data-testid="market-jobs-employment-agreement"
                  to={agreementsCreatePath({
                    source: 'job',
                    agreementType: 'employment',
                    relatedTitle: formatEnglishOrList(jobTypes),
                    position: formatEnglishOrList(jobTypes),
                    workLocation: locationText || undefined,
                    compensation: payAmount.trim() || undefined,
                    payFrequency: payAmount.trim() ? payPeriod : undefined,
                    employmentStatus: engagement,
                    employmentSelfRole: mode === 'employer' ? 'employer' : 'employee',
                  })}
                >
                  {t('agreements.types.employment')}
                </Link>
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <MarketJobsBoard
        viewerMode={mode}
        jobTypes={jobTypes}
        countryCode={countryCode}
        city={city}
        refreshKey={boardRefreshKey}
      />
    </div>
  );
}

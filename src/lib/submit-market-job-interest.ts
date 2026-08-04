import { supabase } from '@/integrations/supabase/client';
import type { MarketJobMode } from '@/lib/market-job-types';

export type MarketJobInterestPayload = {
  mode: MarketJobMode;
  jobTypes: string[];
  city: string;
  regionCode: string;
  countryCode: string;
  payAmount: string;
  payPeriod: string;
  fullName: string;
  companyName: string;
  phoneCountryCode: string;
  phoneNumber: string;
  age: string;
  days: string[];
  hoursFrom: string;
  hoursTo: string;
  terms: string[];
  notes: string;
  userId: string;
  profileId: string;
};

type InsertResult = { ok: true } | { ok: false; message: string };

export async function submitMarketJobInterest(payload: MarketJobInterestPayload): Promise<InsertResult> {
  const jobTypes = payload.jobTypes.map((item) => item.trim()).filter(Boolean);
  const fullName = payload.fullName.trim();

  if (jobTypes.length === 0) {
    return { ok: false, message: 'Choose at least one job type.' };
  }
  if (!fullName) {
    return { ok: false, message: 'Full name is required.' };
  }
  if (!payload.userId || !payload.profileId) {
    return { ok: false, message: 'Sign in to submit.' };
  }

  const { error } = await supabase.from('market_job_interests' as never).insert({
    mode: payload.mode,
    job_types: jobTypes,
    city: payload.city.trim() || null,
    region_code: payload.regionCode.trim() || null,
    country_code: payload.countryCode.trim() || null,
    pay_amount: payload.mode === 'employer' ? payload.payAmount.trim() || null : null,
    pay_period: payload.mode === 'employer' ? payload.payPeriod.trim() || null : null,
    full_name: fullName,
    company_name: payload.mode === 'employer' ? payload.companyName.trim() || null : null,
    phone_country_code: payload.phoneCountryCode.trim() || null,
    phone_number: payload.phoneNumber.trim() || null,
    age: payload.age.trim() || null,
    days: payload.days,
    hours_from: payload.hoursFrom.trim() || null,
    hours_to: payload.hoursTo.trim() || null,
    terms: payload.terms,
    notes: payload.notes.trim() || null,
    user_id: payload.userId,
    profile_id: payload.profileId,
  } as never);

  if (error) {
    return { ok: false, message: error.message || 'Could not submit your interest.' };
  }

  return { ok: true };
}

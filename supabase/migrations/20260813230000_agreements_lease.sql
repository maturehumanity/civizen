-- Lease Agreement type on the existing agreements identity.

ALTER TABLE public.agreements DROP CONSTRAINT IF EXISTS agreements_type_check;
ALTER TABLE public.agreements
  ADD CONSTRAINT agreements_type_check CHECK (
    agreement_type IS NULL OR agreement_type IN (
      'general', 'mou', 'partnership', 'pilot', 'program', 'funding',
      'employment', 'service_contribution', 'sale_purchase', 'lease', 'data_research', 'nda',
      'amendment', 'other', 'custom',
      'market_core', 'market_product', 'market_service'
    )
  );

CREATE OR REPLACE FUNCTION public.agreement_type_is_allowed(p_type text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_type IN (
    'general', 'mou', 'partnership', 'pilot', 'program', 'funding',
    'employment', 'service_contribution', 'sale_purchase', 'lease', 'data_research', 'nda',
    'amendment', 'other', 'custom', 'market_core', 'market_product', 'market_service'
  );
$$;

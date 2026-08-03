-- Disable peer and marketplace Luma transfers for the strict non-transferable prototype (Option A).
-- Match production Args: amount, from, to, idempotency_key, optional market_listing_id and memo.

DROP FUNCTION IF EXISTS public.transfer_luma_between_profiles(uuid, uuid, bigint, text, text);
DROP FUNCTION IF EXISTS public.transfer_luma_between_profiles(uuid, uuid, bigint, text, uuid, text);
DROP FUNCTION IF EXISTS public.transfer_luma_between_profiles(uuid, uuid, bigint, text, text, text);

CREATE OR REPLACE FUNCTION public.transfer_luma_between_profiles(
  p_from_profile_id uuid,
  p_to_profile_id uuid,
  p_amount_lumens bigint,
  p_idempotency_key text,
  p_market_listing_id uuid DEFAULT NULL,
  p_memo text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Prototype Luma credits are non-transferable: peer and marketplace transfers are disabled';
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_luma_between_profiles(uuid, uuid, bigint, text, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_luma_between_profiles(uuid, uuid, bigint, text, uuid, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.transfer_luma_between_profiles(uuid, uuid, bigint, text, uuid, text) FROM anon;

COMMENT ON FUNCTION public.transfer_luma_between_profiles(uuid, uuid, bigint, text, uuid, text) IS
  'Retired for production use: Luma is a non-transferable prototype demonstration unit.';

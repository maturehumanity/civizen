-- Historical feed reorganization (no content rewrite, no silent new publishes):
-- 1) War/peace post author → Civizen (canonical institutional post).
-- 2) Armen's Aug launch reflection → repost-with-thoughts of Civizen launch post.
-- Timestamps and engagement rows stay on the same post ids.

DO $$
DECLARE
  civizen_id uuid := '1b4e191e-7038-4910-9dee-e63e301e8d12';
  armen_id uuid := '674ec23d-378d-4e08-9414-a7333bdfc110';
  civizen_launch_id uuid := 'e3f07289-4476-4bfd-8a55-c53e0e485fd6';
  armen_launch_id uuid := '930ea2e0-773b-445c-8d0d-f09e8e491a83';
  war_peace_id uuid := '53523ed2-100e-4732-b010-3e64e614ba24';
  armen_launch_created timestamptz;
  existing_repost_id uuid;
BEGIN
  -- Sanity: Civizen launch remains Civizen-authored.
  IF NOT EXISTS (
    SELECT 1
    FROM public.posts
    WHERE id = civizen_launch_id
      AND author_id = civizen_id
  ) THEN
    RAISE EXCEPTION 'Civizen launch post missing or wrong author: %', civizen_launch_id;
  END IF;

  -- 1) Reassign war/peace to Civizen without duplicating the row.
  UPDATE public.posts
  SET author_id = civizen_id
  WHERE id = war_peace_id
    AND author_id = armen_id;

  -- Idempotent if already corrected.
  IF NOT EXISTS (
    SELECT 1
    FROM public.posts
    WHERE id = war_peace_id
      AND author_id = civizen_id
  ) THEN
    RAISE EXCEPTION 'War/peace post missing or could not reassign to Civizen: %', war_peace_id;
  END IF;

  -- 2) Link Armen's existing launch commentary as quote-repost of Civizen launch.
  SELECT created_at
  INTO armen_launch_created
  FROM public.posts
  WHERE id = armen_launch_id
    AND author_id = armen_id;

  IF armen_launch_created IS NULL THEN
    RAISE EXCEPTION 'Armen launch commentary post missing or wrong author: %', armen_launch_id;
  END IF;

  SELECT id
  INTO existing_repost_id
  FROM public.post_reposts
  WHERE reposter_profile_id = armen_id
    AND original_post_id = civizen_launch_id
  LIMIT 1;

  IF existing_repost_id IS NULL THEN
    INSERT INTO public.post_reposts (
      original_post_id,
      reposter_profile_id,
      commentary_post_id,
      created_at
    )
    VALUES (
      civizen_launch_id,
      armen_id,
      armen_launch_id,
      armen_launch_created
    );
  ELSE
    UPDATE public.post_reposts
    SET
      commentary_post_id = armen_launch_id,
      created_at = armen_launch_created
    WHERE id = existing_repost_id;
  END IF;
END $$;

-- Scrub leftover Levela brand tokens from user-visible DB content.
-- Companion to the Civizen rebrand (profiles, linked business names, posts, Nela chat history).

BEGIN;

UPDATE public.profiles
SET
  username = CASE WHEN username = 'biz_levela' THEN 'biz_civizen' ELSE username END,
  full_name = CASE
    WHEN full_name = 'Levela' THEN 'Civizen'
    ELSE replace(replace(full_name, 'Levela', 'Civizen'), 'levela', 'civizen')
  END,
  updated_at = now()
WHERE username ILIKE '%levela%'
   OR coalesce(full_name, '') ILIKE '%levela%';

UPDATE public.linked_accounts
SET
  business_name_normalized = replace(replace(business_name_normalized, 'levela', 'civizen'), 'Levela', 'civizen'),
  updated_at = now()
WHERE coalesce(business_name_normalized, '') ILIKE '%levela%';

UPDATE public.posts
SET
  content = replace(replace(content, 'Levela', 'Civizen'), 'levela', 'civizen'),
  is_edited = true,
  edited_at = now()
WHERE content ILIKE '%levela%';

UPDATE public.private_messages
SET
  content = replace(replace(content, 'Levela', 'Civizen'), 'levela', 'civizen'),
  is_edited = true,
  edited_at = now()
WHERE content ILIKE '%levela%';

UPDATE public.development_stories
SET
  title = replace(replace(title, 'Levela', 'Civizen'), 'levela', 'civizen'),
  rephrased_description = CASE
    WHEN rephrased_description IS NULL THEN NULL
    ELSE replace(replace(rephrased_description, 'Levela', 'Civizen'), 'levela', 'civizen')
  END,
  original_instruction = CASE
    WHEN original_instruction IS NULL THEN NULL
    ELSE replace(replace(original_instruction, 'Levela', 'Civizen'), 'levela', 'civizen')
  END,
  expected_behavior = CASE
    WHEN expected_behavior IS NULL THEN NULL
    ELSE replace(replace(expected_behavior, 'Levela', 'Civizen'), 'levela', 'civizen')
  END
WHERE title ILIKE '%levela%'
   OR coalesce(rephrased_description, '') ILIKE '%levela%'
   OR coalesce(original_instruction, '') ILIKE '%levela%'
   OR coalesce(expected_behavior, '') ILIKE '%levela%';

UPDATE public.law_articles
SET
  label = replace(replace(label, 'Levela', 'Civizen'), 'levela', 'civizen'),
  summary = CASE WHEN summary IS NULL THEN NULL ELSE replace(replace(summary, 'Levela', 'Civizen'), 'levela', 'civizen') END,
  body = CASE WHEN body IS NULL THEN NULL ELSE replace(replace(body, 'Levela', 'Civizen'), 'levela', 'civizen') END,
  updated_at = now()
WHERE coalesce(label, '') ILIKE '%levela%'
   OR coalesce(summary, '') ILIKE '%levela%'
   OR coalesce(body, '') ILIKE '%levela%';

UPDATE public.content_items
SET
  title = replace(replace(title, 'Levela', 'Civizen'), 'levela', 'civizen'),
  body_preview = CASE
    WHEN body_preview IS NULL THEN NULL
    ELSE replace(replace(body_preview, 'Levela', 'Civizen'), 'levela', 'civizen')
  END
WHERE coalesce(title, '') ILIKE '%levela%'
   OR coalesce(body_preview, '') ILIKE '%levela%';

UPDATE public.funders
SET
  legal_name = replace(replace(legal_name, 'Levela', 'Civizen'), 'levela', 'civizen'),
  public_display_name = CASE
    WHEN public_display_name IS NULL THEN NULL
    ELSE replace(replace(public_display_name, 'Levela', 'Civizen'), 'levela', 'civizen')
  END,
  notes = CASE
    WHEN notes IS NULL THEN NULL
    ELSE replace(replace(notes, 'Levela', 'Civizen'), 'levela', 'civizen')
  END,
  updated_at = now()
WHERE coalesce(legal_name, '') ILIKE '%levela%'
   OR coalesce(public_display_name, '') ILIKE '%levela%'
   OR coalesce(notes, '') ILIKE '%levela%';

COMMIT;

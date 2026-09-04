-- Members may own more than one business/organization account.
--
-- The original linked_accounts schema added a unique index on owner_profile_id
-- for relationship_type = 'business'. That was a first-version shortcut
-- ("one org per person"), not a product rule. The Accounts switcher already
-- offers + Add business account, and admin grouping already supports several
-- organizations per owner.
--
-- Pair uniqueness (owner_profile_id, linked_profile_id) and global business
-- name uniqueness (business_name_normalized) remain.

DROP INDEX IF EXISTS public.idx_linked_accounts_owner_business_unique;

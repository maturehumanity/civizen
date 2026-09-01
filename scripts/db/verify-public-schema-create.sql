-- Read-only: untrusted roles must not have CREATE on schema public.
-- Matter SECURITY DEFINER functions use search_path = public; CREATE would allow
-- an application user to shadow unqualified names those functions resolve.
-- Expected: anon, authenticated, authenticator, and PUBLIC have USAGE only.

SELECT n.nspname AS schema,
       r.rolname AS grantee,
       has_schema_privilege(r.oid, n.oid, 'CREATE') AS can_create,
       has_schema_privilege(r.oid, n.oid, 'USAGE') AS can_use
FROM pg_namespace n
CROSS JOIN pg_roles r
WHERE n.nspname = 'public'
  AND r.rolname IN (
    'anon',
    'authenticated',
    'authenticator',
    'dashboard_user',
    'service_role',
    'supabase_auth_admin',
    'supabase_storage_admin',
    'supabase_admin',
    'postgres'
  )
ORDER BY r.rolname;

SELECT nspname, nspacl
FROM pg_namespace
WHERE nspname = 'public';

SELECT r.rolname,
       has_schema_privilege(r.oid, 'public'::regnamespace, 'CREATE') AS can_create
FROM pg_roles r
WHERE has_schema_privilege(r.oid, 'public'::regnamespace, 'CREATE')
ORDER BY r.rolname;

SELECT
  has_schema_privilege('anon', 'public', 'CREATE') AS anon_create,
  has_schema_privilege('authenticated', 'public', 'CREATE') AS authenticated_create,
  has_schema_privilege('authenticator', 'public', 'CREATE') AS authenticator_create;

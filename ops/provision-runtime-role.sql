-- Run as the database owner. This creates a non-login capability role only.
-- Create a separate login with a generated password in the database provider,
-- grant it mycsecpal_runtime, then point DATABASE_URL at that login.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mycsecpal_runtime') THEN
    CREATE ROLE mycsecpal_runtime NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END
$$;

DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO mycsecpal_runtime', current_database());
END
$$;
GRANT USAGE ON SCHEMA public TO mycsecpal_runtime;
REVOKE CREATE ON SCHEMA public FROM mycsecpal_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mycsecpal_runtime;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO mycsecpal_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mycsecpal_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO mycsecpal_runtime;

-- The runtime performs background work as well as learner-scoped work, so it
-- needs data access across rows. Cross-user isolation remains enforced by the
-- application ownership predicates and the disposable authorization suite.
-- This policy is still safer than a BYPASSRLS/owner credential because the
-- runtime cannot alter schemas, policies, roles, extensions, or migrations.
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT n.nspname schema_name, c.relname table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = target.schema_name
        AND tablename = target.table_name
        AND policyname = 'runtime_server_access'
    ) THEN
      EXECUTE format(
        'CREATE POLICY runtime_server_access ON %I.%I TO mycsecpal_runtime USING (true) WITH CHECK (true)',
        target.schema_name,
        target.table_name
      );
    END IF;
  END LOOP;
END
$$;

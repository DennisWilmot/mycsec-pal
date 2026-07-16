# Runtime database-role cutover

The configured application connection currently uses a role that bypasses RLS. Application queries include profile ownership predicates, but the credential has more authority than the deployed server requires.

## Safe cutover

1. Run `ops/provision-runtime-role.sql` as the database owner in the Supabase SQL editor.
2. Create a separate login with a randomly generated password. Do not put the password in the SQL file or repository.
3. Grant `mycsecpal_runtime` to that login.
4. Set a connection limit appropriate to the deployment and a statement timeout, for example 15 seconds.
5. Put the transaction-pooler URL for the new login into a staging deployment's `DATABASE_URL`.
6. Run `npm run db:security:check`, the cross-user authorization suite, a complete Paper 1 and Paper 2 attempt, marking retry, billing webhook test, and the operations page.
7. Only after staging passes, rotate production `DATABASE_URL` to the runtime login. Retain the owner credential solely for migrations and seeding.

The runtime role deliberately cannot create schemas, tables, functions, policies, roles, or migrations. It can read and mutate application rows because the same runtime performs learner requests and background marking. Cross-user isolation therefore remains dependent on ownership predicates and the authorization test suite; a future architecture should split learner-request and background-worker credentials.

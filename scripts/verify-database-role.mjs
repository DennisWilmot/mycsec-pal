import { getDatabaseClient } from "../lib/db/index.ts";

const sql = getDatabaseClient();
try {
  const [role] = await sql`
    select current_user role_name, r.rolsuper superuser, r.rolbypassrls bypasses_rls,
      has_schema_privilege(current_user, 'public', 'create') can_create_schema_objects
    from pg_roles r where r.rolname = current_user
  `;
  const issues = [];
  if (role.superuser) issues.push("runtime role is a superuser");
  if (role.bypasses_rls) issues.push("runtime role bypasses RLS");
  if (role.can_create_schema_objects) issues.push("runtime role can create objects in public schema");
  console.log(JSON.stringify({ valid: issues.length === 0, role, issues }, null, 2));
  if (issues.length) process.exitCode = 1;
} finally {
  await sql.end();
}

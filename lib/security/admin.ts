type AuthenticatedIdentity = { id: string; email?: string | null };

function configuredValues(name: string) {
  return new Set((process.env[name] ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function isOperationsAdmin(user: AuthenticatedIdentity) {
  const ids = configuredValues("ADMIN_USER_IDS");
  const emails = configuredValues("ADMIN_EMAILS");
  return ids.has(user.id.toLowerCase()) || Boolean(user.email && emails.has(user.email.toLowerCase()));
}

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDatabase } from "@/lib/db";
import { consents, institutions, profileSubjects, profiles, subjects } from "@/drizzle/schema";

export const FREE_SUBJECT_LIMIT = 5;
const normaliseInstitutionName = (name: string) => name.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");

export async function readProfile(profileId: string) {
  const db = getDatabase();
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, profileId)).limit(1);
  if (!profile) return null;

  const selectedSubjects = await db
    .select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      cardAssetUrl: subjects.cardAssetUrl,
      sortOrder: profileSubjects.sortOrder,
    })
    .from(profileSubjects)
    .innerJoin(subjects, eq(profileSubjects.subjectId, subjects.id))
    .where(and(eq(profileSubjects.profileId, profileId), eq(profileSubjects.isActive, true)))
    .orderBy(asc(profileSubjects.sortOrder));

  const [institution] = profile.institutionId
    ? await db.select({ id: institutions.id, name: institutions.name, countryCode: institutions.countryCode })
      .from(institutions).where(eq(institutions.id, profile.institutionId)).limit(1)
    : [];

  return { ...profile, institution: institution ?? null, subjects: selectedSubjects };
}

export async function replaceProfileSubjects(profileId: string, subjectIds: string[]) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    // Serialize concurrent subject changes for this learner before checking the cap.
    const [profile] = await tx
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .for("update")
      .limit(1);
    if (!profile) return { kind: "profile_not_found" as const };
    if (subjectIds.length > FREE_SUBJECT_LIMIT) return { kind: "limit" as const };

    const available = await tx
      .select({ id: subjects.id })
      .from(subjects)
      .where(inArray(subjects.id, subjectIds));
    if (available.length !== subjectIds.length) {
      return { kind: "invalid_subject" as const };
    }

    await tx
      .update(profileSubjects)
      .set({ isActive: false })
      .where(eq(profileSubjects.profileId, profileId));

    if (subjectIds.length) {
      await tx.insert(profileSubjects).values(
        subjectIds.map((subjectId, sortOrder) => ({ profileId, subjectId, sortOrder, isActive: true })),
      ).onConflictDoUpdate({
        target: [profileSubjects.profileId, profileSubjects.subjectId],
        set: { isActive: true },
      });

      // Keep ordering deterministic; onConflictDoUpdate cannot reference each input row's sort order.
      await Promise.all(subjectIds.map((subjectId, sortOrder) => tx
        .update(profileSubjects)
        .set({ sortOrder })
        .where(and(eq(profileSubjects.profileId, profileId), eq(profileSubjects.subjectId, subjectId)))));
    }

    return { kind: "ok" as const, subjectIds };
  });
}

export async function createProfileWithConsents(args: {
  id: string;
  displayName: string;
  termsVersion: string;
  privacyVersion: string;
}) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [profile] = await tx.insert(profiles).values({
      id: args.id,
      displayName: args.displayName,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: { displayName: args.displayName, updatedAt: new Date() },
    }).returning();

    await tx.insert(consents).values([
      { profileId: args.id, documentType: "terms_of_use", documentVersion: args.termsVersion },
      { profileId: args.id, documentType: "privacy_policy", documentVersion: args.privacyVersion },
    ]).onConflictDoNothing();

    return profile;
  });
}

export async function updateProfile(args: {
  id: string;
  displayName?: string;
  phone?: string | null;
  role?: "student" | "teacher" | "parent";
  countryCode?: string | null;
  gradeForm?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
}) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const [current] = await tx.select().from(profiles).where(eq(profiles.id, args.id)).for("update").limit(1);
    if (!current) return { kind: "profile_not_found" as const };

    const countryCode = args.countryCode === undefined ? current.countryCode : args.countryCode;
    let institutionId = args.institutionId === undefined ? current.institutionId : args.institutionId;
    if (args.institutionName) {
      if (!countryCode) return { kind: "country_required" as const };
      const displayName = args.institutionName.trim().replace(/\s+/g, " ");
      const normalisedName = normaliseInstitutionName(displayName);
      const [existing] = await tx.select({ id: institutions.id }).from(institutions).where(and(
        eq(institutions.countryCode, countryCode),
        eq(institutions.normalizedName, normalisedName),
      )).limit(1);
      if (existing) institutionId = existing.id;
      else {
        const [created] = await tx.insert(institutions).values({ name: displayName, normalizedName: normalisedName, countryCode })
          .onConflictDoUpdate({
            target: [institutions.countryCode, institutions.normalizedName],
            set: { name: displayName, updatedAt: new Date() },
          }).returning({ id: institutions.id });
        institutionId = created.id;
      }
    } else if (institutionId) {
      const [institution] = await tx.select({ id: institutions.id }).from(institutions).where(and(
        eq(institutions.id, institutionId),
        ...(countryCode ? [eq(institutions.countryCode, countryCode)] : []),
      )).limit(1);
      if (!institution) return { kind: "invalid_institution" as const };
    }

    const { institutionName: _institutionName, ...updates } = args;
    const [profile] = await tx.update(profiles).set({
      ...updates,
      institutionId,
      updatedAt: new Date(),
    }).where(eq(profiles.id, args.id)).returning();
    return { kind: "ok" as const, profile };
  });
}

export async function completeOnboarding(args: {
  id: string;
  displayName: string;
  role: "student" | "teacher" | "parent";
  countryCode: string;
  gradeForm?: string | null;
  phone?: string | null;
  institutionId?: string | null;
  institutionName?: string | null;
  subjectIds: string[];
  termsVersion: string;
  privacyVersion: string;
  couponCode?: string;
}) {
  const db = getDatabase();
  return db.transaction(async (tx) => {
    const normalizedCoupon = args.couponCode?.trim().toLocaleLowerCase("en") || null;
    let promotion: { id: string; name: string; duration_days: number; daily_attempt_limit: number } | null = null;
    if (normalizedCoupon) {
      const promotionResult = await tx.execute(sql`
        select id, name, duration_days, daily_attempt_limit
        from promotion_codes
        where code = ${normalizedCoupon}
          and active = true
          and (starts_at is null or starts_at <= now())
          and (ends_at is null or ends_at > now())
        limit 1
      `);
      promotion = (promotionResult[0] as typeof promotion | undefined) ?? null;
      if (!promotion) return { kind: "invalid_coupon" as const };
    }
    if (args.subjectIds.length > FREE_SUBJECT_LIMIT) return { kind: "limit" as const };
    const available = await tx.select({ id: subjects.id }).from(subjects).where(inArray(subjects.id, args.subjectIds));
    if (available.length !== args.subjectIds.length) return { kind: "invalid_subject" as const };
    let institutionId = args.institutionId ?? null;
    if (institutionId) {
      const [institution] = await tx.select({ id: institutions.id }).from(institutions)
        .where(and(eq(institutions.id, institutionId), eq(institutions.countryCode, args.countryCode))).limit(1);
      if (!institution) return { kind: "invalid_institution" as const };
    } else if (args.institutionName) {
      const displayName = args.institutionName.trim().replace(/\s+/g, " ");
      const normalisedName = normaliseInstitutionName(displayName);
      const [existing] = await tx.select({ id: institutions.id }).from(institutions).where(and(
        eq(institutions.countryCode, args.countryCode),
        eq(institutions.normalizedName, normalisedName),
      )).limit(1);
      if (existing) {
        institutionId = existing.id;
      } else {
        const [created] = await tx.insert(institutions).values({
          name: displayName,
          normalizedName: normalisedName,
          countryCode: args.countryCode,
          institutionType: "school",
        }).onConflictDoUpdate({
          target: [institutions.countryCode, institutions.normalizedName],
          set: { name: displayName, updatedAt: new Date() },
        }).returning({ id: institutions.id });
        institutionId = created.id;
      }
    }

    const [profile] = await tx.insert(profiles).values({
      id: args.id,
      displayName: args.displayName,
      role: args.role,
      countryCode: args.countryCode,
      gradeForm: args.gradeForm ?? null,
      phone: args.phone ?? null,
      institutionId,
      onboardingCompletedAt: new Date(),
    }).onConflictDoUpdate({
      target: profiles.id,
      set: {
        displayName: args.displayName,
        role: args.role,
        countryCode: args.countryCode,
        gradeForm: args.gradeForm ?? null,
        phone: args.phone ?? null,
        institutionId,
        onboardingCompletedAt: new Date(),
        updatedAt: new Date(),
      },
    }).returning();

    await tx.insert(consents).values([
      { profileId: args.id, documentType: "terms_of_use", documentVersion: args.termsVersion },
      { profileId: args.id, documentType: "privacy_policy", documentVersion: args.privacyVersion },
    ]).onConflictDoNothing();

    await tx.update(profileSubjects).set({ isActive: false }).where(eq(profileSubjects.profileId, args.id));
    await tx.insert(profileSubjects).values(args.subjectIds.map((subjectId, sortOrder) => ({
      profileId: args.id,
      subjectId,
      sortOrder,
      isActive: true,
    }))).onConflictDoUpdate({
      target: [profileSubjects.profileId, profileSubjects.subjectId],
      set: { isActive: true },
    });
    await Promise.all(args.subjectIds.map((subjectId, sortOrder) => tx.update(profileSubjects)
      .set({ sortOrder })
      .where(and(eq(profileSubjects.profileId, args.id), eq(profileSubjects.subjectId, subjectId)))));

    let betaAccess: { name: string; dailyAttemptLimit: number; expiresAt: string } | null = null;
    if (promotion) {
      const existing = await tx.execute(sql`
        select expires_at from promotion_redemptions
        where promotion_code_id = ${promotion.id} and profile_id = ${args.id}
        limit 1
      `);
      let expiresAt = existing[0]?.expires_at ? new Date(String(existing[0].expires_at)).toISOString() : null;
      if (!expiresAt) {
        expiresAt = new Date(Date.now() + Number(promotion.duration_days) * 24 * 60 * 60 * 1000).toISOString();
        await tx.execute(sql`
          insert into promotion_redemptions (promotion_code_id, profile_id, expires_at)
          values (${promotion.id}, ${args.id}, ${expiresAt})
          on conflict (promotion_code_id, profile_id) do nothing
        `);
      }
      betaAccess = { name: promotion.name, dailyAttemptLimit: Number(promotion.daily_attempt_limit), expiresAt };
    }

    return { kind: "ok" as const, profile, betaAccess };
  });
}

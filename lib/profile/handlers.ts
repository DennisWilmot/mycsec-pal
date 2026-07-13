import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";
import { apiError, parseJson, serverError, validationError } from "@/lib/api/responses";
import {
  completeOnboardingSchema,
  createOnboardingProfileSchema,
  profilePatchSchema,
  subjectSelectionSchema,
} from "./validation";
import {
  completeOnboarding,
  createProfileWithConsents,
  FREE_SUBJECT_LIMIT,
  readProfile,
  replaceProfileSubjects,
  updateProfile,
} from "./service";

function publicIdentity(user: Awaited<ReturnType<typeof requireAuthenticatedUser>>["user"]) {
  const hasGoogleIdentity = user.identities?.some((identity) => identity.provider === "google") ?? false;
  return {
    email: user.email ?? null,
    avatarUrl: hasGoogleIdentity
      ? (user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null)
      : null,
  };
}

export async function handleGetProfile() {
  try {
    const { user } = await requireAuthenticatedUser();
    const profile = await readProfile(user.id);
    if (!profile) return apiError(404, "PROFILE_NOT_FOUND", "Finish setting up your profile first.");
    return NextResponse.json({ data: { ...profile, ...publicIdentity(user), subjectLimit: FREE_SUBJECT_LIMIT } });
  } catch (error) {
    return serverError(error);
  }
}

export async function handleCreateProfile(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = createOnboardingProfileSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);
    const profile = await createProfileWithConsents({ id: user.id, ...parsed.data });
    return NextResponse.json({ data: { ...profile, ...publicIdentity(user) } }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}

export async function handlePatchProfile(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = profilePatchSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);

    const result = await updateProfile({ id: user.id, ...parsed.data });
    if (result.kind === "profile_not_found") return apiError(404, "PROFILE_NOT_FOUND", "Finish setting up your profile first.");
    if (result.kind === "country_required") return apiError(422, "VALIDATION_ERROR", "Choose a country for this institution.", {
      countryCode: ["Choose a country before entering an institution."],
    });
    if (result.kind === "invalid_institution") return apiError(422, "VALIDATION_ERROR", "Choose a valid institution.", {
      institutionId: ["The institution must match the selected country."],
    });
    const profile = await readProfile(user.id);
    return NextResponse.json({ data: { ...profile, ...publicIdentity(user) } });
  } catch (error) {
    return serverError(error);
  }
}

export async function handlePutSubjects(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = subjectSelectionSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);
    const result = await replaceProfileSubjects(user.id, parsed.data.subjectIds);
    if (result.kind === "profile_not_found") return apiError(404, "PROFILE_NOT_FOUND", "Finish setting up your profile first.");
    if (result.kind === "limit") return apiError(422, "SUBJECT_LIMIT_EXCEEDED", "You can select up to five subjects.", {
      subjectIds: ["Remove a subject before adding another."],
    });
    if (result.kind === "invalid_subject") return apiError(422, "VALIDATION_ERROR", "One or more subjects are unavailable.", {
      subjectIds: ["Choose subjects from the available catalogue."],
    });
    const profile = await readProfile(user.id);
    return NextResponse.json({ data: { subjects: profile?.subjects ?? [], subjectLimit: FREE_SUBJECT_LIMIT } });
  } catch (error) {
    return serverError(error);
  }
}

export async function handleCompleteOnboarding(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const json = await parseJson(request);
    if (json.response) return json.response;
    const parsed = completeOnboardingSchema.safeParse(json.data);
    if (!parsed.success) return validationError(parsed.error);
    const result = await completeOnboarding({ id: user.id, ...parsed.data });
    if (result.kind === "limit") return apiError(422, "SUBJECT_LIMIT_EXCEEDED", "You can select up to five subjects.", {
      subjectIds: ["Remove a subject before continuing."],
    });
    if (result.kind === "invalid_subject") return apiError(422, "VALIDATION_ERROR", "One or more subjects are unavailable.", {
      subjectIds: ["Choose subjects from the available catalogue."],
    });
    if (result.kind === "invalid_institution") return apiError(422, "VALIDATION_ERROR", "The institution does not match the selected country.", {
      institutionId: ["Choose an institution in the selected country."],
    });
    const profile = await readProfile(user.id);
    return NextResponse.json({ data: { profile: { ...profile, ...publicIdentity(user) } } });
  } catch (error) {
    return serverError(error);
  }
}

import { z } from "zod";

export const PROFILE_ROLES = ["student", "teacher", "parent"] as const;

// ISO 3166-1 alpha-2 codes for the Caribbean markets supported at launch.
export const SUPPORTED_COUNTRIES = [
  "AG", "BS", "BB", "BZ", "DM", "DO", "GD", "GY", "HT", "JM", "KN", "LC", "SR", "TT", "VC",
] as const;

const shortText = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const createOnboardingProfileSchema = z.object({
  displayName: shortText("Full name", 120),
  termsVersion: shortText("Terms version", 40),
  privacyVersion: shortText("Privacy version", 40),
}).strict();

export const profilePatchSchema = z.object({
  displayName: shortText("Full name", 120).optional(),
  phone: z.string().trim().max(32, "Phone number is too long.").nullable().optional(),
  role: z.enum(PROFILE_ROLES, { message: "Choose student, teacher or parent." }).optional(),
  countryCode: z.enum(SUPPORTED_COUNTRIES, { message: "Choose a supported Caribbean country." }).nullable().optional(),
  gradeForm: z.string().trim().max(64, "Grade or form is too long.").nullable().optional(),
  institutionId: z.uuid("Choose a valid institution.").nullable().optional(),
  institutionName: z.string().trim().min(2, "Enter your school or institution.")
    .max(180, "Institution name is too long.").nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "Provide at least one field to update.",
}).refine((value) => !(value.institutionId && value.institutionName), {
  path: ["institutionName"],
  message: "Choose an institution or enter its name, not both.",
});

export const subjectSelectionSchema = z.object({
  subjectIds: z.array(z.uuid("Each subject must have a valid ID."))
    .min(1, "Choose at least one subject.")
    .max(5, "You can select up to five subjects on the current plan."),
}).strict().refine((value) => new Set(value.subjectIds).size === value.subjectIds.length, {
  path: ["subjectIds"],
  message: "Each subject can only be selected once.",
});

export const completeOnboardingSchema = createOnboardingProfileSchema.extend({
  role: z.enum(PROFILE_ROLES, { message: "Choose student, teacher or parent." }),
  countryCode: z.enum(SUPPORTED_COUNTRIES, { message: "Choose a supported Caribbean country." }),
  gradeForm: z.string().trim().max(64, "Grade or form is too long.").nullable().optional(),
  phone: z.string().trim().max(32, "Phone number is too long.").nullable().optional(),
  institutionId: z.uuid("Choose a valid institution.").nullable().optional(),
  institutionName: z.string().trim().min(2, "Enter your school or institution.")
    .max(180, "Institution name is too long.").nullable().optional(),
  subjectIds: z.array(z.uuid("Each subject must have a valid ID."))
    .min(1, "Choose at least one subject.")
    .max(5, "You can select up to five subjects on the current plan."),
}).strict().superRefine((value, context) => {
  if (value.role === "student" && !value.gradeForm?.trim()) {
    context.addIssue({ code: "custom", path: ["gradeForm"], message: "Enter your grade or form." });
  }
  if (new Set(value.subjectIds).size !== value.subjectIds.length) {
    context.addIssue({ code: "custom", path: ["subjectIds"], message: "Each subject can only be selected once." });
  }
  if (value.institutionId && value.institutionName) {
    context.addIssue({ code: "custom", path: ["institutionName"], message: "Choose an institution or enter its name, not both." });
  }
});

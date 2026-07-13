import { handleCreateProfile, handlePatchProfile } from "@/lib/profile/handlers";

export const dynamic = "force-dynamic";
export const POST = handleCreateProfile;
export const PATCH = handlePatchProfile;

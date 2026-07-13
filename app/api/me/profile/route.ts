import { handleGetProfile, handlePatchProfile } from "@/lib/profile/handlers";

export const dynamic = "force-dynamic";
export const GET = handleGetProfile;
export const PATCH = handlePatchProfile;

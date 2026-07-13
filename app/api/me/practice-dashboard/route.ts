import { NextResponse } from "next/server";
import { apiError, serverError } from "@/lib/api/responses";
import { readPracticeDashboard } from "@/lib/practice/dashboard";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await requireAuthenticatedUser();
    const dashboard = await readPracticeDashboard(user.id);
    if (!dashboard) {
      return apiError(404, "PROFILE_NOT_FOUND", "Finish setting up your profile first.");
    }
    return NextResponse.json({ data: dashboard });
  } catch (error) {
    return serverError(error);
  }
}

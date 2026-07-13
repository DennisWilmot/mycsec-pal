import { NextResponse } from "next/server";
import { apiError, serverError } from "@/lib/api/responses";
import { readProgressDashboard } from "@/lib/progress/service";
import { requireAuthenticatedUser } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user } = await requireAuthenticatedUser();
    const subjectId = new URL(request.url).searchParams.get("subjectId");
    const data = await readProgressDashboard(user.id, subjectId);
    if (subjectId && data.scope.subjectId !== subjectId) return apiError(404, "SUBJECT_NOT_FOUND", "This subject is not in your profile.");
    return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return serverError(error);
  }
}

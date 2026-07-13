import { handleGetActiveAttempt } from "@/lib/attempts/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = handleGetActiveAttempt;

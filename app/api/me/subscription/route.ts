import { NextResponse } from "next/server";
import { requireAuthenticatedUser, isAuthenticationRequiredError } from "@/lib/supabase/auth";
import { getDatabaseClient } from "@/lib/db";
import { apiError } from "@/lib/api/responses";
export const dynamic="force-dynamic";
export async function GET(){try{const{user}=await requireAuthenticatedUser();const sql=getDatabaseClient();const[row]=await sql`select status,stripe_price_id,current_period_end,cancel_at_period_end from subscriptions where profile_id=${user.id}::uuid order by updated_at desc limit 1`;return NextResponse.json({data:{plan:row&&["active","trialing"].includes(String(row.status))?"practice":"guest",subscription:row??null}});}catch(error){if(isAuthenticationRequiredError(error))return apiError(401,error.code,error.message);return apiError(500,"INTERNAL_ERROR","Could not load subscription.");}}

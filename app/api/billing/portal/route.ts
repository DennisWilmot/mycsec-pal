import { NextResponse } from "next/server";
import { requireAuthenticatedUser, isAuthenticationRequiredError } from "@/lib/supabase/auth";
import { getDatabaseClient } from "@/lib/db";
import { applicationUrl, getStripe } from "@/lib/billing/stripe";
import { apiError } from "@/lib/api/responses";
export async function POST(){try{const{user}=await requireAuthenticatedUser();const sql=getDatabaseClient();const[row]=await sql<{stripe_customer_id:string}[]>`select stripe_customer_id from billing_customers where profile_id=${user.id}::uuid`;if(!row)return apiError(404,"NO_BILLING_ACCOUNT","No billing account exists yet.");const session=await getStripe().billingPortal.sessions.create({customer:row.stripe_customer_id,return_url:`${applicationUrl()}/settings`});return NextResponse.json({data:{url:session.url}});}catch(error){if(isAuthenticationRequiredError(error))return apiError(401,error.code,error.message);console.error("billing.portal.failed",error);return apiError(500,"BILLING_ERROR","Could not open billing management.");}}

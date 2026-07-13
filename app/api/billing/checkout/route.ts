import { NextResponse } from "next/server";
import { requireAuthenticatedUser, isAuthenticationRequiredError } from "@/lib/supabase/auth";
import { getDatabaseClient } from "@/lib/db";
import { applicationUrl, getStripe } from "@/lib/billing/stripe";
import { apiError } from "@/lib/api/responses";

export async function POST() { try {
  const { user }=await requireAuthenticatedUser(); const price=process.env.STRIPE_PRICE_PRACTICE || process.env.STRIPE_PRICE_PRO;
  if(!price) return apiError(503,"BILLING_NOT_CONFIGURED","Billing is not configured yet.");
  const sql=getDatabaseClient(); const [existing]=await sql<{stripe_customer_id:string}[]>`select stripe_customer_id from billing_customers where profile_id=${user.id}::uuid`;
  const stripe=getStripe(); let customerId=existing?.stripe_customer_id;
  if(!customerId){const customer=await stripe.customers.create({email:user.email,metadata:{profileId:user.id}});customerId=customer.id;await sql`insert into billing_customers(profile_id,stripe_customer_id) values(${user.id}::uuid,${customerId}) on conflict(profile_id) do update set stripe_customer_id=excluded.stripe_customer_id,updated_at=now()`;}
  const session=await stripe.checkout.sessions.create({mode:"subscription",customer:customerId,line_items:[{price,quantity:1}],client_reference_id:user.id,metadata:{plan:"practice"},subscription_data:{metadata:{profileId:user.id,plan:"practice"}},success_url:`${applicationUrl()}/settings?billing=success`,cancel_url:`${applicationUrl()}/settings?billing=cancelled`});
  return NextResponse.json({data:{url:session.url}});
} catch(error){if(isAuthenticationRequiredError(error)) return apiError(401,error.code,error.message);console.error("billing.checkout.failed",error);return apiError(500,"BILLING_ERROR","Could not start checkout.");} }

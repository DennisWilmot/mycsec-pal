import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedUser, isAuthenticationRequiredError } from "@/lib/supabase/auth";
import { getDatabaseClient } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import { ACCESS_STATUSES, newestRelevantSubscription, persistStripeSubscription } from "@/lib/billing/subscriptions";
import { apiError } from "@/lib/api/responses";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest){try{const{user}=await requireAuthenticatedUser();const sql=getDatabaseClient();const stripe=process.env.STRIPE_SECRET_KEY?getStripe():null;const checkoutSessionId=request.nextUrl.searchParams.get("checkoutSessionId");
  if(checkoutSessionId){
    if(!stripe)return apiError(503,"BILLING_NOT_CONFIGURED","Billing reconciliation is not configured.");
    const session=await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const sessionProfileId=session.client_reference_id||session.metadata?.profileId;
    if(sessionProfileId!==user.id)return apiError(403,"BILLING_SESSION_MISMATCH","This checkout session belongs to another account.");
    const customerId=typeof session.customer==="string"?session.customer:null;
    if(customerId)await sql`insert into billing_customers(profile_id,stripe_customer_id) values(${user.id}::uuid,${customerId}) on conflict(profile_id) do update set stripe_customer_id=excluded.stripe_customer_id,updated_at=now()`;
    if(typeof session.subscription==="string"){
      const completedSubscription=await stripe.subscriptions.retrieve(session.subscription);
      await persistStripeSubscription(sql,user.id,completedSubscription);
    }
  }
  let[row]=await sql`select status,stripe_price_id,current_period_end,cancel_at_period_end from subscriptions where profile_id=${user.id}::uuid order by updated_at desc limit 1`;
  if(!row||!ACCESS_STATUSES.has(String(row.status))){
    const[customer]=await sql<{stripe_customer_id:string}[]>`select stripe_customer_id from billing_customers where profile_id=${user.id}::uuid`;
    if(customer?.stripe_customer_id&&stripe){
      const remote=await stripe.subscriptions.list({customer:customer.stripe_customer_id,status:"all",limit:100});
      const current=newestRelevantSubscription(remote.data);
      if(current){await persistStripeSubscription(sql,user.id,current);[row]=await sql`select status,stripe_price_id,current_period_end,cancel_at_period_end from subscriptions where stripe_subscription_id=${current.id} limit 1`;}
    }
  }
  return NextResponse.json({data:{plan:row&&ACCESS_STATUSES.has(String(row.status))?"practice":"guest",subscription:row??null}});
}catch(error){if(isAuthenticationRequiredError(error))return apiError(401,error.code,error.message);console.error("billing.subscription_sync.failed",error);return apiError(500,"INTERNAL_ERROR","Could not load subscription.");}}

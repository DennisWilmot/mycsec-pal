import { NextResponse } from "next/server";
import { requireAuthenticatedUser, isAuthenticationRequiredError } from "@/lib/supabase/auth";
import { getDatabaseClient } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import { ACCESS_STATUSES, newestRelevantSubscription, persistStripeSubscription } from "@/lib/billing/subscriptions";
import { apiError } from "@/lib/api/responses";
export const dynamic="force-dynamic";
export async function GET(){try{const{user}=await requireAuthenticatedUser();const sql=getDatabaseClient();let[row]=await sql`select status,stripe_price_id,current_period_end,cancel_at_period_end from subscriptions where profile_id=${user.id}::uuid order by updated_at desc limit 1`;
  if(!row||!ACCESS_STATUSES.has(String(row.status))){
    const[customer]=await sql<{stripe_customer_id:string}[]>`select stripe_customer_id from billing_customers where profile_id=${user.id}::uuid`;
    if(customer?.stripe_customer_id&&process.env.STRIPE_SECRET_KEY){
      const remote=await getStripe().subscriptions.list({customer:customer.stripe_customer_id,status:"all",limit:100});
      const current=newestRelevantSubscription(remote.data);
      if(current){await persistStripeSubscription(sql,user.id,current);[row]=await sql`select status,stripe_price_id,current_period_end,cancel_at_period_end from subscriptions where stripe_subscription_id=${current.id} limit 1`;}
    }
  }
  return NextResponse.json({data:{plan:row&&ACCESS_STATUSES.has(String(row.status))?"practice":"guest",subscription:row??null}});
}catch(error){if(isAuthenticationRequiredError(error))return apiError(401,error.code,error.message);console.error("billing.subscription_sync.failed",error);return apiError(500,"INTERNAL_ERROR","Could not load subscription.");}}

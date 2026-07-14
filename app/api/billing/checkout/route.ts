import { NextResponse } from "next/server";
import { requireAuthenticatedUser, isAuthenticationRequiredError } from "@/lib/supabase/auth";
import { getDatabaseClient } from "@/lib/db";
import { applicationUrl, getStripe } from "@/lib/billing/stripe";
import { newestRelevantSubscription, persistStripeSubscription } from "@/lib/billing/subscriptions";
import { apiError } from "@/lib/api/responses";

export async function POST() { try {
  const { user }=await requireAuthenticatedUser(); const price=process.env.STRIPE_PRICE_PRACTICE || process.env.STRIPE_PRICE_PRO;
  if(!price) return apiError(503,"BILLING_NOT_CONFIGURED","Billing is not configured yet.");
  const sql=getDatabaseClient(); const [existing]=await sql<{stripe_customer_id:string}[]>`select stripe_customer_id from billing_customers where profile_id=${user.id}::uuid`;
  const stripe=getStripe(); let customerId=existing?.stripe_customer_id;
  if(!customerId){const customer=await stripe.customers.create({email:user.email,metadata:{profileId:user.id}});customerId=customer.id;await sql`insert into billing_customers(profile_id,stripe_customer_id) values(${user.id}::uuid,${customerId}) on conflict(profile_id) do update set stripe_customer_id=excluded.stripe_customer_id,updated_at=now()`;}
  const stripeSubscriptions=await stripe.subscriptions.list({customer:customerId,status:"all",limit:100});
  const currentSubscription=newestRelevantSubscription(stripeSubscriptions.data);
  if(currentSubscription){
    await persistStripeSubscription(sql,user.id,currentSubscription);
    const portal=await stripe.billingPortal.sessions.create({customer:customerId,return_url:`${applicationUrl()}/settings`});
    return NextResponse.json({data:{url:portal.url,alreadySubscribed:true}});
  }
  const openSessions=await stripe.checkout.sessions.list({customer:customerId,status:"open",limit:20});
  const existingSession=openSessions.data.find((candidate)=>candidate.mode==="subscription"&&candidate.metadata?.plan==="practice"&&candidate.metadata?.priceId===price&&candidate.metadata?.brandingVersion==="mycsecpal-v1");
  if(existingSession?.url)return NextResponse.json({data:{url:existingSession.url,reused:true}});
  const appUrl=applicationUrl();
  const session=await stripe.checkout.sessions.create({
    mode:"subscription",
    customer:customerId,
    line_items:[{price,quantity:1}],
    client_reference_id:user.id,
    metadata:{plan:"practice",priceId:price,brandingVersion:"mycsecpal-v1"},
    subscription_data:{metadata:{profileId:user.id,plan:"practice"}},
    branding_settings:{
      display_name:"MyCSECPal",
      logo:{type:"url",url:`${appUrl}/assets/brand/mycsecpal-logo.png`},
      background_color:"#FFFCF5",
      button_color:"#1A1815",
      border_style:"rounded",
      font_family:"lato",
    },
    custom_text:{
      submit:{message:"MyCSECPal is a learning product operated by Pelagic Systems, LLC. Your subscription includes unlimited Paper 1 and Paper 2 practice attempts for up to five subjects."},
    },
    success_url:`${appUrl}/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:`${appUrl}/settings?billing=cancelled`,
  });
  return NextResponse.json({data:{url:session.url}});
} catch(error){if(isAuthenticationRequiredError(error)) return apiError(401,error.code,error.message);console.error("billing.checkout.failed",error);return apiError(500,"BILLING_ERROR","Could not start checkout.");} }

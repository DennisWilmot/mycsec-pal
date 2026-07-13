import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getDatabaseClient } from "@/lib/db";
import { getStripe } from "@/lib/billing/stripe";
import { persistStripeSubscription } from "@/lib/billing/subscriptions";

export async function POST(request:NextRequest){const secret=process.env.STRIPE_WEBHOOK_SECRET,signature=request.headers.get("stripe-signature");if(!secret||!signature)return NextResponse.json({error:"Webhook is not configured."},{status:503});let event:Stripe.Event;try{event=getStripe().webhooks.constructEvent(await request.text(),signature,secret);}catch{return NextResponse.json({error:"Invalid signature."},{status:400});}const sql=getDatabaseClient();const seen=await sql`select 1 from billing_events where stripe_event_id=${event.id}`;if(seen.length)return NextResponse.json({received:true,duplicate:true});try{
  let subscription:Stripe.Subscription|null=null;
  if(event.type.startsWith("customer.subscription."))subscription=event.data.object as Stripe.Subscription;
  if(event.type==="checkout.session.completed"){
    const session=event.data.object as Stripe.Checkout.Session;
    const customerId=typeof session.customer==="string"?session.customer:null;
    const profileId=session.client_reference_id||session.metadata?.profileId;
    if(customerId&&profileId)await sql`insert into billing_customers(profile_id,stripe_customer_id) values(${profileId}::uuid,${customerId}) on conflict(profile_id) do update set stripe_customer_id=excluded.stripe_customer_id,updated_at=now()`;
    if(typeof session.subscription==="string")subscription=await getStripe().subscriptions.retrieve(session.subscription);
  }
  if(subscription){const customerId=typeof subscription.customer==="string"?subscription.customer:subscription.customer.id;const[customer]=await sql<{profile_id:string}[]>`select profile_id from billing_customers where stripe_customer_id=${customerId}`;const profileId=subscription.metadata.profileId||customer?.profile_id;if(profileId)await persistStripeSubscription(sql,profileId,subscription);}
  await sql`insert into billing_events(stripe_event_id,event_type,payload_json) values(${event.id},${event.type},${JSON.stringify(event)}) on conflict(stripe_event_id) do nothing`;return NextResponse.json({received:true});}catch(error){console.error("stripe.webhook.failed",{eventId:event.id,type:event.type,error});return NextResponse.json({error:"Webhook processing failed."},{status:500});}}

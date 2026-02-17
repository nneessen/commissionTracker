// supabase/functions/stripe-webhook/index.ts
// Stripe Webhook Handler - Processes subscription and payment events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Map Stripe subscription status to our internal status
function mapSubscriptionStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    paused: "paused",
    past_due: "past_due",
    canceled: "cancelled",
    incomplete: "past_due",
    incomplete_expired: "cancelled",
    unpaid: "past_due",
  };
  return statusMap[stripeStatus] || "active";
}

// Determine billing interval from Stripe price interval
function getBillingInterval(interval?: string): string {
  if (interval === "year") return "annual";
  return "monthly";
}

// Map Stripe invoice billing reason to our internal reason
function mapBillingReason(reason?: string | null): string {
  const reasonMap: Record<string, string> = {
    subscription_create: "initial",
    subscription_cycle: "renewal",
    subscription_update: "upgrade",
    manual: "renewal",
  };
  return reasonMap[reason || ""] || "renewal";
}

// Send billing email via Mailgun
async function sendBillingEmail(
  supabase: ReturnType<typeof createClient>,
  templateName: string,
  userEmail: string,
  userName: string,
  variables: Record<string, string>,
): Promise<void> {
  try {
    const { data: template, error: templateError } = await supabase
      .from("email_templates")
      .select("subject, body_html, body_text")
      .eq("name", templateName)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      console.error(`Email template not found: ${templateName}`, templateError);
      return;
    }

    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text || "";

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
      bodyText = bodyText.replace(regex, value);
    }

    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("Mailgun credentials not configured");
      return;
    }

    const form = new FormData();
    form.append("from", `The Standard HQ <noreply@${MAILGUN_DOMAIN}>`);
    form.append("to", `${userName} <${userEmail}>`);
    form.append("subject", subject);
    form.append("html", bodyHtml);
    if (bodyText) {
      form.append("text", bodyText);
    }

    const credentials = `api:${MAILGUN_API_KEY}`;
    const encoder = new TextEncoder();
    const credentialsBytes = encoder.encode(credentials);
    const base64Credentials = btoa(String.fromCharCode(...credentialsBytes));

    const response = await fetch(
      `https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${base64Credentials}`,
        },
        body: form,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send billing email: ${errorText}`);
    } else {
      console.log(`Billing email sent: ${templateName} to ${userEmail}`);
    }
  } catch (error) {
    console.error("Error sending billing email:", error);
  }
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function timestampToISO(ts: number | null | undefined): string | null {
  if (!ts) return null;
  return new Date(ts * 1000).toISOString();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
      console.error("Stripe keys not configured");
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get raw body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      console.error("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        STRIPE_WEBHOOK_SECRET,
      );
    } catch (err) {
      console.error("Invalid webhook signature:", err);
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[stripe-webhook] Received event: ${event.type}`, {
      eventId: event.id,
    });

    // Helper: resolve user_id from Stripe metadata or customer lookup
    async function resolveUserId(
      metadata?: Stripe.Metadata | null,
      customerIdStr?: string | null,
    ): Promise<string | null> {
      // Check metadata first
      if (metadata?.user_id) {
        return metadata.user_id;
      }

      // Look up by stripe_customer_id
      if (customerIdStr) {
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerIdStr)
          .maybeSingle();

        if (sub?.user_id) return sub.user_id;

        // Try looking up customer email in Stripe, then match to user
        try {
          const customer = await stripe.customers.retrieve(customerIdStr);
          if (customer && !customer.deleted && customer.email) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("id")
              .eq("email", customer.email)
              .maybeSingle();
            if (profile?.id) return profile.id;
          }
        } catch {
          // Customer lookup failed, continue
        }
      }

      return null;
    }

    // Helper: get user details for emails
    async function getUserDetails(userId: string) {
      const { data } = await supabase
        .from("user_profiles")
        .select("first_name, last_name, email")
        .eq("id", userId)
        .single();
      return data;
    }

    // Handle events
    switch (event.type) {
      // ──────────────────────────────────────────────
      // CHECKOUT SESSION COMPLETED
      // ──────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!userId) {
          console.error("checkout.session.completed: No user_id in metadata");
          break;
        }

        // Store customer ID on user's subscription for future portal lookups
        if (customerId) {
          await supabase
            .from("user_subscriptions")
            .update({
              stripe_customer_id: customerId,
              stripe_checkout_session_id: session.id,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }

        console.log(`[stripe-webhook] Checkout completed for user: ${userId}`);
        break;
      }

      // ──────────────────────────────────────────────
      // SUBSCRIPTION CREATED / UPDATED / RESUMED
      // ──────────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.resumed": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        const userId = await resolveUserId(subscription.metadata, customerId);

        if (!userId) {
          console.error(`${event.type}: Could not determine user_id`, {
            customerId,
            metadata: subscription.metadata,
          });

          await supabase.from("subscription_events").insert({
            event_type: "subscription",
            event_name: event.type,
            stripe_event_id: event.id,
            event_data: event,
            error_message: "Could not determine user_id",
          });
          break;
        }

        // Find the plan item among subscription line items.
        // With multi-item subscriptions (plan + addons + seat packs),
        // items.data[0] is NOT guaranteed to be the plan.
        // Match against known plan prices in subscription_plans.
        let planItem = subscription.items?.data?.[0] || null;

        if (subscription.items?.data && subscription.items.data.length > 1) {
          const itemPriceIds = subscription.items.data.map(
            (item) => item.price.id,
          );
          const { data: matchedPlan } = await supabase
            .from("subscription_plans")
            .select("stripe_price_id_monthly, stripe_price_id_annual")
            .or(
              itemPriceIds
                .map(
                  (pid) =>
                    `stripe_price_id_monthly.eq.${pid},stripe_price_id_annual.eq.${pid}`,
                )
                .join(","),
            )
            .limit(1)
            .maybeSingle();

          if (matchedPlan) {
            const found = subscription.items.data.find(
              (item) =>
                item.price.id === matchedPlan.stripe_price_id_monthly ||
                item.price.id === matchedPlan.stripe_price_id_annual,
            );
            if (found) planItem = found;
          }
        }

        const priceId = planItem?.price?.id || null;
        const priceInterval = planItem?.price?.recurring?.interval;

        const { data: eventId, error: eventError } = await supabase.rpc(
          "process_stripe_subscription_event",
          {
            p_event_type: "subscription",
            p_event_name: event.type,
            p_stripe_event_id: event.id,
            p_stripe_subscription_id: subscription.id,
            p_stripe_customer_id: customerId || null,
            p_stripe_checkout_session_id: null,
            p_stripe_price_id: priceId,
            p_user_id: userId,
            p_status: mapSubscriptionStatus(subscription.status),
            p_billing_interval: getBillingInterval(priceInterval),
            p_current_period_start: timestampToISO(
              subscription.current_period_start,
            ),
            p_current_period_end: timestampToISO(
              subscription.current_period_end,
            ),
            p_trial_ends_at: timestampToISO(subscription.trial_end),
            p_cancelled_at: timestampToISO(subscription.canceled_at),
            p_event_data: event,
          },
        );

        if (eventError) {
          console.error("Error processing subscription event:", eventError);
          throw eventError;
        }

        // Send welcome email for new subscriptions
        if (event.type === "customer.subscription.created") {
          const userDetails = await getUserDetails(userId);
          const userEmail = userDetails?.email || "";
          const userName =
            `${userDetails?.first_name || ""} ${userDetails?.last_name || ""}`.trim() ||
            "Customer";

          if (userEmail) {
            const planProductId = planItem?.price?.product;
            let productName = "Premium";
            if (typeof planProductId === "string") {
              try {
                const product = await stripe.products.retrieve(planProductId);
                productName = product.name;
              } catch {
                // Use default
              }
            }

            await sendBillingEmail(
              supabase,
              "subscription_welcome",
              userEmail,
              userName,
              {
                first_name: userDetails?.first_name || "there",
                plan_name: productName,
                amount: formatCents(
                  planItem?.price?.unit_amount || 0,
                ),
                billing_interval: priceInterval === "year" ? "year" : "month",
                next_billing_date: formatDate(
                  timestampToISO(subscription.current_period_end),
                ),
              },
            );
          }
        }

        // Sync period dates to any addon subscriptions tied to this Stripe subscription
        if (subscription.id) {
          const addonPeriodUpdate: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
          };
          if (subscription.current_period_start) {
            addonPeriodUpdate.current_period_start = timestampToISO(
              subscription.current_period_start,
            );
          }
          if (subscription.current_period_end) {
            addonPeriodUpdate.current_period_end = timestampToISO(
              subscription.current_period_end,
            );
          }
          if (priceInterval) {
            addonPeriodUpdate.billing_interval =
              getBillingInterval(priceInterval);
          }
          // Map subscription status to addon status
          const addonStatus = mapSubscriptionStatus(subscription.status);
          if (addonStatus === "cancelled") {
            addonPeriodUpdate.status = "cancelled";
            addonPeriodUpdate.cancelled_at = new Date().toISOString();
          } else if (addonStatus === "active") {
            addonPeriodUpdate.status = "active";
          }

          await supabase
            .from("user_subscription_addons")
            .update(addonPeriodUpdate)
            .eq("stripe_subscription_id", subscription.id);
        }

        // Detect removed line items — mark addons/seat packs as cancelled
        // when their stripe_subscription_item_id no longer exists in the subscription
        if (subscription.id && subscription.items?.data) {
          const currentItemIds = new Set(
            subscription.items.data.map((item) => item.id),
          );

          // Check addons with tracked item IDs
          const { data: trackedAddons } = await supabase
            .from("user_subscription_addons")
            .select("id, stripe_subscription_item_id")
            .eq("stripe_subscription_id", subscription.id)
            .not("stripe_subscription_item_id", "is", null)
            .in("status", ["active", "manual_grant"]);

          if (trackedAddons && trackedAddons.length > 0) {
            const removedAddonIds = trackedAddons
              .filter(
                (a) =>
                  a.stripe_subscription_item_id &&
                  !currentItemIds.has(a.stripe_subscription_item_id),
              )
              .map((a) => a.id);

            if (removedAddonIds.length > 0) {
              await supabase
                .from("user_subscription_addons")
                .update({
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .in("id", removedAddonIds);

              console.log(
                `[stripe-webhook] Marked ${removedAddonIds.length} addon(s) as cancelled (item removed from subscription)`,
              );
            }
          }

          // Check seat packs with tracked item IDs
          const { data: trackedSeatPacks } = await supabase
            .from("team_seat_packs")
            .select("id, stripe_subscription_item_id")
            .eq("stripe_subscription_id", subscription.id)
            .not("stripe_subscription_item_id", "is", null)
            .eq("status", "active");

          if (trackedSeatPacks && trackedSeatPacks.length > 0) {
            const removedSeatPackIds = trackedSeatPacks
              .filter(
                (sp) =>
                  sp.stripe_subscription_item_id &&
                  !currentItemIds.has(sp.stripe_subscription_item_id),
              )
              .map((sp) => sp.id);

            if (removedSeatPackIds.length > 0) {
              await supabase
                .from("team_seat_packs")
                .update({
                  status: "cancelled",
                  updated_at: new Date().toISOString(),
                })
                .in("id", removedSeatPackIds);

              console.log(
                `[stripe-webhook] Marked ${removedSeatPackIds.length} seat pack(s) as cancelled (item removed from subscription)`,
              );
            }
          }
        }

        console.log(`[stripe-webhook] Processed ${event.type}:`, {
          eventId,
          userId,
        });
        break;
      }

      // ──────────────────────────────────────────────
      // SUBSCRIPTION DELETED (cancelled)
      // ──────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        const userId = await resolveUserId(subscription.metadata, customerId);

        if (!userId) {
          console.error("subscription.deleted: Could not determine user_id");
          break;
        }

        // Idempotency gate — skip entire handler if already processed
        const { data: existingDeletedEvent } = await supabase
          .from("subscription_events")
          .select("id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();

        if (existingDeletedEvent) {
          console.log(`[stripe-webhook] Duplicate event skipped: ${event.id}`);
          break;
        }

        await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Also cancel any addon subscriptions tied to this Stripe subscription
        await supabase
          .from("user_subscription_addons")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        // Cancel any seat packs tied to this Stripe subscription
        // (do NOT auto-remove seated agents — owner can re-purchase)
        await supabase
          .from("team_seat_packs")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        const { error: eventInsertError } = await supabase
          .from("subscription_events")
          .insert({
            user_id: userId,
            event_type: "subscription",
            event_name: event.type,
            stripe_event_id: event.id,
            event_data: event,
            processed_at: new Date().toISOString(),
          });

        if (eventInsertError) {
          console.warn(
            `[stripe-webhook] Duplicate event insert (race): ${event.id}`,
            eventInsertError.message,
          );
          break;
        }

        // Send cancellation email
        const userDetails = await getUserDetails(userId);
        const userEmail = userDetails?.email || "";
        const userName =
          `${userDetails?.first_name || ""} ${userDetails?.last_name || ""}`.trim() ||
          "Customer";

        if (userEmail) {
          await sendBillingEmail(
            supabase,
            "subscription_cancelled",
            userEmail,
            userName,
            {
              first_name: userDetails?.first_name || "there",
              plan_name: "Premium",
              access_until_date: formatDate(
                timestampToISO(subscription.current_period_end),
              ),
            },
          );
        }

        console.log(
          `[stripe-webhook] Subscription deleted for user: ${userId}`,
        );
        break;
      }

      // ──────────────────────────────────────────────
      // SUBSCRIPTION PAUSED
      // ──────────────────────────────────────────────
      case "customer.subscription.paused": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        const userId = await resolveUserId(subscription.metadata, customerId);

        if (!userId) break;

        // Idempotency gate — skip entire handler if already processed
        const { data: existingPausedEvent } = await supabase
          .from("subscription_events")
          .select("id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();

        if (existingPausedEvent) {
          console.log(`[stripe-webhook] Duplicate event skipped: ${event.id}`);
          break;
        }

        await supabase
          .from("user_subscriptions")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        const { error: eventInsertError } = await supabase
          .from("subscription_events")
          .insert({
            user_id: userId,
            event_type: "subscription",
            event_name: event.type,
            stripe_event_id: event.id,
            event_data: event,
            processed_at: new Date().toISOString(),
          });

        if (eventInsertError) {
          console.warn(
            `[stripe-webhook] Duplicate event insert (race): ${event.id}`,
            eventInsertError.message,
          );
          break;
        }

        console.log(`[stripe-webhook] Subscription paused for user: ${userId}`);
        break;
      }

      // ──────────────────────────────────────────────
      // INVOICE PAID
      // ──────────────────────────────────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        const userId = await resolveUserId(
          invoice.subscription_details?.metadata || invoice.metadata,
          customerId,
        );

        if (!userId) {
          console.error("invoice.paid: Could not determine user_id");
          break;
        }

        // Idempotency gate — skip entire handler if already processed
        const { data: existingPaidEvent } = await supabase
          .from("subscription_events")
          .select("id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();

        if (existingPaidEvent) {
          console.log(`[stripe-webhook] Duplicate event skipped: ${event.id}`);
          break;
        }

        const { error: paymentError } = await supabase.rpc(
          "record_stripe_payment",
          {
            p_user_id: userId,
            p_stripe_invoice_id: invoice.id,
            p_stripe_payment_intent_id:
              typeof invoice.payment_intent === "string"
                ? invoice.payment_intent
                : invoice.payment_intent?.id || null,
            p_stripe_subscription_id: subscriptionId || null,
            p_amount: invoice.amount_paid || 0,
            p_tax_amount: invoice.tax || 0,
            p_discount_amount:
              invoice.total_discount_amounts?.reduce(
                (sum, d) => sum + d.amount,
                0,
              ) || 0,
            p_currency: (invoice.currency || "usd").toUpperCase(),
            p_status: "paid",
            p_billing_reason: mapBillingReason(invoice.billing_reason),
            p_receipt_url: invoice.hosted_invoice_url || null,
            p_invoice_url: invoice.invoice_pdf || null,
            p_card_brand: invoice.charge ? null : null,
            p_card_last_four: null,
            p_paid_at: new Date().toISOString(),
          },
        );

        if (paymentError) {
          console.error("Error recording payment:", paymentError);
        }

        // Update subscription to active if it was past_due
        if (subscriptionId) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId)
            .eq("status", "past_due");
        }

        const { error: eventInsertError } = await supabase
          .from("subscription_events")
          .insert({
            user_id: userId,
            event_type: "payment",
            event_name: event.type,
            stripe_event_id: event.id,
            event_data: event,
            processed_at: new Date().toISOString(),
          });

        if (eventInsertError) {
          console.warn(
            `[stripe-webhook] Duplicate event insert (race): ${event.id}`,
            eventInsertError.message,
          );
          break;
        }

        // Send receipt email
        const userDetails = await getUserDetails(userId);
        const userEmail = userDetails?.email || "";
        const userName =
          `${userDetails?.first_name || ""} ${userDetails?.last_name || ""}`.trim() ||
          "Customer";

        if (userEmail && invoice.billing_reason !== "subscription_create") {
          await sendBillingEmail(
            supabase,
            "payment_receipt",
            userEmail,
            userName,
            {
              first_name: userDetails?.first_name || "there",
              amount: formatCents(invoice.amount_paid || 0),
              plan_name: "Premium",
              payment_date: formatDate(new Date().toISOString()),
              card_brand: "Card",
              card_last_four: "****",
              invoice_id: invoice.id,
              receipt_url: invoice.hosted_invoice_url || "",
            },
          );
        }

        console.log(`[stripe-webhook] Payment recorded for user: ${userId}`);
        break;
      }

      // ──────────────────────────────────────────────
      // INVOICE PAYMENT FAILED
      // ──────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        const userId = await resolveUserId(
          invoice.subscription_details?.metadata || invoice.metadata,
          customerId,
        );

        if (!userId) {
          console.error("invoice.payment_failed: Could not determine user_id");
          break;
        }

        // Idempotency gate — skip entire handler if already processed
        const { data: existingFailedEvent } = await supabase
          .from("subscription_events")
          .select("id")
          .eq("stripe_event_id", event.id)
          .maybeSingle();

        if (existingFailedEvent) {
          console.log(`[stripe-webhook] Duplicate event skipped: ${event.id}`);
          break;
        }

        // Update subscription status to past_due
        if (subscriptionId) {
          await supabase
            .from("user_subscriptions")
            .update({
              status: "past_due",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);
        }

        // Record the failed payment
        await supabase.rpc("record_stripe_payment", {
          p_user_id: userId,
          p_stripe_invoice_id: invoice.id,
          p_stripe_payment_intent_id:
            typeof invoice.payment_intent === "string"
              ? invoice.payment_intent
              : invoice.payment_intent?.id || null,
          p_stripe_subscription_id: subscriptionId || null,
          p_amount: invoice.amount_due || 0,
          p_tax_amount: invoice.tax || 0,
          p_discount_amount: 0,
          p_currency: (invoice.currency || "usd").toUpperCase(),
          p_status: "failed",
          p_billing_reason: mapBillingReason(invoice.billing_reason),
          p_receipt_url: null,
          p_invoice_url: invoice.invoice_pdf || null,
          p_card_brand: null,
          p_card_last_four: null,
          p_paid_at: null,
        });

        const { error: eventInsertError } = await supabase
          .from("subscription_events")
          .insert({
            user_id: userId,
            event_type: "payment",
            event_name: event.type,
            stripe_event_id: event.id,
            event_data: event,
            processed_at: new Date().toISOString(),
          });

        if (eventInsertError) {
          console.warn(
            `[stripe-webhook] Duplicate event insert (race): ${event.id}`,
            eventInsertError.message,
          );
          break;
        }

        // Send payment failed email
        const userDetails = await getUserDetails(userId);
        const userEmail = userDetails?.email || "";
        const userName =
          `${userDetails?.first_name || ""} ${userDetails?.last_name || ""}`.trim() ||
          "Customer";

        if (userEmail) {
          await sendBillingEmail(
            supabase,
            "payment_failed",
            userEmail,
            userName,
            {
              first_name: userDetails?.first_name || "there",
              amount: formatCents(invoice.amount_due || 0),
              plan_name: "Premium",
              update_payment_url: "",
            },
          );
        }

        console.log(`[stripe-webhook] Payment failed for user: ${userId}`);
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ success: true, event: event.type }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[stripe-webhook] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

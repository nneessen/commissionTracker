// File: /home/nneessen/projects/commissionTracker/supabase/functions/lemon-webhook/index.ts
// Lemon Squeezy Webhook Handler - Processes subscription and payment events

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-signature",
};

// Lemon Squeezy webhook event types we handle
type LemonEventType =
  | "subscription_created"
  | "subscription_updated"
  | "subscription_cancelled"
  | "subscription_resumed"
  | "subscription_expired"
  | "subscription_paused"
  | "subscription_unpaused"
  | "subscription_payment_success"
  | "subscription_payment_failed"
  | "subscription_payment_recovered"
  | "order_created";

interface LemonWebhookPayload {
  meta: {
    event_name: LemonEventType;
    webhook_id: string;
    custom_data?: {
      user_id?: string;
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      // Common fields
      store_id: number;
      customer_id: number;
      order_id: number;
      // Subscription fields
      product_id?: number;
      variant_id?: number;
      product_name?: string;
      variant_name?: string;
      user_name?: string;
      user_email?: string;
      status?: string;
      status_formatted?: string;
      card_brand?: string;
      card_last_four?: string;
      pause?: null | object;
      cancelled?: boolean;
      trial_ends_at?: string | null;
      billing_anchor?: number;
      first_subscription_item?: {
        id: number;
        subscription_id: number;
        price_id: number;
        quantity: number;
        is_usage_based: boolean;
        created_at: string;
        updated_at: string;
      };
      urls?: {
        update_payment_method: string;
        customer_portal: string;
      };
      renews_at?: string;
      ends_at?: string | null;
      created_at?: string;
      updated_at?: string;
      test_mode?: boolean;
      // Payment/Invoice fields (for payment events)
      subtotal?: number;
      discount_total?: number;
      tax?: number;
      total?: number;
      subtotal_usd?: number;
      discount_total_usd?: number;
      tax_usd?: number;
      total_usd?: number;
      currency?: string;
      currency_rate?: string;
      receipt_url?: string;
      invoice_url?: string;
      billing_reason?: string;
      // Order fields (for order_created)
      identifier?: string;
      order_number?: number;
      total_formatted?: string;
    };
    relationships?: {
      store?: { links: { related: string; self: string } };
      customer?: { links: { related: string; self: string } };
      order?: { links: { related: string; self: string } };
      "order-item"?: { links: { related: string; self: string } };
      product?: { links: { related: string; self: string } };
      variant?: { links: { related: string; self: string } };
      subscription?: { links: { related: string; self: string } };
    };
  };
}

// Verify Lemon Squeezy webhook signature
async function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const keyData = encoder.encode(secret);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, data);
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return computedSignature === signature;
}

// Map Lemon status to our status
function mapSubscriptionStatus(lemonStatus: string): string {
  const statusMap: Record<string, string> = {
    active: "active",
    on_trial: "trialing",
    paused: "paused",
    past_due: "past_due",
    unpaid: "past_due",
    cancelled: "cancelled",
    expired: "cancelled",
  };
  return statusMap[lemonStatus] || "active";
}

// Map billing reason
function mapBillingReason(reason?: string): string {
  const reasonMap: Record<string, string> = {
    initial: "initial",
    renewal: "renewal",
    updated: "upgrade",
  };
  return reasonMap[reason || ""] || "renewal";
}

// Send billing email via Mailgun (through send-email function)
async function sendBillingEmail(
  supabase: ReturnType<typeof createClient>,
  templateName: string,
  userEmail: string,
  userName: string,
  variables: Record<string, string>,
): Promise<void> {
  try {
    // Get the email template
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

    // Replace variables in template
    let subject = template.subject;
    let bodyHtml = template.body_html;
    let bodyText = template.body_text || "";

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      subject = subject.replace(regex, value);
      bodyHtml = bodyHtml.replace(regex, value);
      bodyText = bodyText.replace(regex, value);
    }

    // Get Mailgun credentials
    const MAILGUN_API_KEY = Deno.env.get("MAILGUN_API_KEY");
    const MAILGUN_DOMAIN = Deno.env.get("MAILGUN_DOMAIN");

    if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
      console.error("Mailgun credentials not configured");
      return;
    }

    // Send email via Mailgun
    const form = new FormData();
    form.append("from", `Commission Tracker <noreply@${MAILGUN_DOMAIN}>`);
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

// Format cents to dollars
function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// Format date
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get environment variables
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const LEMON_WEBHOOK_SECRET = Deno.env.get("LEMON_SQUEEZY_WEBHOOK_SECRET");

    // Create admin Supabase client (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get raw body for signature verification
    const rawBody = await req.text();

    // SECURITY: Verify webhook signature
    if (!LEMON_WEBHOOK_SECRET) {
      console.error("LEMON_SQUEEZY_WEBHOOK_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const signature = req.headers.get("x-signature");
    if (!signature) {
      console.error("Missing webhook signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isValid = await verifySignature(
      rawBody,
      signature,
      LEMON_WEBHOOK_SECRET,
    );
    if (!isValid) {
      console.error("Invalid webhook signature - possible forgery");
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse webhook payload
    const payload: LemonWebhookPayload = JSON.parse(rawBody);
    const eventName = payload.meta.event_name;
    const webhookId = payload.meta.webhook_id;
    const attrs = payload.data.attributes;

    console.log(`[lemon-webhook] Received event: ${eventName}`, {
      webhookId,
      subscriptionId: payload.data.id,
      status: attrs.status,
      userEmail: attrs.user_email,
    });

    // Get user_id from custom data or lookup by email
    let userId = payload.meta.custom_data?.user_id;

    if (!userId && attrs.user_email) {
      // Look up user by email
      const { data: userProfile } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", attrs.user_email)
        .single();

      if (userProfile) {
        userId = userProfile.id;
      }
    }

    if (!userId) {
      console.error("Could not determine user_id for webhook:", {
        email: attrs.user_email,
        customData: payload.meta.custom_data,
      });

      // Log the event anyway for debugging
      await supabase.from("subscription_events").insert({
        event_type: eventName,
        event_name: eventName,
        lemon_event_id: `${webhookId}-${payload.data.id}`,
        lemon_webhook_id: webhookId,
        event_data: payload,
        error_message: "Could not determine user_id",
      });

      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        {
          status: 200, // Return 200 to prevent retries
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Get user details for emails
    const { data: userDetails } = await supabase
      .from("user_profiles")
      .select("first_name, last_name, email")
      .eq("id", userId)
      .single();

    const userName = userDetails
      ? `${userDetails.first_name || ""} ${userDetails.last_name || ""}`.trim()
      : "Customer";
    const userEmail = userDetails?.email || attrs.user_email || "";

    // Create lemon_event_id for idempotency
    const lemonEventId = `${webhookId}-${eventName}-${payload.data.id}`;

    // Handle different event types
    switch (eventName) {
      case "subscription_created":
      case "subscription_updated":
      case "subscription_resumed":
      case "subscription_unpaused": {
        // Process subscription event using our DB function
        const { data: eventId, error: eventError } = await supabase.rpc(
          "process_lemon_subscription_event",
          {
            p_event_type: "subscription",
            p_event_name: eventName,
            p_lemon_event_id: lemonEventId,
            p_lemon_subscription_id: payload.data.id,
            p_lemon_customer_id: String(attrs.customer_id),
            p_lemon_order_id: attrs.order_id ? String(attrs.order_id) : null,
            p_lemon_variant_id: attrs.variant_id
              ? String(attrs.variant_id)
              : null,
            p_user_id: userId,
            p_status: mapSubscriptionStatus(attrs.status || "active"),
            p_billing_interval: attrs.variant_name
              ?.toLowerCase()
              .includes("annual")
              ? "annual"
              : "monthly",
            p_current_period_start: attrs.created_at || null,
            p_current_period_end: attrs.renews_at || null,
            p_trial_ends_at: attrs.trial_ends_at || null,
            p_cancelled_at: null,
            p_event_data: payload,
          },
        );

        if (eventError) {
          console.error("Error processing subscription event:", eventError);
          throw eventError;
        }

        // Send welcome email for new subscriptions
        if (eventName === "subscription_created" && userEmail) {
          await sendBillingEmail(
            supabase,
            "subscription_welcome",
            userEmail,
            userName,
            {
              first_name: userDetails?.first_name || "there",
              plan_name: attrs.product_name || "Premium",
              amount: formatCents((attrs.total_usd || 0) * 100),
              billing_interval: attrs.variant_name
                ?.toLowerCase()
                .includes("annual")
                ? "year"
                : "month",
              next_billing_date: formatDate(attrs.renews_at),
            },
          );
        }

        console.log(`[lemon-webhook] Processed ${eventName}:`, {
          eventId,
          userId,
        });
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        // Update subscription to cancelled
        const { error: cancelError } = await supabase
          .from("user_subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("lemon_subscription_id", payload.data.id);

        if (cancelError) {
          console.error("Error cancelling subscription:", cancelError);
        }

        // Log event
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: "subscription",
          event_name: eventName,
          lemon_event_id: lemonEventId,
          lemon_webhook_id: webhookId,
          event_data: payload,
          processed_at: new Date().toISOString(),
        });

        // Send cancellation email
        if (userEmail) {
          await sendBillingEmail(
            supabase,
            "subscription_cancelled",
            userEmail,
            userName,
            {
              first_name: userDetails?.first_name || "there",
              plan_name: attrs.product_name || "Premium",
              access_until_date: formatDate(attrs.ends_at || attrs.renews_at),
            },
          );
        }

        console.log(`[lemon-webhook] Processed ${eventName} for user:`, userId);
        break;
      }

      case "subscription_paused": {
        // Update subscription to paused
        await supabase
          .from("user_subscriptions")
          .update({
            status: "paused",
            updated_at: new Date().toISOString(),
          })
          .eq("lemon_subscription_id", payload.data.id);

        // Log event
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: "subscription",
          event_name: eventName,
          lemon_event_id: lemonEventId,
          lemon_webhook_id: webhookId,
          event_data: payload,
          processed_at: new Date().toISOString(),
        });

        console.log(`[lemon-webhook] Subscription paused for user:`, userId);
        break;
      }

      case "subscription_payment_success":
      case "subscription_payment_recovered": {
        // Record the payment
        const { error: paymentError } = await supabase.rpc(
          "record_lemon_payment",
          {
            p_user_id: userId,
            p_lemon_invoice_id: `${payload.data.id}-${Date.now()}`,
            p_lemon_order_id: attrs.order_id ? String(attrs.order_id) : null,
            p_lemon_subscription_id: payload.data.id,
            p_amount: (attrs.total_usd || 0) * 100, // Convert to cents
            p_tax_amount: (attrs.tax_usd || 0) * 100,
            p_discount_amount: (attrs.discount_total_usd || 0) * 100,
            p_currency: attrs.currency || "USD",
            p_status: "paid",
            p_billing_reason: mapBillingReason(attrs.billing_reason),
            p_receipt_url: attrs.receipt_url || null,
            p_invoice_url: attrs.invoice_url || null,
            p_card_brand: attrs.card_brand || null,
            p_card_last_four: attrs.card_last_four || null,
            p_paid_at: new Date().toISOString(),
          },
        );

        if (paymentError) {
          console.error("Error recording payment:", paymentError);
        }

        // Update subscription status to active if it was past_due
        await supabase
          .from("user_subscriptions")
          .update({
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: attrs.renews_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("lemon_subscription_id", payload.data.id)
          .eq("status", "past_due");

        // Log event
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: "payment",
          event_name: eventName,
          lemon_event_id: lemonEventId,
          lemon_webhook_id: webhookId,
          event_data: payload,
          processed_at: new Date().toISOString(),
        });

        // Send receipt email
        if (userEmail) {
          const templateName =
            attrs.billing_reason === "initial"
              ? "subscription_welcome"
              : "payment_receipt";

          if (templateName === "payment_receipt") {
            await sendBillingEmail(
              supabase,
              "payment_receipt",
              userEmail,
              userName,
              {
                first_name: userDetails?.first_name || "there",
                amount: formatCents((attrs.total_usd || 0) * 100),
                plan_name: attrs.product_name || "Premium",
                payment_date: formatDate(new Date().toISOString()),
                card_brand: attrs.card_brand || "Card",
                card_last_four: attrs.card_last_four || "****",
                invoice_id: String(attrs.order_id || payload.data.id),
                receipt_url: attrs.receipt_url || "",
              },
            );
          } else {
            await sendBillingEmail(
              supabase,
              "subscription_renewed",
              userEmail,
              userName,
              {
                first_name: userDetails?.first_name || "there",
                plan_name: attrs.product_name || "Premium",
                amount: formatCents((attrs.total_usd || 0) * 100),
                next_billing_date: formatDate(attrs.renews_at),
              },
            );
          }
        }

        console.log(`[lemon-webhook] Payment recorded for user:`, userId);
        break;
      }

      case "subscription_payment_failed": {
        // Update subscription status to past_due
        await supabase
          .from("user_subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("lemon_subscription_id", payload.data.id);

        // Record the failed payment
        await supabase.rpc("record_lemon_payment", {
          p_user_id: userId,
          p_lemon_invoice_id: `${payload.data.id}-failed-${Date.now()}`,
          p_lemon_order_id: attrs.order_id ? String(attrs.order_id) : null,
          p_lemon_subscription_id: payload.data.id,
          p_amount: (attrs.total_usd || 0) * 100,
          p_tax_amount: (attrs.tax_usd || 0) * 100,
          p_discount_amount: (attrs.discount_total_usd || 0) * 100,
          p_currency: attrs.currency || "USD",
          p_status: "failed",
          p_billing_reason: mapBillingReason(attrs.billing_reason),
          p_receipt_url: null,
          p_invoice_url: attrs.invoice_url || null,
          p_card_brand: attrs.card_brand || null,
          p_card_last_four: attrs.card_last_four || null,
          p_paid_at: null,
        });

        // Log event
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: "payment",
          event_name: eventName,
          lemon_event_id: lemonEventId,
          lemon_webhook_id: webhookId,
          event_data: payload,
          processed_at: new Date().toISOString(),
        });

        // Send payment failed email
        if (userEmail) {
          await sendBillingEmail(
            supabase,
            "payment_failed",
            userEmail,
            userName,
            {
              first_name: userDetails?.first_name || "there",
              amount: formatCents((attrs.total_usd || 0) * 100),
              plan_name: attrs.product_name || "Premium",
              update_payment_url: attrs.urls?.update_payment_method || "",
            },
          );
        }

        console.log(`[lemon-webhook] Payment failed for user:`, userId);
        break;
      }

      case "order_created": {
        // Just log order events for now
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: "order",
          event_name: eventName,
          lemon_event_id: lemonEventId,
          lemon_webhook_id: webhookId,
          event_data: payload,
          processed_at: new Date().toISOString(),
        });

        console.log(`[lemon-webhook] Order created for user:`, userId);
        break;
      }

      default:
        console.log(`[lemon-webhook] Unhandled event type: ${eventName}`);
        // Log unhandled events
        await supabase.from("subscription_events").insert({
          user_id: userId,
          event_type: "unknown",
          event_name: eventName,
          lemon_event_id: lemonEventId,
          lemon_webhook_id: webhookId,
          event_data: payload,
          processed_at: new Date().toISOString(),
        });
    }

    return new Response(JSON.stringify({ success: true, event: eventName }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[lemon-webhook] Error:", err);
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

// supabase/functions/manage-subscription-items/index.ts
// Manages subscription line items (addons, seat packs) on an existing Stripe subscription

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@17?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Hardcoded seat pack price — never trust the client for pricing
const SEAT_PACK_PRICE_ID = "price_1T1tU4RYi2kelWQkYkNFnthp";

// Tier config shape stored in subscription_addons.tier_config JSON
interface AddonTier {
  id: string;
  name: string;
  runs_per_month: number;
  price_monthly: number;
  price_annual: number;
  stripe_price_id_monthly?: string;
  stripe_price_id_annual?: string;
}

interface AddonTierConfig {
  tiers: AddonTier[];
}

function jsonResponse(
  data: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;

    if (!STRIPE_SECRET_KEY) {
      return jsonResponse({ error: "Stripe not configured" }, 500);
    }

    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
    });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const { action } = body;

    // Get user's active subscription
    const { data: userSub, error: subError } = await supabase
      .from("user_subscriptions")
      .select("stripe_subscription_id, billing_interval, status")
      .eq("user_id", user.id)
      .in("status", ["active", "trialing"])
      .maybeSingle();

    if (subError || !userSub?.stripe_subscription_id) {
      return jsonResponse(
        { error: "No active subscription found. Please subscribe to a plan first." },
        400,
      );
    }

    const stripeSubId = userSub.stripe_subscription_id;
    const billingInterval = userSub.billing_interval || "monthly";

    switch (action) {
      // ──────────────────────────────────────────────
      // ADD ADDON
      // ──────────────────────────────────────────────
      case "add_addon": {
        const { addonId, tierId } = body;

        if (!addonId) {
          return jsonResponse({ error: "addonId is required" }, 400);
        }

        // Validate addon exists and is active — server-side lookup
        const { data: addon, error: addonLookupError } = await supabase
          .from("subscription_addons")
          .select("id, name, is_active, stripe_price_id_monthly, stripe_price_id_annual, tier_config")
          .eq("id", addonId)
          .maybeSingle();

        if (addonLookupError || !addon) {
          return jsonResponse({ error: "Addon not found" }, 404);
        }

        if (!addon.is_active) {
          return jsonResponse({ error: "This addon is no longer available" }, 400);
        }

        // Resolve the correct price ID server-side
        let priceId: string | null = null;
        let resolvedTierId: string | null = null;

        const tierConfig = addon.tier_config as AddonTierConfig | null;

        if (tierConfig?.tiers && tierConfig.tiers.length > 0) {
          // Tiered addon — tierId is required
          if (!tierId) {
            return jsonResponse(
              { error: "tierId is required for this addon" },
              400,
            );
          }

          const tier = tierConfig.tiers.find((t) => t.id === tierId);
          if (!tier) {
            return jsonResponse(
              { error: `Invalid tier: ${tierId}. Valid tiers: ${tierConfig.tiers.map((t) => t.id).join(", ")}` },
              400,
            );
          }

          priceId =
            billingInterval === "annual"
              ? tier.stripe_price_id_annual || null
              : tier.stripe_price_id_monthly || null;
          resolvedTierId = tier.id;
        } else {
          // Non-tiered addon — use addon-level price IDs
          priceId =
            billingInterval === "annual"
              ? addon.stripe_price_id_annual
              : addon.stripe_price_id_monthly;
        }

        if (!priceId) {
          return jsonResponse(
            { error: "No price configured for the current billing interval" },
            400,
          );
        }

        // Check for existing active addon
        const { data: existingAddon } = await supabase
          .from("user_subscription_addons")
          .select("id, status")
          .eq("user_id", user.id)
          .eq("addon_id", addonId)
          .in("status", ["active", "manual_grant"])
          .maybeSingle();

        if (existingAddon) {
          return jsonResponse(
            { error: "You already have this addon active" },
            400,
          );
        }

        // Add line item to existing subscription
        const updatedSub = await stripe.subscriptions.update(stripeSubId, {
          items: [{ price: priceId }],
          proration_behavior: "create_prorations",
        });

        // Find the newly added item by matching price ID
        const newItem = updatedSub.items.data.find(
          (item) => item.price.id === priceId,
        );

        if (!newItem) {
          console.error(
            "[manage-subscription-items] Could not find new item after adding addon",
          );
          return jsonResponse(
            { error: "Failed to identify the new subscription item" },
            500,
          );
        }

        // Upsert addon record in DB
        const { error: addonError } = await supabase
          .from("user_subscription_addons")
          .upsert(
            {
              user_id: user.id,
              addon_id: addonId,
              tier_id: resolvedTierId,
              status: "active",
              stripe_subscription_id: stripeSubId,
              stripe_subscription_item_id: newItem.id,
              stripe_checkout_session_id: null,
              billing_interval: billingInterval,
              cancelled_at: null,
              current_period_start: new Date(
                updatedSub.current_period_start * 1000,
              ).toISOString(),
              current_period_end: new Date(
                updatedSub.current_period_end * 1000,
              ).toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,addon_id" },
          );

        if (addonError) {
          // Rollback: remove the Stripe line item since DB write failed
          console.error(
            "[manage-subscription-items] DB write failed, rolling back Stripe item:",
            addonError,
          );
          try {
            await stripe.subscriptions.update(stripeSubId, {
              items: [{ id: newItem.id, deleted: true }],
              proration_behavior: "none",
            });
            console.log(
              `[manage-subscription-items] Rolled back Stripe item ${newItem.id}`,
            );
          } catch (rollbackErr) {
            console.error(
              "[manage-subscription-items] CRITICAL: Stripe rollback also failed:",
              rollbackErr,
            );
          }
          return jsonResponse({ error: "Failed to save addon record" }, 500);
        }

        console.log(
          `[manage-subscription-items] Addon added: addon=${addonId}, tier=${resolvedTierId}, item=${newItem.id}, user=${user.id}`,
        );

        return jsonResponse({ success: true });
      }

      // ──────────────────────────────────────────────
      // REMOVE ADDON
      // ──────────────────────────────────────────────
      case "remove_addon": {
        const { addonId: removeAddonId } = body;

        if (!removeAddonId) {
          return jsonResponse({ error: "addonId is required" }, 400);
        }

        // Look up the addon's stripe_subscription_item_id
        const { data: addonRecord, error: lookupError } = await supabase
          .from("user_subscription_addons")
          .select("id, stripe_subscription_item_id")
          .eq("user_id", user.id)
          .eq("addon_id", removeAddonId)
          .eq("status", "active")
          .maybeSingle();

        if (lookupError || !addonRecord?.stripe_subscription_item_id) {
          return jsonResponse(
            { error: "Active addon not found or missing item ID" },
            404,
          );
        }

        // Remove line item from subscription
        await stripe.subscriptions.update(stripeSubId, {
          items: [
            { id: addonRecord.stripe_subscription_item_id, deleted: true },
          ],
          proration_behavior: "create_prorations",
        });

        // Update DB record
        await supabase
          .from("user_subscription_addons")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", addonRecord.id);

        console.log(
          `[manage-subscription-items] Addon removed: addon=${removeAddonId}, user=${user.id}`,
        );

        return jsonResponse({ success: true });
      }

      // ──────────────────────────────────────────────
      // ADD SEAT PACK
      // ──────────────────────────────────────────────
      case "add_seat_pack": {
        // Capture item count BEFORE adding, to detect if Stripe creates
        // a new item vs incrementing quantity on an existing one.
        const currentSub = await stripe.subscriptions.retrieve(stripeSubId);
        const itemCountBefore = currentSub.items.data.length;
        const existingSeatItem = currentSub.items.data.find(
          (item) => item.price.id === SEAT_PACK_PRICE_ID,
        );

        // Add seat pack line item to subscription (price hardcoded server-side)
        const updatedSub = await stripe.subscriptions.update(stripeSubId, {
          items: [{ price: SEAT_PACK_PRICE_ID }],
          proration_behavior: "create_prorations",
        });

        const newSeatItem = updatedSub.items.data.find(
          (item) => item.price.id === SEAT_PACK_PRICE_ID,
        );

        if (!newSeatItem) {
          console.error(
            "[manage-subscription-items] Could not find seat pack item after update",
          );
          return jsonResponse(
            { error: "Failed to identify the seat pack subscription item" },
            500,
          );
        }

        // Detect if Stripe aggregated quantity instead of creating a new item.
        // If item count didn't increase and the item existed before, Stripe
        // incremented quantity on the existing item.
        const isQuantityIncrement =
          existingSeatItem &&
          updatedSub.items.data.length <= itemCountBefore;

        // Record the quantity on the Stripe item for audit
        const stripeQuantity = newSeatItem.quantity || 1;

        // Create seat pack record
        const { error: seatPackError } = await supabase
          .from("team_seat_packs")
          .insert({
            owner_id: user.id,
            quantity: 1,
            stripe_subscription_id: stripeSubId,
            stripe_subscription_item_id: newSeatItem.id,
            status: "active",
          });

        if (seatPackError) {
          // Rollback: remove the Stripe line item since DB write failed
          console.error(
            "[manage-subscription-items] DB write failed, rolling back Stripe seat pack:",
            seatPackError,
          );
          try {
            if (isQuantityIncrement && existingSeatItem) {
              // Decrement quantity back instead of deleting
              await stripe.subscriptions.update(stripeSubId, {
                items: [
                  {
                    id: newSeatItem.id,
                    quantity: stripeQuantity - 1,
                  },
                ],
                proration_behavior: "none",
              });
            } else {
              await stripe.subscriptions.update(stripeSubId, {
                items: [{ id: newSeatItem.id, deleted: true }],
                proration_behavior: "none",
              });
            }
            console.log(
              `[manage-subscription-items] Rolled back Stripe seat pack item ${newSeatItem.id}`,
            );
          } catch (rollbackErr) {
            console.error(
              "[manage-subscription-items] CRITICAL: Stripe rollback also failed:",
              rollbackErr,
            );
          }
          return jsonResponse({ error: "Failed to save seat pack record" }, 500);
        }

        if (isQuantityIncrement) {
          console.log(
            `[manage-subscription-items] Seat pack added via quantity increment: item=${newSeatItem.id}, qty=${stripeQuantity}, user=${user.id}`,
          );
        } else {
          console.log(
            `[manage-subscription-items] Seat pack added as new item: item=${newSeatItem.id}, user=${user.id}`,
          );
        }

        return jsonResponse({ success: true });
      }

      // ──────────────────────────────────────────────
      // REMOVE SEAT PACK
      // ──────────────────────────────────────────────
      case "remove_seat_pack": {
        const { seatPackId } = body;

        if (!seatPackId) {
          return jsonResponse({ error: "seatPackId is required" }, 400);
        }

        // Look up the seat pack's stripe_subscription_item_id
        const { data: seatPackRecord, error: seatLookupError } = await supabase
          .from("team_seat_packs")
          .select("id, stripe_subscription_item_id")
          .eq("id", seatPackId)
          .eq("owner_id", user.id)
          .eq("status", "active")
          .maybeSingle();

        if (
          seatLookupError ||
          !seatPackRecord?.stripe_subscription_item_id
        ) {
          return jsonResponse(
            { error: "Active seat pack not found or missing item ID" },
            404,
          );
        }

        // Check how many active DB records share this Stripe item ID
        // (multiple seat packs may share a single Stripe item via quantity)
        const { count: sharedCount } = await supabase
          .from("team_seat_packs")
          .select("id", { count: "exact", head: true })
          .eq("stripe_subscription_item_id", seatPackRecord.stripe_subscription_item_id)
          .eq("status", "active");

        const otherActivePacksOnSameItem = (sharedCount || 0) - 1;

        if (otherActivePacksOnSameItem > 0) {
          // Other packs share this Stripe item — decrement quantity instead of deleting
          const currentSub = await stripe.subscriptions.retrieve(stripeSubId);
          const seatItem = currentSub.items.data.find(
            (item) => item.id === seatPackRecord.stripe_subscription_item_id,
          );
          const currentQty = seatItem?.quantity || 1;

          if (currentQty > 1) {
            await stripe.subscriptions.update(stripeSubId, {
              items: [
                {
                  id: seatPackRecord.stripe_subscription_item_id,
                  quantity: currentQty - 1,
                },
              ],
              proration_behavior: "create_prorations",
            });
          } else {
            // Quantity is already 1 but we have other DB records — just remove the item
            await stripe.subscriptions.update(stripeSubId, {
              items: [
                {
                  id: seatPackRecord.stripe_subscription_item_id,
                  deleted: true,
                },
              ],
              proration_behavior: "create_prorations",
            });
          }
        } else {
          // Only this pack uses the Stripe item — delete the item entirely
          await stripe.subscriptions.update(stripeSubId, {
            items: [
              {
                id: seatPackRecord.stripe_subscription_item_id,
                deleted: true,
              },
            ],
            proration_behavior: "create_prorations",
          });
        }

        // Update DB record
        await supabase
          .from("team_seat_packs")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", seatPackRecord.id);

        console.log(
          `[manage-subscription-items] Seat pack removed: id=${seatPackId}, user=${user.id}`,
        );

        return jsonResponse({ success: true });
      }

      default:
        return jsonResponse(
          { error: `Unknown action: ${action}. Valid actions: add_addon, remove_addon, add_seat_pack, remove_seat_pack` },
          400,
        );
    }
  } catch (err) {
    console.error("[manage-subscription-items] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { supabase } from "@/services/base/supabase";
import type {
  MarketingCampaign,
  CampaignStatus,
  RecipientSource,
} from "../types/marketing.types";

export async function getCampaigns(): Promise<MarketingCampaign[]> {
  const { data, error } = await supabase
    .from("bulk_email_campaigns")
    .select("*, marketing_audiences(*)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((c: any) => ({
    ...c,
    audience: c.marketing_audiences || undefined,
  }));
}

export async function getCampaign(id: string): Promise<MarketingCampaign> {
  const { data, error } = await supabase
    .from("bulk_email_campaigns")
    .select("*, marketing_audiences(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return {
    ...data,
    audience: data.marketing_audiences || undefined,
  } as MarketingCampaign;
}

export async function createCampaign(campaign: {
  name: string;
  subject_override?: string;
  campaign_type: string;
  template_id?: string;
  audience_id?: string;
  sms_content?: string;
  brand_settings?: Record<string, unknown>;
  recipient_source?: RecipientSource;
  status?: CampaignStatus;
  user_id: string;
}): Promise<MarketingCampaign> {
  const { data, error } = await supabase
    .from("bulk_email_campaigns")
    .insert({
      ...campaign,
      status: campaign.status ?? "draft",
      recipient_source: campaign.recipient_source ?? "manual",
      recipient_count: 0,
      sent_count: 0,
      opened_count: 0,
      clicked_count: 0,
      bounced_count: 0,
      failed_count: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as MarketingCampaign;
}

export async function updateCampaign(
  id: string,
  updates: Partial<
    Pick<
      MarketingCampaign,
      | "name"
      | "subject_override"
      | "template_id"
      | "audience_id"
      | "sms_content"
      | "brand_settings"
      | "status"
      | "scheduled_for"
    >
  >,
): Promise<MarketingCampaign> {
  const { data, error } = await supabase
    .from("bulk_email_campaigns")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as MarketingCampaign;
}

export async function deleteCampaign(id: string): Promise<void> {
  const { error } = await supabase
    .from("bulk_email_campaigns")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updateCampaignStatus(
  id: string,
  status: CampaignStatus,
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "sent") updates.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("bulk_email_campaigns")
    .update(updates)
    .eq("id", id);

  if (error) throw error;
}

export async function getCampaignRecipients(campaignId: string) {
  const { data, error } = await supabase
    .from("bulk_email_recipients")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addCampaignRecipients(
  campaignId: string,
  recipients: {
    email: string;
    first_name?: string;
    last_name?: string;
    variables?: Record<string, string>;
  }[],
): Promise<void> {
  const rows = recipients.map((r) => ({
    campaign_id: campaignId,
    email_address: r.email,
    first_name: r.first_name ?? null,
    last_name: r.last_name ?? null,
    status: "pending",
    variables: r.variables || {},
  }));

  const { error } = await supabase.from("bulk_email_recipients").insert(rows);

  if (error) throw error;

  // Update recipient_count on campaign
  const { count } = await supabase
    .from("bulk_email_recipients")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  await supabase
    .from("bulk_email_campaigns")
    .update({ recipient_count: count || 0 })
    .eq("id", campaignId);
}

export async function processBulkCampaign(
  campaignId: string,
  subject: string,
  html: string,
): Promise<{ remaining: number }> {
  const { data, error } = await supabase.functions.invoke(
    "process-bulk-campaign",
    { body: { campaign_id: campaignId, subject, html } },
  );
  if (error) throw error;
  return { remaining: data?.remaining ?? 0 };
}

// Reset failed recipients back to pending for resend
export async function resetFailedRecipients(
  campaignId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from("bulk_email_recipients")
    .update({ status: "pending", error_message: null })
    .eq("campaign_id", campaignId)
    .eq("status", "failed")
    .select("id");

  if (error) throw error;
  const resetCount = data?.length ?? 0;

  // Reset failed_count on campaign and set status back to sending
  await supabase
    .from("bulk_email_campaigns")
    .update({
      failed_count: 0,
      status: "sending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", campaignId);

  return resetCount;
}

// Duplicate a campaign with all its recipients
export async function duplicateCampaign(
  id: string,
  userId: string,
): Promise<MarketingCampaign> {
  // Get the original campaign
  const original = await getCampaign(id);

  // Create the copy
  const copy = await createCampaign({
    name: `Copy of ${original.name}`,
    subject_override: original.subject_override ?? undefined,
    campaign_type: original.campaign_type,
    template_id: original.template_id ?? undefined,
    audience_id: original.audience_id ?? undefined,
    sms_content: original.sms_content ?? undefined,
    brand_settings: original.brand_settings ?? undefined,
    recipient_source: original.recipient_source,
    status: "draft",
    user_id: userId,
  });

  // Copy recipients with status reset to pending
  const { data: recipients } = await supabase
    .from("bulk_email_recipients")
    .select("email_address, first_name, last_name, variables")
    .eq("campaign_id", id);

  if (recipients && recipients.length > 0) {
    const rows = recipients.map((r) => ({
      campaign_id: copy.id,
      email_address: r.email_address,
      first_name: r.first_name,
      last_name: r.last_name,
      status: "pending",
      variables: r.variables || {},
    }));

    await supabase.from("bulk_email_recipients").insert(rows);

    await supabase
      .from("bulk_email_campaigns")
      .update({ recipient_count: rows.length })
      .eq("id", copy.id);
  }

  return { ...copy, recipient_count: recipients?.length ?? 0 };
}

// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";
import type {
  EmailTemplate,
  CreateEmailTemplateRequest,
  EmailBlock,
} from "@/types/email.types";
import { blocksToHtml } from "../components/block-builder";

export interface EmailTemplateFilters {
  category?: string;
  isActive?: boolean;
  isGlobal?: boolean;
  isBlockTemplate?: boolean;
  searchQuery?: string;
}

export interface UserTemplateStatus {
  count: number;
  limit: number;
  canCreate: boolean;
}

const DEFAULT_TEMPLATE_LIMIT = 10;

export async function getEmailTemplates(
  filters?: EmailTemplateFilters,
): Promise<EmailTemplate[]> {
  let query = supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (filters?.category) {
    query = query.eq("category", filters.category);
  }
  if (filters?.isActive !== undefined) {
    query = query.eq("is_active", filters.isActive);
  }
  if (filters?.isGlobal !== undefined) {
    query = query.eq("is_global", filters.isGlobal);
  }
  if (filters?.isBlockTemplate !== undefined) {
    query = query.eq("is_block_template", filters.isBlockTemplate);
  }
  if (filters?.searchQuery) {
    // Escape special characters to prevent SQL injection
    const sanitized = filters.searchQuery.replace(/[%_\\]/g, "\\$&");
    query = query.or(`name.ilike.%${sanitized}%,subject.ilike.%${sanitized}%`);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as EmailTemplate[];
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from("email_templates")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

export async function createEmailTemplate(
  template: CreateEmailTemplateRequest,
  userId: string,
): Promise<EmailTemplate> {
  // If block template, generate HTML from blocks
  let bodyHtml = template.body_html;
  if (template.is_block_template && template.blocks) {
    bodyHtml = blocksToHtml(template.blocks);
  }

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      name: template.name,
      subject: template.subject,
      body_html: bodyHtml,
      body_text: template.body_text || null,
      variables: template.variables || [],
      category: template.category || "general",
      is_global: template.is_global ?? false,
      created_by: userId,
      blocks: template.blocks || null,
      is_block_template: template.is_block_template ?? false,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

export async function updateEmailTemplate(
  id: string,
  updates: Partial<CreateEmailTemplateRequest>,
): Promise<EmailTemplate> {
  // If updating blocks, regenerate HTML
  const updateData: Record<string, unknown> = { ...updates };
  if (updates.blocks) {
    updateData.body_html = blocksToHtml(updates.blocks as EmailBlock[]);
  }

  const { data, error } = await supabase
    .from("email_templates")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error } = await supabase
    .from("email_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function duplicateEmailTemplate(
  id: string,
  userId: string,
): Promise<EmailTemplate> {
  const original = await getEmailTemplate(id);

  const { data, error } = await supabase
    .from("email_templates")
    .insert({
      name: `${original.name} (Copy)`,
      subject: original.subject,
      body_html: original.body_html,
      body_text: original.body_text,
      variables: original.variables,
      category: original.category,
      is_global: false,
      created_by: userId,
      blocks: original.blocks,
      is_block_template: original.is_block_template,
    })
    .select()
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

export async function toggleTemplateActive(
  id: string,
  isActive: boolean,
): Promise<EmailTemplate> {
  const { data, error } = await supabase
    .from("email_templates")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as EmailTemplate;
}

/**
 * Get user's personal template count and limit
 */
export async function getUserTemplateStatus(
  userId: string,
): Promise<UserTemplateStatus> {
  // Get user's limit from settings (use maybeSingle since user may not have settings row)
  const { data: settings } = await supabase
    .from("settings")
    .select("email_template_limit")
    .eq("user_id", userId)
    .maybeSingle();

  const limit = settings?.email_template_limit ?? DEFAULT_TEMPLATE_LIMIT;

  // Count user's personal templates
  const { count, error } = await supabase
    .from("email_templates")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId)
    .eq("is_global", false);

  if (error) throw error;

  const currentCount = count ?? 0;

  return {
    count: currentCount,
    limit,
    canCreate: currentCount < limit,
  };
}

/**
 * Get templates grouped by type (global vs personal)
 */
export async function getGroupedEmailTemplates(userId: string): Promise<{
  globalTemplates: EmailTemplate[];
  personalTemplates: EmailTemplate[];
  status: UserTemplateStatus;
}> {
  // Templates query - RLS will filter to global + user's own
  const { data: templates, error } = await supabase
    .from("email_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;

  const allTemplates = (templates as EmailTemplate[]) || [];

  // Separate global from personal
  const globalTemplates = allTemplates.filter((t) => t.is_global);
  const personalTemplates = allTemplates.filter(
    (t) => !t.is_global && t.created_by === userId,
  );

  // Get user's status
  const status = await getUserTemplateStatus(userId);

  return {
    globalTemplates,
    personalTemplates,
    status,
  };
}

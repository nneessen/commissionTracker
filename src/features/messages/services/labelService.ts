// src/features/messages/services/labelService.ts
// Service for managing email labels

import { supabase } from "@/services/base/supabase";

export interface Label {
  id: string;
  name: string;
  color: string;
  is_system: boolean;
  message_count?: number;
}

export interface CreateLabelParams {
  userId: string;
  name: string;
  color?: string;
}

export interface UpdateLabelParams {
  labelId: string;
  name?: string;
  color?: string;
}

// System label names
export const SYSTEM_LABELS = [
  "Inbox",
  "Sent",
  "Drafts",
  "Scheduled",
  "Archived",
  "Important",
  "Spam",
] as const;

// Default colors for labels
export const LABEL_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#14b8a6", // teal
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#6b7280", // gray
] as const;

export async function getLabels(userId: string): Promise<Label[]> {
  const { data, error } = await supabase
    .from("email_labels")
    .select("*")
    .eq("user_id", userId)
    .order("is_system", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching labels:", error);
    throw error;
  }

  // Get message counts for each label
  const labelsWithCounts = await Promise.all(
    (data || []).map(async (label: Label) => {
      const { count } = await supabase
        .from("email_threads")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .contains("labels", [label.id]);

      return {
        ...label,
        message_count: count || 0,
      };
    }),
  );

  return labelsWithCounts;
}

export async function createLabel(
  params: CreateLabelParams,
): Promise<Label | null> {
  const { userId, name, color = LABEL_COLORS[0] } = params;

  // Check if label with same name exists
  const { data: existing } = await supabase
    .from("email_labels")
    .select("id")
    .eq("user_id", userId)
    .eq("name", name)
    .single();

  if (existing) {
    throw new Error("A label with this name already exists");
  }

  const { data, error } = await supabase
    .from("email_labels")
    .insert({
      user_id: userId,
      name,
      color,
      is_system: false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating label:", error);
    throw error;
  }

  return data;
}

export async function updateLabel(
  userId: string,
  params: UpdateLabelParams,
): Promise<Label | null> {
  const { labelId, name, color } = params;

  // Don't allow updating system labels
  const { data: existing } = await supabase
    .from("email_labels")
    .select("is_system")
    .eq("id", labelId)
    .eq("user_id", userId)
    .single();

  if (existing?.is_system) {
    throw new Error("Cannot modify system labels");
  }

  const updates: Partial<Label> = {};
  if (name !== undefined) updates.name = name;
  if (color !== undefined) updates.color = color;

  const { data, error } = await supabase
    .from("email_labels")
    .update(updates)
    .eq("id", labelId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error updating label:", error);
    throw error;
  }

  return data;
}

export async function deleteLabel(
  userId: string,
  labelId: string,
): Promise<boolean> {
  // Don't allow deleting system labels
  const { data: existing } = await supabase
    .from("email_labels")
    .select("is_system")
    .eq("id", labelId)
    .eq("user_id", userId)
    .single();

  if (existing?.is_system) {
    throw new Error("Cannot delete system labels");
  }

  // Remove label from all threads first
  const { data: threads } = await supabase
    .from("email_threads")
    .select("id, labels")
    .eq("user_id", userId)
    .contains("labels", [labelId]);

  if (threads && threads.length > 0) {
    await Promise.all(
      threads.map((thread: { id: string; labels: string[] | null }) =>
        supabase
          .from("email_threads")
          .update({
            labels: (thread.labels || []).filter((l: string) => l !== labelId),
          })
          .eq("id", thread.id),
      ),
    );
  }

  // Delete the label
  const { error } = await supabase
    .from("email_labels")
    .delete()
    .eq("id", labelId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting label:", error);
    throw error;
  }

  return true;
}

export async function ensureSystemLabels(userId: string): Promise<void> {
  // This would typically be called when a user is first created
  // or when they first access the messages feature
  const { data: existingLabels } = await supabase
    .from("email_labels")
    .select("name")
    .eq("user_id", userId)
    .eq("is_system", true);

  const existingNames = new Set(
    existingLabels?.map((l: { name: string }) => l.name) || [],
  );

  const systemLabelColors: Record<string, string> = {
    Inbox: "#3b82f6",
    Sent: "#22c55e",
    Drafts: "#f97316",
    Scheduled: "#8b5cf6",
    Archived: "#6b7280",
    Important: "#eab308",
    Spam: "#ef4444",
  };

  const missingLabels = SYSTEM_LABELS.filter(
    (name) => !existingNames.has(name),
  );

  if (missingLabels.length > 0) {
    await supabase.from("email_labels").insert(
      missingLabels.map((name) => ({
        user_id: userId,
        name,
        color: systemLabelColors[name] || "#6b7280",
        is_system: true,
      })),
    );
  }
}

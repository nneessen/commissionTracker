// src/services/settings/carriers/BuildChartService.ts

import { supabase } from "@/services/base/supabase";
import type { Database } from "@/types/database.types";
import type {
  BuildTableData,
  BmiTableData,
  BuildTableType,
  BuildChartDisplay,
  BuildChartOption,
} from "@/features/underwriting/types/build-table.types";

type CarrierBuildChartRow =
  Database["public"]["Tables"]["carrier_build_charts"]["Row"];

// ============================================================================
// Input Types
// ============================================================================

export type CreateBuildChartInput = {
  carrierId: string;
  imoId: string;
  name: string;
  tableType: BuildTableType;
  buildData: BuildTableData;
  bmiData?: BmiTableData | null;
  notes?: string | null;
  isDefault?: boolean;
};

export type UpdateBuildChartInput = {
  id: string;
  name?: string;
  tableType?: BuildTableType;
  buildData?: BuildTableData;
  bmiData?: BmiTableData | null;
  notes?: string | null;
  isDefault?: boolean;
};

// ============================================================================
// Service Functions
// ============================================================================

export async function fetchBuildChartsByCarrier(
  carrierId: string,
  imoId: string,
): Promise<BuildChartDisplay[]> {
  const { data, error } = await supabase
    .from("carrier_build_charts")
    .select(
      `
      id,
      carrier_id,
      name,
      table_type,
      build_data,
      bmi_data,
      notes,
      is_default,
      updated_at,
      carriers!inner(name)
    `,
    )
    .eq("carrier_id", carrierId)
    .eq("imo_id", imoId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch build charts: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    carrierId: row.carrier_id,
    carrierName: (row.carriers as unknown as { name: string }).name,
    name: row.name,
    tableType: row.table_type as BuildTableType,
    buildData: row.build_data as unknown as BuildTableData,
    bmiData: row.bmi_data as unknown as BmiTableData | null,
    notes: row.notes,
    isDefault: row.is_default,
    updatedAt: row.updated_at,
  }));
}

export async function fetchBuildChartOptions(
  carrierId: string,
  imoId: string,
): Promise<BuildChartOption[]> {
  const { data, error } = await supabase
    .from("carrier_build_charts")
    .select("id, name, table_type, is_default")
    .eq("carrier_id", carrierId)
    .eq("imo_id", imoId)
    .order("is_default", { ascending: false })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch build chart options: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.name,
    tableType: row.table_type as BuildTableType,
    isDefault: row.is_default,
  }));
}

export async function fetchBuildChart(
  chartId: string,
): Promise<CarrierBuildChartRow | null> {
  const { data, error } = await supabase
    .from("carrier_build_charts")
    .select("*")
    .eq("id", chartId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch build chart: ${error.message}`);
  }

  return data;
}

export async function createBuildChart(
  input: CreateBuildChartInput,
): Promise<CarrierBuildChartRow> {
  // If this is being set as default, unset other defaults first
  if (input.isDefault) {
    await supabase
      .from("carrier_build_charts")
      .update({ is_default: false })
      .eq("carrier_id", input.carrierId)
      .eq("imo_id", input.imoId);
  }

  const { data, error } = await supabase
    .from("carrier_build_charts")
    .insert({
      carrier_id: input.carrierId,
      imo_id: input.imoId,
      name: input.name,
      table_type: input.tableType,
      build_data:
        input.buildData as unknown as Database["public"]["Tables"]["carrier_build_charts"]["Insert"]["build_data"],
      bmi_data:
        input.bmiData as unknown as Database["public"]["Tables"]["carrier_build_charts"]["Insert"]["bmi_data"],
      notes: input.notes,
      is_default: input.isDefault ?? false,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create build chart: ${error.message}`);
  }

  return data;
}

export async function updateBuildChart(
  input: UpdateBuildChartInput,
): Promise<CarrierBuildChartRow> {
  // First get the existing chart to know carrier/imo for default handling
  if (input.isDefault) {
    const existing = await fetchBuildChart(input.id);
    if (existing) {
      await supabase
        .from("carrier_build_charts")
        .update({ is_default: false })
        .eq("carrier_id", existing.carrier_id)
        .eq("imo_id", existing.imo_id)
        .neq("id", input.id);
    }
  }

  const updateData: Database["public"]["Tables"]["carrier_build_charts"]["Update"] =
    {};

  if (input.name !== undefined) updateData.name = input.name;
  if (input.tableType !== undefined) updateData.table_type = input.tableType;
  if (input.buildData !== undefined)
    updateData.build_data =
      input.buildData as unknown as Database["public"]["Tables"]["carrier_build_charts"]["Update"]["build_data"];
  if (input.bmiData !== undefined)
    updateData.bmi_data =
      input.bmiData as unknown as Database["public"]["Tables"]["carrier_build_charts"]["Update"]["bmi_data"];
  if (input.notes !== undefined) updateData.notes = input.notes;
  if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

  const { data, error } = await supabase
    .from("carrier_build_charts")
    .update(updateData)
    .eq("id", input.id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update build chart: ${error.message}`);
  }

  return data;
}

export async function deleteBuildChart(chartId: string): Promise<void> {
  // Check if any products reference this chart
  const { data: products, error: checkError } = await supabase
    .from("products")
    .select("id, name")
    .eq("build_chart_id", chartId)
    .limit(5);

  if (checkError) {
    throw new Error(
      `Failed to check product references: ${checkError.message}`,
    );
  }

  if (products && products.length > 0) {
    const productNames = products.map((p) => p.name).join(", ");
    throw new Error(
      `Cannot delete build chart: used by products (${productNames})`,
    );
  }

  const { error } = await supabase
    .from("carrier_build_charts")
    .delete()
    .eq("id", chartId);

  if (error) {
    throw new Error(`Failed to delete build chart: ${error.message}`);
  }
}

export async function setDefaultBuildChart(
  chartId: string,
  carrierId: string,
  imoId: string,
): Promise<CarrierBuildChartRow> {
  // Unset all other defaults for this carrier
  await supabase
    .from("carrier_build_charts")
    .update({ is_default: false })
    .eq("carrier_id", carrierId)
    .eq("imo_id", imoId);

  // Set this one as default
  const { data, error } = await supabase
    .from("carrier_build_charts")
    .update({ is_default: true })
    .eq("id", chartId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to set default build chart: ${error.message}`);
  }

  return data;
}

// src/services/recruiting/pipelineService.ts

import {supabase} from '@/services/base/supabase';
import type {PipelineTemplate, PipelinePhase, PhaseChecklistItem, CreateTemplateInput, UpdateTemplateInput, CreatePhaseInput, UpdatePhaseInput, CreateChecklistItemInput, UpdateChecklistItemInput} from '@/types/recruiting.types';

export const pipelineService = {
  // ========================================
  // PIPELINE TEMPLATES
  // ========================================

  async getTemplates() {
    const { data, error } = await supabase
      .from('pipeline_templates')
      .select('*')
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as PipelineTemplate[];
  },

  async getTemplate(id: string) {
    const { data, error } = await supabase
      .from('pipeline_templates')
      .select(
        `
        *,
        phases:pipeline_phases(
          *,
          checklist_items:phase_checklist_items(*)
        )
      `
      )
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as PipelineTemplate & {
      phases: (PipelinePhase & { checklist_items: PhaseChecklistItem[] })[];
    };
  },

  async getActiveTemplate() {
    const { data, error } = await supabase
      .from('pipeline_templates')
      .select(
        `
        *,
        phases:pipeline_phases(
          *,
          checklist_items:phase_checklist_items(*)
        )
      `
      )
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data as PipelineTemplate & {
      phases: (PipelinePhase & { checklist_items: PhaseChecklistItem[] })[];
    };
  },

  async createTemplate(templateData: CreateTemplateInput) {
    const { data, error } = await supabase
      .from('pipeline_templates')
      .insert(templateData)
      .select()
      .single();

    if (error) throw error;
    return data as PipelineTemplate;
  },

  async updateTemplate(id: string, updates: UpdateTemplateInput) {
    const { data, error } = await supabase
      .from('pipeline_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PipelineTemplate;
  },

  async deleteTemplate(id: string) {
    const { error } = await supabase.from('pipeline_templates').delete().eq('id', id);

    if (error) throw error;
  },

  async setDefaultTemplate(id: string) {
    // First, set all templates to non-default
    await supabase.from('pipeline_templates').update({ is_default: false }).neq('id', id);

    // Then set the selected one as default
    const { data, error } = await supabase
      .from('pipeline_templates')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as PipelineTemplate;
  },

  // ========================================
  // PIPELINE PHASES
  // ========================================

  async getPhases(templateId: string) {
    const { data, error } = await supabase
      .from('pipeline_phases')
      .select('*')
      .eq('template_id', templateId)
      .eq('is_active', true)
      .order('phase_order', { ascending: true });

    if (error) throw error;
    return data as PipelinePhase[];
  },

  async getPhase(phaseId: string) {
    const { data, error } = await supabase
      .from('pipeline_phases')
      .select(
        `
        *,
        checklist_items:phase_checklist_items(*)
      `
      )
      .eq('id', phaseId)
      .single();

    if (error) throw error;
    return data as PipelinePhase & { checklist_items: PhaseChecklistItem[] };
  },

  async createPhase(templateId: string, phaseData: CreatePhaseInput) {
    // Get the next phase_order number
    const { data: existingPhases } = await supabase
      .from('pipeline_phases')
      .select('phase_order')
      .eq('template_id', templateId)
      .order('phase_order', { ascending: false })
      .limit(1);

    const nextOrder = existingPhases && existingPhases.length > 0 ? existingPhases[0].phase_order + 1 : 1;

    const { data, error } = await supabase
      .from('pipeline_phases')
      .insert({
        template_id: templateId,
        ...phaseData,
        phase_order: phaseData.phase_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PipelinePhase;
  },

  async updatePhase(phaseId: string, updates: UpdatePhaseInput) {
    const { data, error } = await supabase
      .from('pipeline_phases')
      .update(updates)
      .eq('id', phaseId)
      .select()
      .single();

    if (error) throw error;
    return data as PipelinePhase;
  },

  async deletePhase(phaseId: string) {
    const { error } = await supabase.from('pipeline_phases').delete().eq('id', phaseId);

    if (error) throw error;
  },

  async reorderPhases(_templateId: string, phaseIds: string[]) {
    // Update phase_order for each phase
    const updates = phaseIds.map((phaseId, index) => ({
      id: phaseId,
      phase_order: index + 1,
    }));

    for (const update of updates) {
      await supabase.from('pipeline_phases').update({ phase_order: update.phase_order }).eq('id', update.id);
    }
  },

  // ========================================
  // CHECKLIST ITEMS
  // ========================================

  async getChecklistItems(phaseId: string) {
    const { data, error } = await supabase
      .from('phase_checklist_items')
      .select('*')
      .eq('phase_id', phaseId)
      .order('item_order', { ascending: true });

    if (error) throw error;
    return data as PhaseChecklistItem[];
  },

  async getChecklistItem(itemId: string) {
    const { data, error } = await supabase
      .from('phase_checklist_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (error) throw error;
    return data as PhaseChecklistItem;
  },

  async createChecklistItem(phaseId: string, itemData: CreateChecklistItemInput) {
    // Get the next item_order number
    const { data: existingItems } = await supabase
      .from('phase_checklist_items')
      .select('item_order')
      .eq('phase_id', phaseId)
      .order('item_order', { ascending: false })
      .limit(1);

    const nextOrder = existingItems && existingItems.length > 0 ? existingItems[0].item_order + 1 : 1;

    const { data, error } = await supabase
      .from('phase_checklist_items')
      .insert({
        phase_id: phaseId,
        ...itemData,
        item_order: itemData.item_order ?? nextOrder,
      })
      .select()
      .single();

    if (error) throw error;
    return data as PhaseChecklistItem;
  },

  async updateChecklistItem(itemId: string, updates: UpdateChecklistItemInput) {
    const { data, error } = await supabase
      .from('phase_checklist_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data as PhaseChecklistItem;
  },

  async deleteChecklistItem(itemId: string) {
    const { error } = await supabase.from('phase_checklist_items').delete().eq('id', itemId);

    if (error) throw error;
  },

  async reorderChecklistItems(_phaseId: string, itemIds: string[]) {
    // Update item_order for each item
    const updates = itemIds.map((itemId, index) => ({
      id: itemId,
      item_order: index + 1,
    }));

    for (const update of updates) {
      await supabase.from('phase_checklist_items').update({ item_order: update.item_order }).eq('id', update.id);
    }
  },
};

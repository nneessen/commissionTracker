-- supabase/migrations/20260220135021_add_recruits_checklist_summary_rpc.sql
-- RPC to efficiently return checklist progress for multiple recruits at once.
-- Used by the recruiting table "Progress" column.

CREATE OR REPLACE FUNCTION public.get_recruits_checklist_summary(recruit_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  current_phase_id UUID,
  total_items INT,
  completed_items INT,
  is_last_item BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    rpp.user_id,
    rpp.phase_id AS current_phase_id,
    COALESCE(ci.total_items, 0)::INT AS total_items,
    COALESCE(cp.completed_items, 0)::INT AS completed_items,
    (COALESCE(ci.total_items, 0) - COALESCE(cp.completed_items, 0) = 1) AS is_last_item
  FROM recruit_phase_progress rpp
  -- Count total active checklist items for the phase
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS total_items
    FROM phase_checklist_items pci
    WHERE pci.phase_id = rpp.phase_id
      AND pci.is_active = true
  ) ci ON true
  -- Count completed checklist items for this recruit in this phase
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INT AS completed_items
    FROM recruit_checklist_progress rcp
    WHERE rcp.user_id = rpp.user_id
      AND rcp.checklist_item_id IN (
        SELECT pci2.id FROM phase_checklist_items pci2
        WHERE pci2.phase_id = rpp.phase_id AND pci2.is_active = true
      )
      AND rcp.status IN ('completed', 'verified', 'approved')
  ) cp ON true
  WHERE rpp.user_id = ANY(recruit_ids)
    AND rpp.status = 'in_progress';
END;
$function$;

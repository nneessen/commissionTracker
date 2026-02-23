-- Add atomic update/delete RPCs for lead purchases mirrored to expenses
-- Used by the Expenses > Lead Purchases tab to avoid partial client-side sync writes.

CREATE OR REPLACE FUNCTION public.update_lead_purchase_with_expense(
  p_purchase_id uuid,
  p_vendor_id uuid,
  p_lead_count integer,
  p_total_cost numeric,
  p_purchase_date date,
  p_purchase_name text DEFAULT NULL,
  p_lead_freshness public.lead_freshness DEFAULT 'fresh',
  p_policies_sold integer DEFAULT 0,
  p_commission_earned numeric DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_purchase_owner_id uuid;
  v_expense_id uuid;
  v_vendor_name text;
  v_expense_name text;
  v_expense_description text;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'Purchase id is required';
  END IF;

  IF p_vendor_id IS NULL THEN
    RAISE EXCEPTION 'Vendor is required';
  END IF;

  IF p_lead_count IS NULL OR p_lead_count <= 0 THEN
    RAISE EXCEPTION 'Lead count must be a positive integer';
  END IF;

  IF p_total_cost IS NULL OR p_total_cost < 0 THEN
    RAISE EXCEPTION 'Total cost must be a non-negative number';
  END IF;

  IF p_purchase_date IS NULL THEN
    RAISE EXCEPTION 'Purchase date is required';
  END IF;

  IF COALESCE(p_policies_sold, 0) < 0 THEN
    RAISE EXCEPTION 'Policies sold must be a non-negative integer';
  END IF;

  IF COALESCE(p_commission_earned, 0) < 0 THEN
    RAISE EXCEPTION 'Commission earned must be a non-negative number';
  END IF;

  SELECT lv.name
  INTO v_vendor_name
  FROM public.lead_vendors lv
  WHERE lv.id = p_vendor_id;

  IF v_vendor_name IS NULL THEN
    RAISE EXCEPTION 'Lead vendor not found or not accessible';
  END IF;

  SELECT lp.user_id, lp.expense_id
  INTO v_purchase_owner_id, v_expense_id
  FROM public.lead_purchases lp
  WHERE lp.id = p_purchase_id
  FOR UPDATE;

  IF v_purchase_owner_id IS NULL OR v_purchase_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Lead purchase not found or not accessible';
  END IF;

  UPDATE public.lead_purchases
  SET
    vendor_id = p_vendor_id,
    purchase_name = NULLIF(BTRIM(p_purchase_name), ''),
    lead_freshness = COALESCE(p_lead_freshness, 'fresh'::public.lead_freshness),
    lead_count = p_lead_count,
    total_cost = p_total_cost,
    purchase_date = p_purchase_date,
    policies_sold = COALESCE(p_policies_sold, 0),
    commission_earned = COALESCE(p_commission_earned, 0),
    notes = p_notes,
    updated_at = now()
  WHERE id = p_purchase_id
    AND user_id = v_user_id;

  v_expense_name := COALESCE(
    NULLIF(BTRIM(p_purchase_name), ''),
    'Lead Purchase - ' || v_vendor_name
  );
  v_expense_description := 'Lead pack purchase (' || v_vendor_name || ')';

  IF v_expense_id IS NOT NULL THEN
    UPDATE public.expenses
    SET
      name = v_expense_name,
      description = v_expense_description,
      amount = p_total_cost,
      category = 'Life Insurance Leads',
      expense_type = 'business'::public.expense_type,
      date = p_purchase_date,
      notes = p_notes,
      lead_purchase_id = p_purchase_id,
      updated_at = now()
    WHERE id = v_expense_id
      AND user_id = v_user_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Linked expense not found or not accessible';
    END IF;
  END IF;

  RETURN p_purchase_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_lead_purchase_with_expense(
  p_purchase_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_purchase_owner_id uuid;
  v_expense_id uuid;
  v_deleted_expense boolean := false;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_purchase_id IS NULL THEN
    RAISE EXCEPTION 'Purchase id is required';
  END IF;

  SELECT lp.user_id, lp.expense_id
  INTO v_purchase_owner_id, v_expense_id
  FROM public.lead_purchases lp
  WHERE lp.id = p_purchase_id
  FOR UPDATE;

  IF v_purchase_owner_id IS NULL OR v_purchase_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Lead purchase not found or not accessible';
  END IF;

  IF v_expense_id IS NOT NULL THEN
    DELETE FROM public.expenses
    WHERE id = v_expense_id
      AND user_id = v_user_id;

    v_deleted_expense := FOUND;

    IF NOT v_deleted_expense THEN
      RAISE EXCEPTION 'Linked expense not found or not accessible';
    END IF;
  END IF;

  DELETE FROM public.lead_purchases
  WHERE id = p_purchase_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead purchase delete failed';
  END IF;

  RETURN jsonb_build_object(
    'deleted_lead_purchase', true,
    'deleted_expense', v_deleted_expense
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_lead_purchase_with_expense(
  uuid,
  uuid,
  integer,
  numeric,
  date,
  text,
  public.lead_freshness,
  integer,
  numeric,
  text
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_lead_purchase_with_expense(
  uuid,
  uuid,
  integer,
  numeric,
  date,
  text,
  public.lead_freshness,
  integer,
  numeric,
  text
) TO service_role;

GRANT EXECUTE ON FUNCTION public.delete_lead_purchase_with_expense(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_lead_purchase_with_expense(uuid) TO service_role;

COMMENT ON FUNCTION public.update_lead_purchase_with_expense(
  uuid,
  uuid,
  integer,
  numeric,
  date,
  text,
  public.lead_freshness,
  integer,
  numeric,
  text
) IS 'Atomically updates a lead_purchases row and its linked mirrored expenses row for the current authenticated user.';

COMMENT ON FUNCTION public.delete_lead_purchase_with_expense(uuid) IS
'Atomically deletes a lead_purchases row and its linked mirrored expenses row for the current authenticated user.';

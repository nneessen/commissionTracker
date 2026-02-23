-- Atomically create a lead purchase and its mirrored expense record
-- Used by the Expenses > Lead Purchases tab so spend appears in both tabs consistently.

CREATE OR REPLACE FUNCTION public.create_lead_purchase_with_expense(
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
  v_vendor_name text;
  v_expense_name text;
  v_expense_description text;
  v_expense_id uuid;
  v_lead_purchase_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
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

  v_expense_name := COALESCE(
    NULLIF(BTRIM(p_purchase_name), ''),
    'Lead Purchase - ' || v_vendor_name
  );
  v_expense_description := 'Lead pack purchase (' || v_vendor_name || ')';

  INSERT INTO public.expenses (
    user_id,
    name,
    description,
    amount,
    category,
    expense_type,
    date,
    is_recurring,
    recurring_frequency,
    recurring_group_id,
    recurring_end_date,
    is_tax_deductible,
    receipt_url,
    notes
  )
  VALUES (
    v_user_id,
    v_expense_name,
    v_expense_description,
    p_total_cost,
    'Life Insurance Leads',
    'business'::public.expense_type,
    p_purchase_date,
    false,
    NULL,
    NULL,
    NULL,
    false,
    NULL,
    p_notes
  )
  RETURNING id INTO v_expense_id;

  INSERT INTO public.lead_purchases (
    user_id,
    expense_id,
    vendor_id,
    purchase_name,
    lead_freshness,
    lead_count,
    total_cost,
    purchase_date,
    policies_sold,
    commission_earned,
    notes
  )
  VALUES (
    v_user_id,
    v_expense_id,
    p_vendor_id,
    NULLIF(BTRIM(p_purchase_name), ''),
    COALESCE(p_lead_freshness, 'fresh'::public.lead_freshness),
    p_lead_count,
    p_total_cost,
    p_purchase_date,
    COALESCE(p_policies_sold, 0),
    COALESCE(p_commission_earned, 0),
    p_notes
  )
  RETURNING id INTO v_lead_purchase_id;

  UPDATE public.expenses
  SET lead_purchase_id = v_lead_purchase_id
  WHERE id = v_expense_id;

  RETURN v_lead_purchase_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_lead_purchase_with_expense(
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

GRANT EXECUTE ON FUNCTION public.create_lead_purchase_with_expense(
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

COMMENT ON FUNCTION public.create_lead_purchase_with_expense(
  uuid,
  integer,
  numeric,
  date,
  text,
  public.lead_freshness,
  integer,
  numeric,
  text
) IS 'Atomically creates a lead_purchases row and mirrored expenses row for the current authenticated user, then links both records.';

-- Fix commission progress rows that were inflated by manual paid-status updates.
--
-- Business rule:
-- - months_paid advances only on completed month anniversaries from policy effective_date
-- - earned_amount = advance_amount / advance_months * months_paid
-- - unearned_amount = advance_amount - earned_amount
-- - paid status means the advance was received, not that the full advance is earned

WITH recalculated_advances AS (
  SELECT
    c.id,
    COALESCE(c.amount, 0)::numeric AS amount,
    COALESCE(NULLIF(c.advance_months, 0), 9) AS advance_months,
    LEAST(
      COALESCE(NULLIF(c.advance_months, 0), 9),
      GREATEST(
        0,
        CASE
          WHEN p.effective_date IS NULL THEN COALESCE(c.months_paid, 0)
          WHEN p.lifecycle_status IN ('cancelled', 'lapsed') AND p.cancellation_date IS NULL THEN COALESCE(c.months_paid, 0)
          ELSE FLOOR(
            EXTRACT(YEAR FROM AGE(
              CASE
                WHEN p.lifecycle_status IN ('cancelled', 'lapsed') THEN p.cancellation_date
                ELSE CURRENT_DATE
              END,
              p.effective_date
            )) * 12 +
            EXTRACT(MONTH FROM AGE(
              CASE
                WHEN p.lifecycle_status IN ('cancelled', 'lapsed') THEN p.cancellation_date
                ELSE CURRENT_DATE
              END,
              p.effective_date
            ))
          )::integer
        END
      )
    ) AS months_paid
  FROM public.commissions AS c
  JOIN public.policies AS p
    ON p.id = c.policy_id
  WHERE c.type = 'advance'
),
recalculated_amounts AS (
  SELECT
    id,
    months_paid,
    ROUND((amount / advance_months::numeric) * months_paid, 2) AS earned_amount,
    GREATEST(
      0::numeric,
      ROUND(amount - ((amount / advance_months::numeric) * months_paid), 2)
    ) AS unearned_amount
  FROM recalculated_advances
)
UPDATE public.commissions AS c
SET
  months_paid = r.months_paid,
  earned_amount = r.earned_amount,
  unearned_amount = r.unearned_amount,
  updated_at = NOW()
FROM recalculated_amounts AS r
WHERE c.id = r.id
  AND (
    c.months_paid IS DISTINCT FROM r.months_paid OR
    c.earned_amount IS DISTINCT FROM r.earned_amount OR
    c.unearned_amount IS DISTINCT FROM r.unearned_amount
  );

-- Keep charged back advances aligned with the corrected unearned balance.
UPDATE public.commissions
SET
  chargeback_amount = unearned_amount,
  updated_at = NOW()
WHERE type = 'advance'
  AND status = 'charged_back'
  AND chargeback_amount IS DISTINCT FROM unearned_amount;

-- Resync override months_paid with the corrected base advance rows.
-- The existing BEFORE UPDATE trigger on override_commissions recalculates
-- earned_amount and unearned_amount from months_paid automatically.
UPDATE public.override_commissions AS oc
SET
  months_paid = LEAST(
    COALESCE(NULLIF(oc.advance_months, 0), 9),
    COALESCE(c.months_paid, 0)
  ),
  updated_at = NOW()
FROM public.commissions AS c
WHERE c.policy_id = oc.policy_id
  AND c.user_id = oc.base_agent_id
  AND c.type = 'advance'
  AND oc.months_paid IS DISTINCT FROM LEAST(
    COALESCE(NULLIF(oc.advance_months, 0), 9),
    COALESCE(c.months_paid, 0)
  );

UPDATE public.override_commissions
SET
  chargeback_amount = unearned_amount,
  updated_at = NOW()
WHERE status = 'charged_back'
  AND chargeback_amount IS DISTINCT FROM unearned_amount;

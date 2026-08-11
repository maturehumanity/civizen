-- Correct WS-13 / WS-23 period_label only (doc 14: M2–M24).
-- Amounts, approval, and publication unchanged.
-- Cause: duration_months=24 with earliest_start_month=2 produced inclusive end Month 25.

UPDATE public.budget_line_items
SET period_label = 'Months 2–24 · working estimate'
WHERE title LIKE 'WS-13 ·%'
  AND period_label = 'Months 2–25 · working estimate';

UPDATE public.budget_line_items
SET period_label = 'Months 2–24 · working estimate'
WHERE title LIKE 'WS-23 ·%'
  AND period_label = 'Months 2–25 · working estimate';

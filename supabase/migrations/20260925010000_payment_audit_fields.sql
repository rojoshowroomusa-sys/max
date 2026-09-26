-- Auditoría y transiciones seguras de Mercado Pago.
-- La orden se crea antes de la Preference para que el webhook siempre pueda
-- encontrar su snapshot; paid_at permite conservar la primera acreditación.

alter table public.orders
  add column if not exists paid_at timestamptz;

alter table public.payments
  add column if not exists amount numeric(12, 2),
  add column if not exists currency_id text,
  add column if not exists preference_id text;

comment on column public.orders.paid_at is
  'Fecha de la primera acreditación confirmada server-side del pago';
comment on column public.payments.amount is
  'Importe verificado en la API de Mercado Pago, en ARS';

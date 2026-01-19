alter table public.cards
add column if not exists bin_card_type text,
add column if not exists bin_issuer text,
add column if not exists bin_country text;

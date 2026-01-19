alter table public.transactions
drop column if exists classification;

drop policy if exists classification_cache_owner_select on public.classification_cache;
drop policy if exists classification_cache_owner_insert on public.classification_cache;
drop policy if exists classification_cache_owner_update on public.classification_cache;
drop policy if exists classification_cache_owner_delete on public.classification_cache;

drop index if exists public.classification_cache_user_id_idx;

drop table if exists public.classification_cache;

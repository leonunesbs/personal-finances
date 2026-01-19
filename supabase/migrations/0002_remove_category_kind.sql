alter table public.categories drop constraint if exists categories_user_id_name_kind_key;
alter table public.categories drop column if exists kind;
alter table public.categories add constraint categories_user_id_name_key unique (user_id, name);

drop type if exists category_kind;

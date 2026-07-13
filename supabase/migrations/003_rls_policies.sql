-- NexaPay Phase 18 Row Level Security hardening
-- Educational Demo - No Real Money or Financial Transactions

-- This file is safe to rerun in Supabase SQL Editor.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
grant usage on schema public to authenticated;

alter table public.system_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.money_requests enable row level security;
alter table public.favorites enable row level security;
alter table public.merchants enable row level security;
alter table public.agents enable row level security;
alter table public.service_categories enable row level security;
alter table public.recharge_operators enable row level security;
alter table public.bill_categories enable row level security;
alter table public.bill_providers enable row level security;
alter table public.banks enable row level security;
alter table public.donation_organizations enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_goal_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.promotions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "Public active settings are readable" on public.system_settings;
drop policy if exists "Admins manage settings" on public.system_settings;
drop policy if exists "Authenticated users read safe settings" on public.system_settings;

drop policy if exists "Users read own profile" on public.profiles;
drop policy if exists "Users update safe own profile fields" on public.profiles;
drop policy if exists "Admins read profiles" on public.profiles;

drop policy if exists "Users view own wallet" on public.wallets;
drop policy if exists "Admins read wallets" on public.wallets;

drop policy if exists "Users view related transactions" on public.transactions;
drop policy if exists "Admins read transactions" on public.transactions;

drop policy if exists "Users create outgoing money requests" on public.money_requests;
drop policy if exists "Users see involving money requests" on public.money_requests;
drop policy if exists "Users cancel own pending requests" on public.money_requests;
drop policy if exists "Admins read money requests" on public.money_requests;

drop policy if exists "Users manage own favorites" on public.favorites;
drop policy if exists "Users read own favorites" on public.favorites;
drop policy if exists "Users insert own favorites" on public.favorites;
drop policy if exists "Users delete own favorites" on public.favorites;
drop policy if exists "Admins read favorites" on public.favorites;

drop policy if exists "Active merchants are readable" on public.merchants;
drop policy if exists "Merchant owners update own merchant profile" on public.merchants;
drop policy if exists "Admins manage merchants" on public.merchants;
drop policy if exists "Admins read merchants" on public.merchants;

drop policy if exists "Active agents are readable" on public.agents;
drop policy if exists "Admins manage agents" on public.agents;
drop policy if exists "Admins read agents" on public.agents;

drop policy if exists "Users read active service categories" on public.service_categories;
drop policy if exists "Users read active recharge operators" on public.recharge_operators;
drop policy if exists "Users read active bill categories" on public.bill_categories;
drop policy if exists "Users read active bill providers" on public.bill_providers;
drop policy if exists "Users read active banks" on public.banks;
drop policy if exists "Users read active donation organizations" on public.donation_organizations;
drop policy if exists "Admins manage service content" on public.service_categories;
drop policy if exists "Admins manage recharge operators" on public.recharge_operators;
drop policy if exists "Admins manage bill categories" on public.bill_categories;
drop policy if exists "Admins manage bill providers" on public.bill_providers;
drop policy if exists "Admins manage banks" on public.banks;
drop policy if exists "Admins manage donation organizations" on public.donation_organizations;

drop policy if exists "Users manage own savings goals" on public.savings_goals;
drop policy if exists "Users read own savings goals" on public.savings_goals;
drop policy if exists "Admins manage savings goals" on public.savings_goals;
drop policy if exists "Admins read savings goals" on public.savings_goals;
drop policy if exists "Users read own savings goal entries" on public.savings_goal_entries;
drop policy if exists "Admins read savings goal entries" on public.savings_goal_entries;

drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "Users delete own notifications" on public.notifications;
drop policy if exists "Admins read notifications" on public.notifications;

drop policy if exists "Users read active promotions" on public.promotions;
drop policy if exists "Admins manage promotions" on public.promotions;
drop policy if exists "Admins read promotions" on public.promotions;

drop policy if exists "Admins read audit logs" on public.audit_logs;

create or replace function public.protect_merchant_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() = old.owner_id and (
    new.owner_id is distinct from old.owner_id
    or new.merchant_code is distinct from old.merchant_code
    or new.qr_identifier is distinct from old.qr_identifier
    or new.status is distinct from old.status
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Merchant owners can only update safe merchant profile fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_merchant_sensitive_fields on public.merchants;
create trigger protect_merchant_sensitive_fields
before update on public.merchants
for each row execute function public.protect_merchant_sensitive_fields();

create or replace function public.protect_notification_content_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if auth.uid() = old.user_id and (
    new.user_id is distinct from old.user_id
    or new.title is distinct from old.title
    or new.message is distinct from old.message
    or new.type is distinct from old.type
    or new.created_at is distinct from old.created_at
  ) then
    raise exception 'Users can only update notification read state.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_notification_content_fields on public.notifications;
create trigger protect_notification_content_fields
before update on public.notifications
for each row execute function public.protect_notification_content_fields();

create policy "Authenticated users read safe settings"
on public.system_settings for select
to authenticated
using (true);

create policy "Users read own profile"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "Admins read profiles"
on public.profiles for select
to authenticated
using (public.is_admin());

create policy "Users update safe own profile fields"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "Users view own wallet"
on public.wallets for select
to authenticated
using (user_id = auth.uid());

create policy "Admins read wallets"
on public.wallets for select
to authenticated
using (public.is_admin());

create policy "Users view related transactions"
on public.transactions for select
to authenticated
using (
  exists (
    select 1
    from public.wallets w
    where w.user_id = auth.uid()
      and (w.id = sender_wallet_id or w.id = receiver_wallet_id)
  )
);

create policy "Admins read transactions"
on public.transactions for select
to authenticated
using (public.is_admin());

create policy "Users see involving money requests"
on public.money_requests for select
to authenticated
using (sender_id = auth.uid() or receiver_id = auth.uid());

create policy "Admins read money requests"
on public.money_requests for select
to authenticated
using (public.is_admin());

create policy "Users read own favorites"
on public.favorites for select
to authenticated
using (user_id = auth.uid());

create policy "Users insert own favorites"
on public.favorites for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users delete own favorites"
on public.favorites for delete
to authenticated
using (user_id = auth.uid());

create policy "Admins read favorites"
on public.favorites for select
to authenticated
using (public.is_admin());

create policy "Active merchants are readable"
on public.merchants for select
to authenticated
using (status = 'active' or owner_id = auth.uid());

create policy "Merchant owners update own merchant profile"
on public.merchants for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Admins read merchants"
on public.merchants for select
to authenticated
using (public.is_admin());

create policy "Active agents are readable"
on public.agents for select
to authenticated
using (status = 'active' or user_id = auth.uid());

create policy "Admins read agents"
on public.agents for select
to authenticated
using (public.is_admin());

create policy "Users read active service categories"
on public.service_categories for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Users read active recharge operators"
on public.recharge_operators for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Users read active bill categories"
on public.bill_categories for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Users read active bill providers"
on public.bill_providers for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Users read active banks"
on public.banks for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Users read active donation organizations"
on public.donation_organizations for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Users read own savings goals"
on public.savings_goals for select
to authenticated
using (user_id = auth.uid());

create policy "Admins read savings goals"
on public.savings_goals for select
to authenticated
using (public.is_admin());

create policy "Users read own savings goal entries"
on public.savings_goal_entries for select
to authenticated
using (
  exists (
    select 1
    from public.savings_goals sg
    where sg.id = goal_id
      and sg.user_id = auth.uid()
  )
);

create policy "Admins read savings goal entries"
on public.savings_goal_entries for select
to authenticated
using (public.is_admin());

create policy "Users read own notifications"
on public.notifications for select
to authenticated
using (user_id = auth.uid());

create policy "Users update own notifications"
on public.notifications for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "Users delete own notifications"
on public.notifications for delete
to authenticated
using (user_id = auth.uid());

create policy "Admins read notifications"
on public.notifications for select
to authenticated
using (public.is_admin());

create policy "Users read active promotions"
on public.promotions for select
to authenticated
using (status = 'active' or public.is_admin());

create policy "Admins read audit logs"
on public.audit_logs for select
to authenticated
using (public.is_admin());

-- Supabase Storage hardening for future avatar and merchant logo uploads.
-- The current UI still works without uploads; these buckets are ready for Phase 18 security posture.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('profile-images', 'profile-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']),
  ('merchant-logos', 'merchant-logos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users read NexaPay profile images" on storage.objects;
drop policy if exists "Users upload own profile image folder" on storage.objects;
drop policy if exists "Users update own profile image folder" on storage.objects;
drop policy if exists "Users delete own profile image folder" on storage.objects;
drop policy if exists "Authenticated users read NexaPay merchant logos" on storage.objects;
drop policy if exists "Merchant owners upload own logo folder" on storage.objects;
drop policy if exists "Merchant owners update own logo folder" on storage.objects;
drop policy if exists "Merchant owners delete own logo folder" on storage.objects;

create policy "Authenticated users read NexaPay profile images"
on storage.objects for select
to authenticated
using (bucket_id = 'profile-images');

create policy "Users upload own profile image folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users update own profile image folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete own profile image folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'profile-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users read NexaPay merchant logos"
on storage.objects for select
to authenticated
using (bucket_id = 'merchant-logos');

create policy "Merchant owners upload own logo folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'merchant-logos'
  and exists (
    select 1
    from public.merchants m
    where m.owner_id = auth.uid()
      and m.id::text = (storage.foldername(name))[1]
  )
);

create policy "Merchant owners update own logo folder"
on storage.objects for update
to authenticated
using (
  bucket_id = 'merchant-logos'
  and exists (
    select 1
    from public.merchants m
    where m.owner_id = auth.uid()
      and m.id::text = (storage.foldername(name))[1]
  )
)
with check (
  bucket_id = 'merchant-logos'
  and exists (
    select 1
    from public.merchants m
    where m.owner_id = auth.uid()
      and m.id::text = (storage.foldername(name))[1]
  )
);

create policy "Merchant owners delete own logo folder"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'merchant-logos'
  and exists (
    select 1
    from public.merchants m
    where m.owner_id = auth.uid()
      and m.id::text = (storage.foldername(name))[1]
  )
);

-- NexaPay Phase 6 auth integration helpers
-- Educational Demo - No Real Money or Financial Transactions

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  start_balance numeric(14,2);
begin
  select coalesce((value->>'amount')::numeric, 25000)
    into start_balance
  from public.system_settings
  where key = 'starting_demo_balance';

  if start_balance is null then
    start_balance := 25000;
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), 'NexaPay User'),
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data->>'phone', ''),
      '01' || lpad((abs(hashtext(new.id::text)) % 1000000000)::text, 9, '0')
    ),
    'customer'
  )
  on conflict (id) do nothing;

  insert into public.wallets (user_id, balance)
  values (new.id, start_balance)
  on conflict (user_id) do nothing;

  insert into public.notifications (user_id, title, message, type)
  values (
    new.id,
    'Welcome to NexaPay',
    'Your educational demo wallet was created. No real money or financial transactions are involved.',
    'admin_announcement'
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.assign_demo_role(
  p_target_user_id uuid,
  p_role public.account_role
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.';
  end if;

  if not public.is_admin() then
    raise exception 'Only an active admin can assign demo roles.';
  end if;

  if p_target_user_id = auth.uid() and p_role <> 'admin' then
    raise exception 'Admins cannot demote their own active admin account.';
  end if;

  update public.profiles
  set role = p_role,
      updated_at = now()
  where id = p_target_user_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Target profile was not found.';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    'assign_demo_role',
    'profile',
    p_target_user_id::text,
    jsonb_build_object('role', p_role)
  );

  return updated_profile;
end;
$$;

revoke all on function public.assign_demo_role(uuid, public.account_role) from public;
grant execute on function public.assign_demo_role(uuid, public.account_role) to authenticated;

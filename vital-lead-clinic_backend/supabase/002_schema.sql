-- Core schema for the backend when using Supabase (no local Postgres).
-- Run this in the Supabase SQL editor/CLI after 001_exec_sql.sql.

-- Enums (idempotent via DO blocks for compatibility)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('ADMIN', 'MANAGER', 'STAFF', 'SUPER_ADMIN');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'lead_status') then
    create type public.lead_status as enum ('NEW', 'HOT', 'CLOSED', 'LOST');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'message_type') then
    create type public.message_type as enum ('SENT', 'RECEIVED');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type public.activity_type as enum ('LEAD_CREATED', 'LEAD_UPDATED', 'LEAD_DELETED', 'STATUS_CHANGED', 'MESSAGE_SENT', 'MESSAGE_RECEIVED', 'AUTOMATION_RUN', 'USER_LOGIN');
  end if;
end$$;

-- Clinics
create table if not exists public.clinics (
  id serial primary key,
  name varchar(255) not null,
  email varchar(255) unique not null,
  phone varchar(50),
  address text,
  timezone varchar(100) default 'Asia/Jerusalem',
  language varchar(10) default 'he',
  currency varchar(10) default 'ILS',
  logo text,
  integration_settings jsonb,
  backup_settings jsonb,
  whatsapp_number varchar(50),
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

-- Users
create table if not exists public.users (
  id serial primary key,
  email varchar(255) unique not null,
  password varchar(255) not null,
  name varchar(255) not null,
  phone varchar(50),
  role public.user_role default 'STAFF',
  status varchar(20) default 'active',
  notification_settings jsonb,
  permissions text[] default array[]::text[],
  entry_type varchar(20) default 'clinic',
  entry_code varchar(50),
  reset_token varchar(255),
  reset_token_exp timestamp,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  clinic_id integer references public.clinics(id) on delete cascade,
  avatar text
);

-- Leads
create table if not exists public.leads (
  id serial primary key,
  name varchar(255) not null,
  phone varchar(50) not null,
  email varchar(255),
  service varchar(255),
  status public.lead_status default 'NEW',
  source varchar(100),
  value decimal(10,2) default 0,
  notes text,
  entry_code varchar(50),
  last_contacted timestamp,
  last_inbound_message_at timestamp,
  next_follow_up timestamp,
  last_visit_date date,
  follow_up_sent boolean default false,
  consent_given boolean default true,
  consent_timestamp timestamp,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  clinic_id integer references public.clinics(id) on delete cascade,
  assigned_to_id integer references public.users(id) on delete set null
);

-- Messages
create table if not exists public.messages (
  id serial primary key,
  content text not null,
  type public.message_type default 'RECEIVED',
  timestamp timestamp default current_timestamp,
  is_business boolean default false,
  lead_id integer references public.leads(id) on delete cascade,
  provider_message_id varchar(128),
  delivery_status varchar(20),
  status_updated_at timestamp default current_timestamp,
  message_origin varchar(32),
  delivery_error text,
  metadata jsonb default '{}'::jsonb
);

-- WhatsApp sessions
create table if not exists public.whatsapp_sessions (
  id serial primary key,
  clinic_id integer unique references public.clinics(id) on delete cascade,
  provider varchar(32) not null default 'wa_web',
  status varchar(32) not null default 'disconnected',
  auth_state_encrypted text,
  qr_code text,
  device_jid varchar(255),
  last_connected_at timestamp,
  last_error text,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

-- Automations
create table if not exists public.automations (
  id serial primary key,
  name varchar(255) not null,
  trigger_days integer[] default '{3,7,14}',
  message text not null,
  template_name varchar(255),
  template_language varchar(10) default 'en',
  media_url text,
  daily_cap integer,
  cooldown_hours integer,
  components jsonb default '[]'::jsonb,
  target_status public.lead_status,
  active boolean default true,
  notify_on_reply boolean default true,
  personalization text[] default '{name}',
  last_executed timestamp,
  total_executions integer default 0,
  reply_count integer default 0,
  success_rate decimal(5,2) default 0,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp,
  clinic_id integer references public.clinics(id) on delete cascade,
  template_status varchar(32) default 'pending',
  template_sid varchar(64),
  template_approval_sid varchar(64),
  pre_appointment boolean default false,
  pre_appointment_minutes integer
);

-- Executions
create table if not exists public.executions (
  id serial primary key,
  executed_at timestamp default current_timestamp,
  lead_id integer references public.leads(id) on delete cascade,
  automation_id integer references public.automations(id) on delete cascade,
  message text not null,
  replied boolean default false,
  replied_at timestamp
);

-- Activities
create table if not exists public.activities (
  id serial primary key,
  type public.activity_type not null,
  description text not null,
  created_at timestamp default current_timestamp,
  user_id integer references public.users(id) on delete cascade,
  lead_id integer references public.leads(id) on delete set null
);

-- Notifications
create table if not exists public.notifications (
  id serial primary key,
  type varchar(50) default 'system',
  title text not null,
  message text not null,
  priority varchar(20) default 'medium',
  action_label text,
  action_link text,
  metadata jsonb,
  read boolean default false,
  user_id integer references public.users(id) on delete cascade,
  clinic_id integer references public.clinics(id) on delete cascade,
  created_at timestamp default current_timestamp
);

-- Integration logs
create table if not exists public.integration_logs (
  id serial primary key,
  type varchar(128) not null,
  level varchar(32) default 'error',
  message text not null,
  metadata jsonb,
  clinic_id integer references public.clinics(id) on delete cascade,
  created_at timestamp default current_timestamp
);

-- Google tokens
create table if not exists public.google_tokens (
  user_id integer primary key references public.users(id) on delete cascade,
  token_encrypted text,
  updated_at timestamp default current_timestamp
);

-- Indexes
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_clinic on public.users(clinic_id);
create index if not exists idx_leads_clinic on public.leads(clinic_id);
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_assigned on public.leads(assigned_to_id);
create index if not exists idx_messages_lead on public.messages(lead_id);
create index if not exists idx_messages_provider_message_id on public.messages(provider_message_id);
create index if not exists idx_messages_status_updated_at on public.messages(status_updated_at);
create index if not exists idx_activities_user on public.activities(user_id);
create index if not exists idx_activities_lead on public.activities(lead_id);
create index if not exists idx_automations_clinic on public.automations(clinic_id);
create index if not exists idx_notifications_clinic on public.notifications(clinic_id);
create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);
create unique index if not exists idx_whatsapp_sessions_clinic_id on public.whatsapp_sessions(clinic_id);

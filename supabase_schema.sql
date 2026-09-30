-- FUTURE BIOTECH 文件系统：Supabase 数据库结构
-- 在 Supabase -> SQL Editor 中整段运行。

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text not null unique,
  display_name_ru text not null,
  display_name_zh text,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('salary_two_companies','salary_global','consulting_receipt','application')),
  title_ru text not null,
  title_zh text not null,
  payload jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.documents enable row level security;

-- 用户只能读取自己的个人资料
create policy "profiles_read_own"
on public.profiles for select
using (auth.uid() = id);

-- 用户只能读取自己的文件
create policy "documents_read_own"
on public.documents for select
using (auth.uid() = owner_id);

-- 普通员工不能从网页端新增/修改/删除资料或文件。
-- 管理员目前通过 Supabase Dashboard / SQL Editor 管理，避免把管理员密钥放到 GitHub Pages。

create index if not exists idx_documents_owner_id on public.documents(owner_id);
create index if not exists idx_documents_active on public.documents(owner_id,is_active);

-- =============================================
-- OwniaLand Supabase Schema
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- ENUM Types
-- =============================================
create type land_grade as enum ('central_crystal', 'skyline', 'neon', 'riverside', 'startup');
create type land_status as enum ('available', 'reserved', 'sold');
create type investment_status as enum ('pending', 'confirmed', 'active', 'completed', 'cancelled');
create type payment_request_status as enum ('requested', 'confirmed', 'transferred');
create type investment_option as enum ('option1', 'option2');
create type user_role as enum ('investor', 'admin', 'sales');
create type sales_team as enum ('team1', 'team2');

-- =============================================
-- 1. profiles
-- =============================================
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text default '',
  email text default '',
  role user_role not null default 'investor',
  is_admin boolean not null default false,
  sales_team sales_team,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update all profiles"
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 2. investments
-- =============================================
create table investments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  amount bigint not null, -- 투자금액 (원)
  option investment_option not null default 'option1',
  daily_payment bigint not null default 0, -- 일일 지급액
  contract_days int not null default 365, -- 계약일수 (option1=365, option2=100)
  bank_name text default '',
  account_number text default '',
  account_holder text default '',
  status investment_status not null default 'pending',
  start_date date, -- 입금확인 후 설정
  payment_start_date date, -- start_date + 7일
  end_date date,
  signed_at timestamptz, -- 차용증 서명 시각
  signature_data text, -- 서명 이미지 (base64)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table investments enable row level security;

create policy "Users can read own investments"
  on investments for select using (auth.uid() = user_id);

create policy "Users can insert own investments"
  on investments for insert with check (auth.uid() = user_id);

create policy "Admins can read all investments"
  on investments for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update all investments"
  on investments for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 3. payment_requests
-- =============================================
create table payment_requests (
  id uuid primary key default uuid_generate_v4(),
  investment_id uuid not null references investments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  request_date date not null default current_date,
  payment_date date not null, -- 실제 지급일 (12시 이전=당일, 이후=익일)
  amount bigint not null default 0,
  is_same_day boolean not null default true,
  status payment_request_status not null default 'requested',
  confirmed_at timestamptz,
  transferred_at timestamptz,
  created_at timestamptz not null default now()
);

alter table payment_requests enable row level security;

create policy "Users can read own payment_requests"
  on payment_requests for select using (auth.uid() = user_id);

create policy "Users can insert own payment_requests"
  on payment_requests for insert with check (auth.uid() = user_id);

create policy "Admins can read all payment_requests"
  on payment_requests for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update all payment_requests"
  on payment_requests for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 4. lands
-- =============================================
create table lands (
  id uuid primary key default uuid_generate_v4(),
  grid_x int not null,
  grid_y int not null,
  grade land_grade not null,
  owner_id uuid references profiles(id),
  price numeric(12,2) not null,
  status land_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(grid_x, grid_y)
);

alter table lands enable row level security;

create policy "Anyone can read lands"
  on lands for select using (true);

create policy "Admins can update lands"
  on lands for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can insert lands"
  on lands for insert with check (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 5. land_transactions
-- =============================================
create table land_transactions (
  id uuid primary key default uuid_generate_v4(),
  land_id uuid not null references lands(id) on delete cascade,
  buyer_id uuid not null references profiles(id) on delete cascade,
  price numeric(12,2) not null,
  grade land_grade not null,
  payment_method text default 'USDT', -- USDT or bank_transfer
  status text not null default 'pending', -- pending, approved, rejected
  created_at timestamptz not null default now()
);

alter table land_transactions enable row level security;

create policy "Users can read own land_transactions"
  on land_transactions for select using (auth.uid() = buyer_id);

create policy "Users can insert own land_transactions"
  on land_transactions for insert with check (auth.uid() = buyer_id);

create policy "Admins can read all land_transactions"
  on land_transactions for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "Admins can update all land_transactions"
  on land_transactions for update using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 6. sales_journals (영업일지)
-- =============================================
create table sales_journals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references profiles(id) on delete cascade,
  journal_date date not null default current_date,
  content text not null default '',
  consultation_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, journal_date)
);

alter table sales_journals enable row level security;

create policy "Sales can read own journals"
  on sales_journals for select using (auth.uid() = user_id);

create policy "Sales can insert own journals"
  on sales_journals for insert with check (auth.uid() = user_id);

create policy "Sales can update own journals"
  on sales_journals for update using (auth.uid() = user_id);

create policy "Admins can read all journals"
  on sales_journals for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- 7. sales_records (영업 실적)
-- =============================================
create table sales_records (
  id uuid primary key default uuid_generate_v4(),
  sales_user_id uuid not null references profiles(id) on delete cascade,
  investor_user_id uuid references profiles(id),
  amount numeric(14,2) not null default 0,
  description text default '',
  created_at timestamptz not null default now()
);

alter table sales_records enable row level security;

create policy "Sales can read own records"
  on sales_records for select using (auth.uid() = sales_user_id);

create policy "Admins can manage all records"
  on sales_records for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- =============================================
-- Functions & Triggers
-- =============================================

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'investor')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on profiles
  for each row execute function update_updated_at();

create trigger investments_updated_at before update on investments
  for each row execute function update_updated_at();

create trigger lands_updated_at before update on lands
  for each row execute function update_updated_at();

create trigger sales_journals_updated_at before update on sales_journals
  for each row execute function update_updated_at();

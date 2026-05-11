-- ============================================
-- OWNIA LAND AI City Ecosystem - Database Schema
-- MiroFish-inspired AI Agent System
-- ============================================

-- 1. AI Citizens (에이전트 페르소나)
create table if not exists ai_citizens (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  avatar_emoji text not null default '🧑',
  age integer not null,
  profession text not null,
  personality text not null,
  backstory text not null,
  investment_style text not null check (investment_style in ('conservative', 'balanced', 'aggressive', 'speculative')),
  interests text[] not null default '{}',
  wallet_balance numeric(12,2) not null default 0,
  land_holdings jsonb not null default '[]',
  mood text not null default 'neutral' check (mood in ('excited', 'optimistic', 'neutral', 'cautious', 'worried')),
  status text not null default 'active' check (status in ('active', 'idle', 'away', 'deactivated')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_citizens_status on ai_citizens(status);
create index if not exists idx_ai_citizens_style on ai_citizens(investment_style);

-- 2. City Events (도시 활동 로그)
create table if not exists city_events (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references ai_citizens(id) on delete cascade,
  event_type text not null check (event_type in ('land_purchase', 'land_sale', 'comment', 'business_open', 'social', 'market_analysis')),
  title text not null,
  description text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_city_events_created on city_events(created_at desc);
create index if not exists idx_city_events_citizen on city_events(citizen_id);
create index if not exists idx_city_events_type on city_events(event_type);

-- 3. Citizen Memory (시민 기억 시스템)
create table if not exists citizen_memory (
  id uuid primary key default gen_random_uuid(),
  citizen_id uuid not null references ai_citizens(id) on delete cascade,
  memory_type text not null check (memory_type in ('action', 'observation', 'reflection', 'plan')),
  content text not null,
  importance integer not null default 5 check (importance >= 1 and importance <= 10),
  related_event_id uuid references city_events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_citizen_memory_citizen on citizen_memory(citizen_id);
create index if not exists idx_citizen_memory_importance on citizen_memory(citizen_id, importance desc);

-- 4. Simulation Runs (시뮬레이션 실행 기록)
create table if not exists simulation_runs (
  id uuid primary key default gen_random_uuid(),
  tick_number integer not null,
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  citizens_processed integer not null default 0,
  events_generated integer not null default 0,
  market_snapshot jsonb not null default '{}',
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_simulation_runs_tick on simulation_runs(tick_number desc);
create index if not exists idx_simulation_runs_status on simulation_runs(status);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on all tables
alter table ai_citizens enable row level security;
alter table city_events enable row level security;
alter table citizen_memory enable row level security;
alter table simulation_runs enable row level security;

-- ai_citizens: authenticated users can read
create policy "ai_citizens_select" on ai_citizens
  for select to authenticated using (true);

-- city_events: authenticated users can read
create policy "city_events_select" on city_events
  for select to authenticated using (true);

-- citizen_memory: authenticated users can read
create policy "citizen_memory_select" on citizen_memory
  for select to authenticated using (true);

-- simulation_runs: authenticated users can read
create policy "simulation_runs_select" on simulation_runs
  for select to authenticated using (true);

-- ============================================
-- Service Role 정책 (API Routes에서 supabaseAdmin 사용)
-- service_role은 RLS를 우회하므로 별도 정책 불필요
-- ============================================

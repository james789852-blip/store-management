-- ============================================================
-- 梁平有限公司 店面建置管理系統 - 完整資料庫 Schema
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- stores（店面）
-- ────────────────────────────────────────────────────────────
create table if not exists stores (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  address       text,
  phone         text,
  tax_id        text,
  status        text not null default 'building'
                check (status in ('building','open','paused','closed')),
  sqft          numeric,
  monthly_rent  numeric,
  deposit       numeric,
  open_date     date,
  business_hours text,
  seats         int,
  -- 網路 / 系統帳號
  wifi_ssid       text,
  wifi_password   text,
  cctv_account    text,
  cctv_password   text,
  pos_account     text,
  pos_password    text,
  -- 人員
  owner_name    text,
  owner_phone   text,
  manager_name  text,
  manager_phone text,
  -- 房東 / 公用事業
  landlord_name   text,
  landlord_phone  text,
  electric_vendor text,
  gas_vendor      text,
  -- 其他
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- build_schedules（建置排程）
-- ────────────────────────────────────────────────────────────
create table if not exists build_schedules (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  task_name   text not null,
  vendor      text,
  start_date  date,
  end_date    date,
  status      text not null default 'pending'
              check (status in ('done','ongoing','pending','overdue')),
  depends_on  uuid references build_schedules(id),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- construction_logs（施工日誌）
-- ────────────────────────────────────────────────────────────
create table if not exists construction_logs (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id) on delete cascade,
  date      date not null,
  weather   text,
  task_name text,
  vendor    text,
  workers   int,
  status    text not null default 'normal'
            check (status in ('normal','issue','nowork')),
  progress  int check (progress between 0 and 100),
  issue     text,
  action    text,
  note      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- expenses（費用記錄）
-- ────────────────────────────────────────────────────────────
create table if not exists expenses (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references stores(id) on delete cascade,
  date            date not null,
  category        text,
  name            text not null,
  vendor          text,
  total           numeric not null default 0,
  pay_method      text,
  pay_status      text not null default 'pending'
                  check (pay_status in ('paid','partial','pending')),
  pay_date        date,
  -- 訂金 / 尾款
  deposit_amount  numeric,
  deposit_date    date,
  balance_amount  numeric,
  balance_date    date,
  -- 發票
  invoice_no      text,
  invoice_amount  numeric,
  note            text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- todos（待辦事項）
-- ────────────────────────────────────────────────────────────
create table if not exists todos (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null references stores(id) on delete cascade,
  title     text not null,
  category  text,
  priority  text not null default 'mid'
            check (priority in ('high','mid','low')),
  due_date  date,
  done      boolean not null default false,
  note      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- investors（股東 / 投資人）
-- ────────────────────────────────────────────────────────────
create table if not exists investors (
  id                uuid primary key default gen_random_uuid(),
  store_id          uuid not null references stores(id) on delete cascade,
  name              text not null,
  round             int check (round between 1 and 4),
  percentage        numeric,
  amount            numeric,
  phone             text,
  email             text,
  id_number         text,
  address           text,
  pay_status        text not null default 'pending'
                    check (pay_status in ('paid','pending','overdue')),
  contract_sent     boolean not null default false,
  contract_signed   boolean not null default false,
  sign_date         date,
  pay_deadline      date,
  note              text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- vendors（廠商）
-- ────────────────────────────────────────────────────────────
create table if not exists vendors (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid references stores(id) on delete cascade,
  name          text not null,
  category      text,
  service       text,
  contact_name  text,
  phone         text,
  mobile        text,
  email         text,
  address       text,
  tax_id        text,
  line_id       text,
  pay_method    text,
  bank_name     text,
  bank_account  text,
  can_invoice   boolean not null default false,
  invoice_note  text,
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- equipment（設備）
-- ────────────────────────────────────────────────────────────
create table if not exists equipment (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references stores(id) on delete cascade,
  name           text not null,
  category       text,
  spec           text,
  voltage        text,
  width          numeric,
  depth          numeric,
  height         numeric,
  quantity       int not null default 1,
  unit_price     numeric,
  vendor         text,
  status         text not null default 'pending'
                 check (status in ('installed','ordered','pending')),
  schedule_task  uuid references build_schedules(id),
  note           text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- documents（文件）
-- ────────────────────────────────────────────────────────────
create table if not exists documents (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references stores(id) on delete cascade,
  name       text not null,
  doc_type   text not null default 'other'
             check (doc_type in ('lease','consent','permit','other')),
  status     text not null default 'pending'
             check (status in ('ok','pending','expiring','expired','none')),
  sign_date  date,
  exp_date   date,
  party      text,
  note       text,
  file_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- design_files（設計檔案）
-- ────────────────────────────────────────────────────────────
create table if not exists design_files (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  name        text not null,
  category    text not null default 'other'
              check (category in ('logo','signage','menu','floorplan','other')),
  version     text,
  description text,
  file_url    text,
  file_type   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- sop_knowledge（SOP 知識庫）
-- ────────────────────────────────────────────────────────────
create table if not exists sop_knowledge (
  id      uuid primary key default gen_random_uuid(),
  trade   text not null default 'general'
          check (trade in ('plumbing','carpentry','masonry','equipment','admin','painting','signage','general')),
  type    text not null default 'general'
          check (type in ('spec','flow','pit','vendor','admin','other')),
  title   text not null,
  tags    text[] not null default '{}',
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- gov_applications（政府申請）
-- ────────────────────────────────────────────────────────────
create table if not exists gov_applications (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  category    text,
  name        text not null,
  description text,
  tags        text[] not null default '{}',
  status      text not null default 'notyet'
              check (status in ('done','inprog','waiting','notyet')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ────────────────────────────────────────────────────────────
-- updated_at 自動觸發
-- ────────────────────────────────────────────────────────────
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare
  t text;
begin
  foreach t in array array[
    'stores','build_schedules','construction_logs','expenses',
    'todos','investors','vendors','equipment','documents',
    'design_files','sop_knowledge','gov_applications'
  ] loop
    execute format('
      create or replace trigger trg_%s_updated_at
      before update on %s
      for each row execute function set_updated_at();
    ', t, t);
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- Row Level Security（開發階段全開放）
-- ────────────────────────────────────────────────────────────
do $$ declare
  t text;
begin
  foreach t in array array[
    'stores','build_schedules','construction_logs','expenses',
    'todos','investors','vendors','equipment','documents',
    'design_files','sop_knowledge','gov_applications'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow_all_%s" on %I;', t, t);
    execute format('
      create policy "allow_all_%s" on %I
      for all using (true) with check (true);
    ', t, t);
  end loop;
end $$;

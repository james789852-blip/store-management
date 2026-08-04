-- ════════════════════════════════════════════════════════════
-- 002 基本資料升級:銀行拆欄 + 照片、負責人證件、管理人員、POS 明細、支付方式
-- 在 Supabase → SQL Editor 貼上整段執行即可（可重複執行，皆有 if not exists 保護）
-- ════════════════════════════════════════════════════════════

-- ── 1) stores 追加欄位 ──────────────────────────────────────────
-- 銀行（拆成 銀行 / 分行 / 帳號）+ 存摺照片
alter table stores add column if not exists bank_name       text;
alter table stores add column if not exists bank_branch     text;
alter table stores add column if not exists bank_account    text;
alter table stores add column if not exists bankbook_photo  text;   -- 存摺照片 URL

-- 負責人身分證正反面照片
alter table stores add column if not exists owner_id_front  text;
alter table stores add column if not exists owner_id_back   text;

-- POS（一店一套）明細
alter table stores add column if not exists pos_system         text;  -- iChef / 肚肚 / 柿子紅 ...
alter table stores add column if not exists pos_front_account  text;  -- 前台帳號
alter table stores add column if not exists pos_front_password text;  -- 前台密碼
alter table stores add column if not exists pos_back_account   text;  -- 後台帳號
alter table stores add column if not exists pos_back_password  text;  -- 後台密碼
alter table stores add column if not exists printer_model      text;  -- 出單機型號
alter table stores add column if not exists wifi_model         text;  -- Wi-Fi 機型
-- wifi_ssid / wifi_password 已存在，沿用

-- ── 2) store_staff 管理人員（可多位:店長 / 副店長 / 自訂職稱）─────
create table if not exists store_staff (
  id          uuid primary key default gen_random_uuid(),
  store_id    uuid not null references stores(id) on delete cascade,
  title       text,                 -- 職稱（店長 / 副店長 / …）
  name        text not null,
  id_number   text,                 -- 身分證字號
  email       text,
  phone       text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_store_staff_store on store_staff(store_id);

-- ── 3) store_payments 支付方式（抽成 % + 撥款規則）────────────────
create table if not exists store_payments (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references stores(id) on delete cascade,
  method           text not null,   -- LinePay / ApplePay / GooglePay / 街口 / 信用卡 ...
  commission_pct   numeric,         -- 抽成百分比（例如 2.5 = 2.5%）
  settlement_rule  text,            -- 撥款規則 / 週期（例如 T+2、每月 5 號）
  note             text,
  sort_order       int  not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_store_payments_store on store_payments(store_id);

-- ── 4) RLS（比照現有 allow_all 開發設定）─────────────────────────
do $$ declare t text;
begin
  foreach t in array array['store_staff','store_payments'] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists "allow_all_%s" on %I;', t, t);
    execute format('create policy "allow_all_%s" on %I for all using (true) with check (true);', t, t);
  end loop;
end $$;

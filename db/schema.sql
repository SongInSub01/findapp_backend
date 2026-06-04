-- users: 로그인 계정과 앱 표시 이름을 함께 저장하는 기본 사용자 테이블
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_name text not null,
  email text not null unique,
  login_id text not null unique,
  password_hash text not null,
  initials text not null,
  photo_asset_path text not null,
  public_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

alter table users add column if not exists user_name text;
alter table users add column if not exists login_id text;
alter table users add column if not exists password_hash text;
alter table users add column if not exists is_active boolean not null default true;
alter table users add column if not exists updated_at timestamptz not null default now();
alter table users add column if not exists last_login_at timestamptz;

update users
set
  user_name = coalesce(user_name, name),
  login_id = coalesce(login_id, email),
  password_hash = case
    when coalesce(password_hash, '') = '' then 'legacy-account'
    else password_hash
  end,
  is_active = coalesce(is_active, true),
  updated_at = coalesce(updated_at, created_at, now());

alter table users alter column user_name set not null;
alter table users alter column login_id set not null;
alter table users alter column password_hash set not null;

create unique index if not exists users_login_id_unique_idx on users(login_id);

-- alert_settings: 사용자별 BLE 알림 기본 설정
create table if not exists alert_settings (
  user_id uuid primary key references users(id) on delete cascade,
  distance_meters integer not null,
  disconnect_minutes integer not null,
  vibration_enabled boolean not null,
  sound_enabled boolean not null,
  auto_approve_photos boolean not null,
  keep_photo_private_by_default boolean not null,
  default_reward integer not null default 30000,
  map_theme text not null default 'dark',
  created_at timestamptz not null default now()
);

alter table alert_settings add column if not exists default_reward integer not null default 30000;
alter table alert_settings add column if not exists map_theme text not null default 'dark';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'alert_settings_map_theme_check'
  ) then
    alter table alert_settings
      add constraint alert_settings_map_theme_check
      check (map_theme in ('dark', 'light'))
      not valid;
  end if;
end $$;

-- ble_devices: 사용자가 등록한 BLE 센서 연결 물건 목록
create table if not exists ble_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  icon_key text not null,
  status text not null check (status in ('safe', 'lost', 'contact')),
  location text not null,
  last_seen text not null,
  ble_code text not null,
  map_x numeric(6, 4) not null,
  map_y numeric(6, 4) not null,
  distance text,
  reward integer,
  photo_asset_path text,
  last_signal_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table ble_devices add column if not exists last_signal_at timestamptz not null default now();
alter table ble_devices add column if not exists ble_status text not null default 'near';
alter table ble_devices add column if not exists last_rssi integer;
alter table ble_devices add column if not exists last_detected_latitude numeric(10, 7);
alter table ble_devices add column if not exists last_detected_longitude numeric(10, 7);
alter table ble_devices add column if not exists last_detected_accuracy_meters numeric(6, 2);
alter table ble_devices add column if not exists focused_scan_until timestamptz;
alter table ble_devices add column if not exists rediscovered_at timestamptz;
alter table ble_devices add column if not exists battery_percent integer;
alter table ble_devices add column if not exists battery_checked_at timestamptz;

-- 같은 사용자가 동일한 BLE 코드를 중복 등록하지 못하게 막는다.
create unique index if not exists ble_devices_user_ble_code_unique_idx
  on ble_devices(user_id, ble_code);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ble_devices_ble_status_check'
  ) then
    alter table ble_devices
      add constraint ble_devices_ble_status_check
      check (ble_status in ('near', 'far', 'risk', 'disconnected', 'lost', 'rediscovered'))
      not valid;
  end if;
end $$;

-- lost_items: 주변 탐색과 채팅 진입에 노출되는 분실물 목록
create table if not exists lost_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  title text not null,
  location text not null,
  time_label text not null,
  reward integer not null,
  status text not null check (status in ('safe', 'lost', 'contact')),
  photo_status text not null check (photo_status in ('locked', 'pending', 'approved')),
  distance text not null,
  owner_name text not null,
  description text not null,
  map_x numeric(6, 4) not null,
  map_y numeric(6, 4) not null,
  thread_id uuid,
  photo_asset_path text,
  source_device_id uuid references ble_devices(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table lost_items add column if not exists source_device_id uuid references ble_devices(id) on delete set null;

create table if not exists current_locations (
  user_id uuid primary key references users(id) on delete cascade,
  latitude numeric(10, 7) not null,
  longitude numeric(10, 7) not null,
  accuracy_meters numeric(6, 2),
  updated_at timestamptz not null default now()
);

-- chat_threads: 분실물별 대화방 요약 정보
create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references lost_items(id) on delete cascade,
  item_title text not null,
  item_status text not null check (item_status in ('safe', 'lost', 'contact')),
  last_message text not null,
  last_time text not null,
  unread integer not null default 0,
  photo_status text not null check (photo_status in ('locked', 'pending', 'approved')),
  other_user text not null,
  reward integer,
  created_at timestamptz not null default now()
);

-- 채팅방 요청자와 마지막 발신자를 저장해 사용자별 대화방과 읽음 상태를 구분한다.
alter table chat_threads add column if not exists requester_user_id uuid references users(id) on delete set null;
alter table chat_threads add column if not exists last_sender_user_id uuid references users(id) on delete set null;

create index if not exists chat_threads_requester_user_id_idx on chat_threads(requester_user_id);
create index if not exists chat_threads_last_sender_user_id_idx on chat_threads(last_sender_user_id);
create unique index if not exists chat_threads_item_requester_user_unique_idx
  on chat_threads(item_id, requester_user_id)
  where requester_user_id is not null;

-- chat_messages: 각 대화방 안의 실제 메시지 목록
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  sender_user_id uuid references users(id) on delete set null,
  text text not null,
  sender text not null check (sender in ('me', 'other', 'system')),
  time_label text not null,
  type text not null check (type in ('text', 'photoRequest', 'photoApproved', 'report')),
  created_at timestamptz not null default now()
);

-- 메시지 발신자 id를 저장해 보는 사람 기준의 me/other 표시를 계산한다.
alter table chat_messages add column if not exists sender_user_id uuid references users(id) on delete set null;
create index if not exists chat_messages_sender_user_id_idx on chat_messages(sender_user_id);

-- safe_zones: 알림이 완화되는 사용자별 안심 구역
create table if not exists safe_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  address text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  radius_meters integer not null,
  created_at timestamptz not null default now()
);

-- 안전지대도 지도 위에 표시할 수 있도록 좌표를 저장한다.
alter table safe_zones add column if not exists latitude numeric(10, 7);
alter table safe_zones add column if not exists longitude numeric(10, 7);

-- notifications: 앱 상단 알림함에 보여줄 이벤트 내역
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  body text not null,
  time_label text not null,
  type text not null check (type in ('alert', 'approval', 'info', 'report')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- reports: 채팅 신고 내역
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id) on delete set null,
  target_title text not null,
  reason text not null,
  created_at_label text not null,
  status_label text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 찾아줘 서비스 확장 스키마
-- 기존 BLE 중심 구조를 유지하면서, 실제 분실물/습득물 서비스 기능을 위한 컬럼과
-- 테이블을 추가한다.
-- ---------------------------------------------------------------------------

alter table users add column if not exists role text not null default 'user';
alter table users add column if not exists phone_number text;
alter table users add column if not exists profile_bio text;

update users
set
  role = coalesce(role, 'user'),
  phone_number = coalesce(phone_number, null),
  profile_bio = coalesce(profile_bio, null);

create index if not exists users_role_idx on users(role);

alter table lost_items add column if not exists category text;
alter table lost_items add column if not exists color text;
alter table lost_items add column if not exists lost_at timestamptz;
alter table lost_items add column if not exists listing_status text not null default 'open';
alter table lost_items add column if not exists feature_notes text;
alter table lost_items add column if not exists search_keywords text;
alter table lost_items add column if not exists contact_note text;
-- 분실물 좌표는 지도 표시와 거리 기반 검색을 위해 저장한다.
alter table lost_items add column if not exists latitude numeric(10, 7);
alter table lost_items add column if not exists longitude numeric(10, 7);
alter table lost_items add column if not exists accuracy_meters numeric(6, 2);
alter table lost_items add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'lost_items_listing_status_check'
  ) then
    alter table lost_items
      add constraint lost_items_listing_status_check
      check (listing_status in ('open', 'matched', 'resolved', 'archived'))
      not valid;
  end if;
end $$;

update lost_items
set
  category = coalesce(
    category,
    case
      when title like '%지갑%' then '지갑'
      when title like '%에어팟%' then '전자기기'
      when title like '%백팩%' then '가방'
      when title like '%휴대폰%' or title like '%갤럭시%' then '전자기기'
      else '기타'
    end
  ),
  color = coalesce(
    color,
    case
      when title like '%갈색%' then '갈색'
      when title like '%버건디%' then '버건디'
      when title like '%검정%' then '검정'
      when title like '%흰색%' then '흰색'
      else '미상'
    end
  ),
  lost_at = coalesce(lost_at, created_at),
  listing_status = coalesce(listing_status, 'open'),
  feature_notes = coalesce(feature_notes, description),
  search_keywords = coalesce(search_keywords, concat_ws(' ', title, location, description)),
  contact_note = coalesce(contact_note, '앱 내 문의 기능으로 연락해 주세요.'),
  updated_at = coalesce(updated_at, created_at, now());

alter table lost_items alter column category set not null;
alter table lost_items alter column color set not null;
alter table lost_items alter column lost_at set not null;
alter table lost_items alter column feature_notes set not null;
alter table lost_items alter column search_keywords set not null;
alter table lost_items alter column contact_note set not null;

create index if not exists lost_items_owner_user_id_idx on lost_items(owner_user_id);
create index if not exists lost_items_listing_status_idx on lost_items(listing_status);
create index if not exists lost_items_category_idx on lost_items(category);
create index if not exists lost_items_color_idx on lost_items(color);
create index if not exists lost_items_lost_at_idx on lost_items(lost_at desc);

create table if not exists found_items (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references users(id) on delete cascade,
  title text not null,
  category text not null,
  color text not null,
  found_location text not null,
  found_at timestamptz not null,
  listing_status text not null default 'open'
    check (listing_status in ('open', 'matched', 'resolved', 'archived')),
  description text not null,
  feature_notes text not null,
  storage_note text,
  search_keywords text not null,
  contact_note text not null,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  accuracy_meters numeric(6, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 습득물 좌표는 지도 표시와 분실물 매칭 비교를 위해 저장한다.
alter table found_items add column if not exists latitude numeric(10, 7);
alter table found_items add column if not exists longitude numeric(10, 7);
alter table found_items add column if not exists accuracy_meters numeric(6, 2);

create index if not exists found_items_reporter_user_id_idx on found_items(reporter_user_id);
create index if not exists found_items_listing_status_idx on found_items(listing_status);
create index if not exists found_items_category_idx on found_items(category);
create index if not exists found_items_color_idx on found_items(color);
create index if not exists found_items_found_at_idx on found_items(found_at desc);

create table if not exists item_images (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid references lost_items(id) on delete cascade,
  found_item_id uuid references found_items(id) on delete cascade,
  uploaded_by_user_id uuid references users(id) on delete set null,
  image_url text not null,
  file_name text not null,
  mime_type text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  constraint item_images_target_check check (num_nonnulls(lost_item_id, found_item_id) = 1)
);

create index if not exists item_images_lost_item_id_idx on item_images(lost_item_id);
create index if not exists item_images_found_item_id_idx on item_images(found_item_id);

create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  lost_item_id uuid not null references lost_items(id) on delete cascade,
  found_item_id uuid not null references found_items(id) on delete cascade,
  score numeric(5, 2) not null,
  match_status text not null default 'suggested'
    check (match_status in ('suggested', 'reviewing', 'confirmed', 'dismissed')),
  reason_summary text not null,
  detail_scores jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint matches_unique_pair unique (lost_item_id, found_item_id)
);

create index if not exists matches_lost_item_id_idx on matches(lost_item_id);
create index if not exists matches_found_item_id_idx on matches(found_item_id);
create index if not exists matches_score_idx on matches(score desc);
create index if not exists matches_match_status_idx on matches(match_status);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  category text not null check (category in ('report', 'support', 'moderation')),
  title text not null,
  body text not null,
  status text not null default 'open'
    check (status in ('open', 'reviewing', 'resolved', 'closed')),
  related_item_type text check (related_item_type in ('lost', 'found')),
  related_item_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inquiries_user_id_idx on inquiries(user_id);
create index if not exists inquiries_status_idx on inquiries(status);
create index if not exists inquiries_category_idx on inquiries(category);

-- reward_accounts: 사용자별 리워드 포인트와 누적 포인트를 저장한다.
create table if not exists reward_accounts (
  user_id uuid primary key references users(id) on delete cascade,
  current_points integer not null default 0 check (current_points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  streak_days integer not null default 1 check (streak_days >= 0),
  next_goal_points integer not null default 3500 check (next_goal_points > 0),
  updated_at timestamptz not null default now()
);

-- reward_quests: 사용자가 완료하고 수령할 수 있는 리워드 퀘스트 상태를 저장한다.
create table if not exists reward_quests (
  user_id uuid not null references users(id) on delete cascade,
  code text not null,
  title text not null,
  reward_money integer not null check (reward_money >= 0),
  reward_points integer not null check (reward_points >= 0),
  progress_current integer not null default 0 check (progress_current >= 0),
  progress_target integer not null check (progress_target > 0),
  icon_key text not null,
  completed boolean not null default false,
  claimed boolean not null default false,
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, code)
);

-- reward_shop_items: 포인트로 교환할 수 있는 리워드 상점 상품을 저장한다.
create table if not exists reward_shop_items (
  id text primary key,
  title text not null,
  description text not null,
  price_points integer not null check (price_points > 0),
  icon_key text not null,
  sort_order integer not null default 0
);

insert into reward_shop_items (id, title, description, price_points, icon_key, sort_order)
values
  ('coffee', '커피 쿠폰', '아메리카노 교환권', 1500, 'coffee', 1),
  ('convenience', '편의점 상품권', '5,000원 모바일 상품권', 3000, 'store', 2),
  ('delivery', '배달 할인 쿠폰', '배달앱 할인 쿠폰', 2500, 'delivery', 3),
  ('booster', '포인트 부스터', '7일 동안 포인트 2배 적립', 1200, 'flash', 4),
  ('premium_profile', '프리미엄 프로필', '프로필 테두리 변경', 800, 'premium', 5),
  ('nickname_color', '닉네임 컬러 변경', '닉네임 색상 커스텀', 600, 'palette', 6)
on conflict (id) do update
set title = excluded.title,
    description = excluded.description,
    price_points = excluded.price_points,
    icon_key = excluded.icon_key,
    sort_order = excluded.sort_order;

-- reward_purchases: 사용자가 포인트 상점에서 구매한 내역을 저장한다.
create table if not exists reward_purchases (
  user_id uuid not null references users(id) on delete cascade,
  shop_item_id text not null references reward_shop_items(id) on delete cascade,
  purchased_at timestamptz not null default now(),
  primary key (user_id, shop_item_id)
);

-- reward_point_events: 포인트 적립과 사용 내역을 감사 로그처럼 남긴다.
create table if not exists reward_point_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  points integer not null,
  reason text not null,
  quest_code text,
  shop_item_id text,
  created_at timestamptz not null default now()
);

create index if not exists reward_point_events_user_created_idx
  on reward_point_events(user_id, created_at desc);

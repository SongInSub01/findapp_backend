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
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
);

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
  created_at timestamptz not null default now()
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

-- chat_messages: 각 대화방 안의 실제 메시지 목록
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references chat_threads(id) on delete cascade,
  text text not null,
  sender text not null check (sender in ('me', 'other', 'system')),
  time_label text not null,
  type text not null check (type in ('text', 'photoRequest', 'photoApproved', 'report')),
  created_at timestamptz not null default now()
);

-- safe_zones: 알림이 완화되는 사용자별 안심 구역
create table if not exists safe_zones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  address text not null,
  radius_meters integer not null,
  created_at timestamptz not null default now()
);

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
alter table lost_items add column if not exists updated_at timestamptz not null default now();

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

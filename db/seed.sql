-- 기본 관리자 계정: 테스트와 초기 운영 확인에 쓸 수 있는 실제 로그인 계정이다.
insert into users (
  id, name, user_name, email, login_id, password_hash,
  initials, photo_asset_path, public_name, is_active
)
values (
  '00000000-0000-0000-0000-000000000001',
  '관리자',
  '관리자',
  'admin@findapp.local',
  'admin',
  'b9f7f8fcb0b4a3a7cdd4d79a87b3bb12:0d505b005b82f41cfbd5da95e4c97e43b10d0d20541caa3e5538045d78c5bcd0551e4acc63892fc80bac4a847e0688f3c16d05766e43e4a144ae3511fbe1140c',
  '관',
  'assets/images/icon.png',
  '관리자',
  true
)
on conflict (login_id) do update
set
  name = excluded.name,
  user_name = excluded.user_name,
  email = excluded.email,
  password_hash = excluded.password_hash,
  initials = excluded.initials,
  photo_asset_path = excluded.photo_asset_path,
  public_name = excluded.public_name,
  is_active = excluded.is_active;

-- 기본 시드 사용자: 앱 부트스트랩이 비어 있지 않도록 최소 데이터만 넣는다.
insert into users (
  id, name, user_name, email, login_id, password_hash,
  initials, photo_asset_path, public_name, is_active
)
values (
  '11111111-1111-1111-1111-111111111111',
  '송인섭',
  '송인섭',
  'insub@example.com',
  'insub@example.com',
  '4434d5c4c67c7f76dd0d2fbef1a8b347:6505f1b6283cc8c801b8f5450858e34dd08186078247bff7f5b6c15a59eb6a379b8cc1da911212c05b5a4945e1256c1318ef2bb515077d4152874a240dc71c41',
  '송',
  'assets/images/icon.png',
  '송**',
  true
)
on conflict (email) do update
set
  name = excluded.name,
  user_name = excluded.user_name,
  login_id = excluded.login_id,
  password_hash = excluded.password_hash,
  initials = excluded.initials,
  photo_asset_path = excluded.photo_asset_path,
  public_name = excluded.public_name,
  is_active = excluded.is_active;

insert into alert_settings (
  user_id, distance_meters, disconnect_minutes, vibration_enabled,
  sound_enabled, auto_approve_photos, keep_photo_private_by_default
)
values (
  '00000000-0000-0000-0000-000000000001',
  10, 5, true, true, false, true
)
on conflict (user_id) do nothing;

insert into alert_settings (
  user_id, distance_meters, disconnect_minutes, vibration_enabled,
  sound_enabled, auto_approve_photos, keep_photo_private_by_default
)
values (
  '11111111-1111-1111-1111-111111111111',
  10, 5, true, true, false, true
)
on conflict (user_id) do nothing;

insert into ble_devices (
  id, user_id, name, icon_key, status, location, last_seen, ble_code,
  map_x, map_y, distance, reward, photo_asset_path
)
values
  (
    '21111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '검은색 지갑',
    'wallet',
    'safe',
    '내 주변 (1m)',
    '방금 전',
    'BLE-WALLET-23F',
    0.15,
    0.74,
    '1m',
    null,
    'assets/images/icon.png'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '자동차 키',
    'key',
    'safe',
    '안심 구역 (집)',
    '2분 전',
    'BLE-KEY-82A',
    0.63,
    0.68,
    '안심 구역',
    null,
    'assets/images/icon.png'
  ),
  (
    '23333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '백팩',
    'bag',
    'lost',
    '강남역 2번 출구 부근',
    '10분 전',
    'BLE-BAG-57P',
    0.72,
    0.44,
    '210m',
    50000,
    'assets/images/splash_icon.png'
  )
on conflict (id) do nothing;

insert into lost_items (
  id, owner_user_id, title, location, time_label, reward, status, photo_status,
  distance, owner_name, description, map_x, map_y, thread_id, photo_asset_path,
  category, color, lost_at, listing_status, feature_notes, search_keywords, contact_note
)
values
  (
    '31111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '갈색 가죽 지갑',
    '홍대입구역 근처',
    '20분 전',
    30000,
    'contact',
    'approved',
    '350m',
    '김**',
    '갈색 카드지갑 형태, BLE 신호 감지됨',
    0.18,
    0.71,
    '41111111-1111-1111-1111-111111111111',
    'assets/images/icon.png',
    '지갑',
    '갈색',
    now() - interval '20 minutes',
    'matched',
    '카드지갑 형태, 카드 수납칸이 보이는 갈색 가죽 지갑',
    '갈색 가죽 지갑 홍대 카드지갑',
    '습득하신 분은 앱 문의로 위치를 남겨 주세요.'
  ),
  (
    '32222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '에어팟 프로 케이스',
    '강남구 역삼동',
    '1시간 전',
    20000,
    'lost',
    'locked',
    '1.2km',
    '이**',
    '흰색 케이스, 마지막 BLE 신호가 카페 인근에서 포착됨',
    0.52,
    0.22,
    '42222222-2222-2222-2222-222222222222',
    'assets/images/icon.png',
    '전자기기',
    '흰색',
    now() - interval '1 hour',
    'open',
    '에어팟 프로 충전 케이스, 앞면에 작은 흠집이 있습니다.',
    '에어팟 프로 케이스 흰색 역삼동',
    '카페 보관 여부를 앱으로 알려 주세요.'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    '버건디 백팩',
    '이태원역 1번 출구',
    '2시간 전',
    100000,
    'lost',
    'locked',
    '2.5km',
    '박**',
    '노트북과 서류가 들어 있는 백팩',
    0.66,
    0.46,
    '43333333-3333-3333-3333-333333333333',
    'assets/images/splash_icon.png',
    '가방',
    '버건디',
    now() - interval '2 hours',
    'open',
    '노트북과 서류가 들어 있는 버건디 백팩입니다.',
    '버건디 백팩 이태원 노트북',
    '발견 시 보관 장소와 시간을 남겨 주세요.'
  ),
  (
    '34444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    '삼성 갤럭시 S24',
    '용산구 한강로',
    '30분 전',
    150000,
    'contact',
    'pending',
    '800m',
    '이**',
    '검정 케이스, 주변 사용자 알림 발생',
    0.36,
    0.65,
    null,
    'assets/images/icon.png',
    '전자기기',
    '검정',
    now() - interval '30 minutes',
    'matched',
    '검정 케이스가 씌워진 삼성 갤럭시 S24입니다.',
    '갤럭시 S24 검정 케이스 용산',
    '화면 보호 필름 여부를 함께 알려 주세요.'
  )
on conflict (id) do nothing;

insert into chat_threads (
  id, item_id, item_title, item_status, last_message, last_time, unread,
  photo_status, other_user, reward
)
values
  (
    '41111111-1111-1111-1111-111111111111',
    '31111111-1111-1111-1111-111111111111',
    '갈색 가죽 지갑',
    'contact',
    '네, 제가 해당 지역 근처에 있습니다.',
    '오후 2:30',
    2,
    'approved',
    '김**',
    30000
  ),
  (
    '42222222-2222-2222-2222-222222222222',
    '32222222-2222-2222-2222-222222222222',
    '에어팟 프로 케이스',
    'contact',
    '사진 열람을 요청했습니다.',
    '오후 1:15',
    0,
    'pending',
    '이**',
    20000
  ),
  (
    '43333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    '버건디 백팩',
    'lost',
    '안녕하세요, 혹시 가방을 보셨나요?',
    '오전 11:00',
    1,
    'locked',
    '박**',
    100000
  )
on conflict (id) do nothing;

insert into chat_messages (id, thread_id, text, sender, time_label, type)
values
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', '안녕하세요. 분실물 근처에 BLE 신호가 감지되어 연락드립니다.', 'other', '오후 2:20', 'text'),
  ('52222222-2222-2222-2222-222222222222', '41111111-1111-1111-1111-111111111111', '혹시 제 지갑을 보셨나요?', 'me', '오후 2:22', 'text'),
  ('53333333-3333-3333-3333-333333333333', '41111111-1111-1111-1111-111111111111', '네, 제가 해당 지역 근처에 있습니다.', 'other', '오후 2:30', 'text'),
  ('54444444-4444-4444-4444-444444444444', '41111111-1111-1111-1111-111111111111', '주인이 사진 열람을 허용했습니다.', 'system', '오후 2:31', 'photoApproved'),
  ('55555555-5555-5555-5555-555555555555', '42222222-2222-2222-2222-222222222222', '안녕하세요! BLE 신호가 감지되어 연락드립니다.', 'other', '오후 1:10', 'text'),
  ('56666666-6666-6666-6666-666666666666', '42222222-2222-2222-2222-222222222222', '제 에어팟 케이스를 보셨나요?', 'me', '오후 1:12', 'text'),
  ('57777777-7777-7777-7777-777777777777', '42222222-2222-2222-2222-222222222222', '사진 열람을 요청했습니다. 주인의 승인을 기다리는 중입니다.', 'system', '오후 1:15', 'photoRequest'),
  ('58888888-8888-8888-8888-888888888888', '43333333-3333-3333-3333-333333333333', '안녕하세요, 혹시 가방을 보셨나요?', 'me', '오전 11:00', 'text')
on conflict (id) do nothing;

insert into safe_zones (id, user_id, name, address, radius_meters)
values
  ('61111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '집', '서울시 강남구 역삼동', 80),
  ('62222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '회사', '서울시 중구 을지로', 120)
on conflict (id) do nothing;

insert into notifications (id, user_id, title, body, time_label, type, is_read)
values
  ('71111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '백팩 연결 끊김 감지', '강남역 2번 출구 부근에서 마지막 BLE 신호가 확인됐습니다.', '10분 전', 'alert', false),
  ('72222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', '사진 승인 완료', '갈색 가죽 지갑 사진을 열람할 수 있습니다.', '1시간 전', 'approval', false),
  ('73333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', '안심 구역 진입', '자동차 키 알림이 일시 중지되었습니다.', '오늘 오전', 'info', true)
on conflict (id) do nothing;

insert into reports (id, thread_id, target_title, reason, created_at_label, status_label)
values
  ('81111111-1111-1111-1111-111111111111', '43333333-3333-3333-3333-333333333333', '버건디 백팩 채팅방', '비매너 응답', '어제', '검토 중')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 찾아줘 서비스 확장용 시드 데이터
-- ---------------------------------------------------------------------------

update users
set
  role = 'admin',
  phone_number = '010-0000-0000',
  profile_bio = '찾아줘 운영 계정입니다.'
where id = '00000000-0000-0000-0000-000000000001';

update users
set
  role = 'user',
  phone_number = '010-1234-5678',
  profile_bio = '분실물과 습득물을 빠르게 연결해 보는 테스트 사용자입니다.'
where id = '11111111-1111-1111-1111-111111111111';

update lost_items
set
  category = '지갑',
  color = '갈색',
  lost_at = now() - interval '20 minutes',
  listing_status = 'matched',
  feature_notes = '카드지갑 형태, 카드 수납칸이 보이는 갈색 가죽 지갑',
  search_keywords = '갈색 가죽 지갑 홍대 카드지갑',
  contact_note = '습득하신 분은 앱 문의로 위치를 남겨 주세요.',
  updated_at = now()
where id = '31111111-1111-1111-1111-111111111111';

update lost_items
set
  category = '전자기기',
  color = '흰색',
  lost_at = now() - interval '1 hour',
  listing_status = 'open',
  feature_notes = '에어팟 프로 충전 케이스, 앞면에 작은 흠집이 있습니다.',
  search_keywords = '에어팟 프로 케이스 흰색 역삼동',
  contact_note = '카페 보관 여부를 앱으로 알려 주세요.',
  updated_at = now()
where id = '32222222-2222-2222-2222-222222222222';

update lost_items
set
  category = '가방',
  color = '버건디',
  lost_at = now() - interval '2 hours',
  listing_status = 'open',
  feature_notes = '노트북과 서류가 들어 있는 버건디 백팩입니다.',
  search_keywords = '버건디 백팩 이태원 노트북',
  contact_note = '발견 시 보관 장소와 시간을 남겨 주세요.',
  updated_at = now()
where id = '33333333-3333-3333-3333-333333333333';

update lost_items
set
  category = '전자기기',
  color = '검정',
  lost_at = now() - interval '30 minutes',
  listing_status = 'matched',
  feature_notes = '검정 케이스가 씌워진 삼성 갤럭시 S24입니다.',
  search_keywords = '갤럭시 S24 검정 케이스 용산',
  contact_note = '화면 보호 필름 여부를 함께 알려 주세요.',
  updated_at = now()
where id = '34444444-4444-4444-4444-444444444444';

insert into found_items (
  id, reporter_user_id, title, category, color, found_location, found_at,
  listing_status, description, feature_notes, storage_note, search_keywords, contact_note
)
values
  (
    '91111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    '갈색 카드지갑 보관 중',
    '지갑',
    '갈색',
    '홍대입구역 8번 출구 인근 편의점',
    now() - interval '15 minutes',
    'matched',
    '갈색 카드지갑을 습득해 편의점 카운터에 맡겨 두었습니다.',
    '가죽 재질이며 카드 수납칸이 보입니다.',
    '편의점 카운터 보관',
    '갈색 지갑 카드지갑 홍대 편의점',
    '앱 문의로 수령 가능 시간을 알려 주세요.'
  ),
  (
    '92222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    '흰색 무선이어폰 케이스',
    '전자기기',
    '흰색',
    '강남구 역삼동 카페 앞',
    now() - interval '45 minutes',
    'matched',
    '흰색 무선이어폰 충전 케이스를 습득했습니다.',
    '뚜껑 안쪽에 작은 스티커 흔적이 있습니다.',
    '카페 직원에게 임시 보관 요청',
    '에어팟 이어폰 케이스 흰색 역삼동',
    '모델명과 특징을 남겨 주시면 확인 후 답변드리겠습니다.'
  ),
  (
    '93333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    '검정 스마트폰',
    '전자기기',
    '검정',
    '용산역 택시 승강장',
    now() - interval '20 minutes',
    'matched',
    '검정 스마트폰 1대를 습득해 보관 중입니다.',
    '검정 케이스와 액정 보호 필름이 붙어 있습니다.',
    '역무실 보관 예정',
    '검정 스마트폰 갤럭시 용산',
    '잠금화면 특징을 함께 알려 주세요.'
  ),
  (
    '94444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000001',
    '남색 노트북 가방',
    '가방',
    '남색',
    '서울역 공항철도 환승 통로',
    now() - interval '3 hours',
    'open',
    '남색 노트북 가방을 분실물센터로 전달하기 전입니다.',
    '앞주머니 지퍼 손잡이에 금속 키링이 있습니다.',
    '보관 장소 이동 예정',
    '남색 가방 노트북 서울역',
    '문의 시 가방 안 물품 특징을 알려 주세요.'
  )
on conflict (id) do nothing;

insert into item_images (
  id, lost_item_id, uploaded_by_user_id, image_url, file_name, mime_type, is_primary
)
values
  (
    'a1111111-1111-1111-1111-111111111111',
    '31111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'assets/images/icon.png',
    'wallet.png',
    'image/png',
    true
  ),
  (
    'a2222222-2222-2222-2222-222222222222',
    '32222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'assets/images/icon.png',
    'airpods.png',
    'image/png',
    true
  ),
  (
    'a3333333-3333-3333-3333-333333333333',
    '34444444-4444-4444-4444-444444444444',
    '11111111-1111-1111-1111-111111111111',
    'assets/images/splash_icon.png',
    'phone.png',
    'image/png',
    true
  )
on conflict (id) do nothing;

insert into item_images (
  id, found_item_id, uploaded_by_user_id, image_url, file_name, mime_type, is_primary
)
values
  (
    'b1111111-1111-1111-1111-111111111111',
    '91111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000001',
    'assets/images/icon.png',
    'found-wallet.png',
    'image/png',
    true
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    '92222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'assets/images/icon.png',
    'found-earbuds.png',
    'image/png',
    true
  ),
  (
    'b3333333-3333-3333-3333-333333333333',
    '93333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000001',
    'assets/images/splash_icon.png',
    'found-phone.png',
    'image/png',
    true
  )
on conflict (id) do nothing;

insert into matches (
  id, lost_item_id, found_item_id, score, match_status, reason_summary, detail_scores
)
values
  (
    'c1111111-1111-1111-1111-111111111111',
    '31111111-1111-1111-1111-111111111111',
    '91111111-1111-1111-1111-111111111111',
    0.94,
    'confirmed',
    '카테고리, 색상, 위치가 거의 일치합니다.',
    '{"category":0.35,"color":0.2,"location":0.2,"time":0.09,"keywords":0.1}'
  ),
  (
    'c2222222-2222-2222-2222-222222222222',
    '32222222-2222-2222-2222-222222222222',
    '92222222-2222-2222-2222-222222222222',
    0.88,
    'suggested',
    '전자기기 / 흰색 / 역삼동 조건이 강하게 일치합니다.',
    '{"category":0.35,"color":0.2,"location":0.16,"time":0.07,"keywords":0.1}'
  ),
  (
    'c3333333-3333-3333-3333-333333333333',
    '34444444-4444-4444-4444-444444444444',
    '93333333-3333-3333-3333-333333333333',
    0.86,
    'reviewing',
    '검정 스마트폰, 위치, 시간대가 유사합니다.',
    '{"category":0.35,"color":0.2,"location":0.14,"time":0.07,"keywords":0.1}'
  )
on conflict (lost_item_id, found_item_id) do update
set
  score = excluded.score,
  match_status = excluded.match_status,
  reason_summary = excluded.reason_summary,
  detail_scores = excluded.detail_scores,
  updated_at = now();

insert into notifications (id, user_id, title, body, time_label, type, is_read)
values
  (
    'd1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    '높은 확률의 매칭이 감지되었습니다',
    '갈색 카드지갑과 유사한 습득물이 홍대입구역 인근에 등록되었습니다.',
    '방금 전',
    'info',
    false
  ),
  (
    'd2222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    '운영팀 확인 요청',
    '검정 스마트폰 습득물에 대해 추가 특징을 확인해 주세요.',
    '10분 전',
    'report',
    false
  )
on conflict (id) do nothing;

insert into inquiries (
  id, user_id, category, title, body, status, related_item_type, related_item_id
)
values
  (
    'e1111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'support',
    '에어팟 케이스 보관 위치 문의',
    '역삼동 카페 쪽 습득물이 아직 보관 중인지 확인 부탁드립니다.',
    'reviewing',
    'lost',
    '32222222-2222-2222-2222-222222222222'
  ),
  (
    'e2222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000001',
    'moderation',
    '허위 제보 점검',
    '중복 등록된 습득물 여부를 검토 중입니다.',
    'open',
    'found',
    '94444444-4444-4444-4444-444444444444'
  )
on conflict (id) do nothing;

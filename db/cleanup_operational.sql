-- ---------------------------------------------------------------------------
-- 운영 데이터 정리 스크립트
-- 실서버 점검/라이브 테스트 중 생성된 임시 계정과 테스트 흔적을 제거하고,
-- 관리자 계정 메타데이터를 운영 기본값으로 복구한다.
-- ---------------------------------------------------------------------------

-- 1. 자동 테스트가 남긴 신고/메시지 흔적 정리
delete from reports
where reason like '플러터 실연동 신고 %';

delete from chat_messages
where text like '플러터 실연동 메시지 %';

-- 2. 임시 사용자가 참여한 채팅방을 먼저 제거해 복수 FK 연쇄 삭제 충돌을 막는다.
delete from chat_threads
where requester_user_id in (
  select id
  from users
  where email like 'live\_%@example.com' escape '\'
     or email like 'live.action.%@example.com'
     or email like 'live.action.updated.%@example.com'
     or email like 'compat.%@example.com'
     or email like 'rt-%@roundtrip.findapp.local'
     or email like 'ble-%@test.local'
     or email like 'safe-zone-%@test.local'
)
or item_id in (
  select lost_items.id
  from lost_items
  inner join users on users.id = lost_items.owner_user_id
  where users.email like 'live\_%@example.com' escape '\'
     or users.email like 'live.action.%@example.com'
     or users.email like 'live.action.updated.%@example.com'
     or users.email like 'compat.%@example.com'
     or users.email like 'rt-%@roundtrip.findapp.local'
     or users.email like 'ble-%@test.local'
     or users.email like 'safe-zone-%@test.local'
);

-- 3. 라이브 API 테스트용 임시 사용자 정리
-- users 삭제 시 alert_settings, ble_devices, safe_zones, lost_items, found_items,
-- notifications, inquiries는 FK cascade로 함께 정리된다.
delete from users
where email like 'live\_%@example.com' escape '\'
   or email like 'live.action.%@example.com'
   or email like 'live.action.updated.%@example.com'
   or email like 'compat.%@example.com'
   or email like 'rt-%@roundtrip.findapp.local'
   or email like 'ble-%@test.local'
   or email like 'safe-zone-%@test.local';

-- 4. 임시 사용자 삭제 후에도 남을 수 있는 테스트 게시글 보조 정리
delete from lost_items
where title in ('통합테스트 분실 지갑', '호환 테스트 지갑');

-- 5. 관리자/기본 계정 메타데이터 복구
update users
set
  role = 'admin',
  phone_number = '010-0000-0000',
  profile_bio = '찾아줘 운영 계정입니다.',
  public_name = '관리자',
  updated_at = now()
where login_id = 'admin';

update users
set
  role = coalesce(role, 'user'),
  updated_at = now()
where login_id <> 'admin';

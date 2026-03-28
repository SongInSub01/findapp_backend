# PostgreSQL 스키마 메모

- `schema.sql`은 운영 기준 단일 초기 스키마입니다.
- `seed.sql`은 로컬/스테이징 점검용 기본 계정과 예시 데이터를 넣습니다.

핵심 테이블:

- `users`: 로그인/프로필
- `alert_settings`, `safe_zones`, `ble_devices`: BLE 추적과 개인 설정
- `lost_items`, `found_items`, `item_images`: 분실물/습득물 게시글
- `matches`: 자동 매칭 결과
- `chat_threads`, `chat_messages`: 문의/연락 대화
- `notifications`, `reports`, `inquiries`: 운영/사용자 활동 기록

수정 원칙:

- Flutter 폼 입력과 실제 컬럼 매핑은 항상 함께 확인합니다.
- 검색 조건이 늘어나면 먼저 인덱스와 `finder_listing_data.ts`를 같이 검토합니다.
- 상태값은 스키마 check constraint, 서비스 검증, Flutter enum을 함께 맞춰야 합니다.

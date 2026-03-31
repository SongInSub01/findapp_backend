# 찾아줘 Next.js Backend

Flutter 앱 `찾아줘`를 위한 Next.js + PostgreSQL 백엔드입니다.

## 포함 내용

- `app/api/v1/bootstrap`: Flutter 앱 첫 로딩용 통합 데이터
- `app/api/v1/health`: DB 연결 상태 확인
- `app/api/v1/auth/register`: 회원가입 후 DB 저장
- `app/api/v1/auth/login`: 로그인 비밀번호 검증
- `app/api/v1/devices`: BLE 기기 조회/등록
- `app/api/v1/lost-items`: 분실물 조회/등록
- `app/api/v1/chat-threads`: 채팅 스레드/메시지 조회
- `app/api/v1/settings`: 안전지대, 알림 설정, 알림/신고 조회

## 시작

1. `.env.example`을 복사해 `.env.local` 생성
2. `DATABASE_URL`에 PostgreSQL 접속 문자열 입력
3. `npm install`
4. `npm run db:setup`
5. `npm run db:seed`
6. `npm run db:check`
7. `npm run dev`

운영 서버에 남은 테스트 계정/분실물/신고 흔적을 정리해야 할 때는
`npm run db:cleanup:ops`를 실행하면 됩니다.

## 서버 배포

서버에 PostgreSQL이 아직 없다면 `deploy/install-postgres.sh`로 설치/DB 생성 후
`deploy/setup-env.sh`로 `.env.production`을 생성할 수 있습니다.

자세한 순서는 [deploy/server-checklist.md](/Users/insub/Documents/findapp/findapp_backend/deploy/server-checklist.md)에 정리했습니다.
서버 배포 폴더를 초기화해야 할 때는 [deploy/reset-server-checklist.md](/Users/insub/Documents/findapp/findapp_backend/deploy/reset-server-checklist.md)를 사용하면 됩니다.

## 스키마

`db/schema.sql`에 Flutter 앱 모델과 맞춘 테이블이 정의되어 있습니다.
회원 테이블에는 `user_name`, `login_id`, `password_hash`, `last_login_at`, `is_active`가 포함되어 있습니다.

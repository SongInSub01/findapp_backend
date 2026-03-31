# 서버 배포 체크리스트

## 1. 앱 업로드

```bash
mkdir -p /srv/app/findapp_backend
```

로컬에서 아래처럼 복사:

```bash
scp -r /path/to/findapp_backend/* root@SERVER_IP:/srv/app/findapp_backend/
```

## 2. Node 의존성 설치

```bash
cd /srv/app/findapp_backend
npm install
```

## 3. PostgreSQL 설치 및 DB 생성

```bash
chmod +x deploy/install-postgres.sh
./deploy/install-postgres.sh findapp findapp_user strong_password_here
```

## 4. 환경변수 작성

```bash
chmod +x deploy/setup-env.sh
./deploy/setup-env.sh /srv/app/findapp_backend postgresql://findapp_user:strong_password_here@127.0.0.1:5432/findapp
```

## 5. 스키마와 시드

```bash
npm run db:setup
npm run db:check
```

운영 서버에서는 `npm run db:seed`를 실행하지 않는 것을 권장합니다.
기존 사용자/운영 데이터를 덮어쓸 수 있으므로 초기 개발 서버나 빈 테스트 DB에서만 사용합니다.

## 6. 빌드 및 실행

```bash
npm run build
npm run start
```

## 7. systemd 등록

```bash
cp deploy/findapp-backend.service /etc/systemd/system/findapp-backend.service
systemctl daemon-reload
systemctl enable findapp-backend
systemctl restart findapp-backend
systemctl status findapp-backend
```

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

`npm run db:seed`는 운영 DB 전용입니다.
`NODE_ENV=production`과 `DB_SEED_SCOPE=operational`이 있는 운영 배포 환경에서만 실행하세요.

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

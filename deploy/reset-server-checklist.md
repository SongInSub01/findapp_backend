# 서버 정리 체크리스트

프론트/백엔드 앱 코드를 다시 올리기 전에 서버 배포 폴더를 비우고 상태를 확인할 때 사용합니다.
DB와 systemd 설정은 유지하고, 앱 폴더만 정리합니다.

## 1. 스크립트 업로드

로컬에서 서버로 복사:

```bash
scp deploy/reset-server-apps.sh root@SERVER_IP:/tmp/reset-server-apps.sh
```

## 2. 실행 권한 부여

```bash
chmod +x /tmp/reset-server-apps.sh
```

## 3. 백엔드만 정리

```bash
/tmp/reset-server-apps.sh /srv/app/findapp_backend
```

## 4. 프론트까지 같이 정리

프론트 배포 폴더 이름에 맞춰 같이 넣습니다.

예시:

```bash
/tmp/reset-server-apps.sh /srv/app/findapp_backend /srv/app/findapp_frontend
```

또는:

```bash
/tmp/reset-server-apps.sh /srv/app/findapp_backend /srv/app/my_flutter_starter
```

## 5. 정리 후 확인

```bash
ls -la /srv/app/findapp_backend
ls -la /srv/app/findapp_frontend
find /srv/app/_cleanup_backup -maxdepth 2 -type d | sort | tail -20
```

정상이라면 앱 폴더는 비어 있거나 `.` / `..` 정도만 보이고,
이전 env 파일과 업로드 파일은 `/srv/app/_cleanup_backup/<timestamp>/...` 아래에 남아 있습니다.

## 6. 재배포 후 확인

```bash
systemctl restart findapp-backend
systemctl status findapp-backend --no-pager -l
curl -i http://127.0.0.1:3000/api/v1/health
```

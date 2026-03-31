#!/usr/bin/env bash
set -euo pipefail

# 서버 배포 폴더를 다시 올리기 좋은 상태로 정리한다.
# 앱 코드는 제거하되, 운영에 필요한 env 파일과 업로드 파일은 타임스탬프 백업으로 보존한다.

BASE_DIR="${BASE_DIR:-/srv/app}"
BACKUP_ROOT="${BACKUP_ROOT:-${BASE_DIR}/_cleanup_backup}"

if [[ "${1:-}" == "--help" ]]; then
  cat <<'EOF'
Usage:
  ./deploy/reset-server-apps.sh [APP_DIR ...]

Examples:
  ./deploy/reset-server-apps.sh
  ./deploy/reset-server-apps.sh /srv/app/findapp_backend
  ./deploy/reset-server-apps.sh /srv/app/findapp_backend /srv/app/findapp_frontend

Behavior:
  - Each app directory is deleted and recreated empty.
  - If present, .env.production, .env.local, public/uploads are copied to a timestamped backup.
  - Database and systemd settings are not touched.
EOF
  exit 0
fi

if [[ "$#" -eq 0 ]]; then
  set -- "${BASE_DIR}/findapp_backend"
fi

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RUN_BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

mkdir -p "${RUN_BACKUP_DIR}"

echo "[cleanup] backup root: ${RUN_BACKUP_DIR}"

for APP_DIR in "$@"; do
  APP_NAME="$(basename "${APP_DIR}")"
  echo
  echo "[cleanup] target: ${APP_DIR}"

  if [[ ! -e "${APP_DIR}" ]]; then
    echo "[cleanup] skip: directory does not exist"
    continue
  fi

  APP_BACKUP_DIR="${RUN_BACKUP_DIR}/${APP_NAME}"
  mkdir -p "${APP_BACKUP_DIR}"

  for ENV_FILE in ".env.production" ".env.local"; do
    if [[ -f "${APP_DIR}/${ENV_FILE}" ]]; then
      cp "${APP_DIR}/${ENV_FILE}" "${APP_BACKUP_DIR}/${ENV_FILE}"
      echo "[cleanup] preserved ${ENV_FILE}"
    fi
  done

  if [[ -d "${APP_DIR}/public/uploads" ]]; then
    mkdir -p "${APP_BACKUP_DIR}/public"
    cp -r "${APP_DIR}/public/uploads" "${APP_BACKUP_DIR}/public/uploads"
    echo "[cleanup] preserved public/uploads"
  fi

  rm -rf "${APP_DIR}"
  mkdir -p "${APP_DIR}"
  echo "[cleanup] recreated empty directory"
done

echo
echo "[cleanup] remaining app directories under ${BASE_DIR}:"
find "${BASE_DIR}" -maxdepth 1 -mindepth 1 -type d | sort

echo
echo "[cleanup] verification:"
for APP_DIR in "$@"; do
  echo "  - ${APP_DIR}"
  ls -la "${APP_DIR}"
done

echo
echo "[cleanup] done"

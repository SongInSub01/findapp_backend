#!/usr/bin/env bash
set -euo pipefail

# 기존 서버의 프론트/백엔드 앱 폴더를 정리한다.
# 기본적으로 env 및 업로드 파일은 타임스탬프 백업 후 삭제한다.

BASE_DIR="${BASE_DIR:-/srv/app}"
BACKUP_ROOT="${BACKUP_ROOT:-${BASE_DIR}/_cleanup_backup}"
NO_BACKUP=0

usage() {
  cat <<'EOF'
Usage:
  ./deploy/remove-old-front-back.sh [--no-backup] [APP_DIR ...]

Examples:
  ./deploy/remove-old-front-back.sh
  ./deploy/remove-old-front-back.sh /srv/app/findapp_backend /srv/app/findapp_frontend
  ./deploy/remove-old-front-back.sh --no-backup /srv/app/findapp_backend /srv/app/my_flutter_starter

Behavior:
  - Default targets: /srv/app/findapp_backend, /srv/app/findapp_frontend
  - For each target directory:
    1) .env, .env.production, .env.local, .env.development, public/uploads 를 백업(기본값)
    2) 디렉터리 삭제 후 빈 디렉터리 재생성
EOF
}

while [[ "$#" -gt 0 ]]; do
  case "${1}" in
    --help|-h)
      usage
      exit 0
      ;;
    --no-backup)
      NO_BACKUP=1
      shift
      ;;
    *)
      break
      ;;
  esac
done

if [[ "$#" -eq 0 ]]; then
  set -- "${BASE_DIR}/findapp_backend" "${BASE_DIR}/findapp_frontend"
fi

for APP_DIR in "$@"; do
  if [[ -z "${APP_DIR}" || "${APP_DIR}" == "/" ]]; then
    echo "[error] invalid app path: '${APP_DIR}'"
    exit 1
  fi

  case "${APP_DIR}" in
    "${BASE_DIR}"/*) ;;
    *)
      echo "[error] '${APP_DIR}' is outside BASE_DIR '${BASE_DIR}'"
      echo "[error] set BASE_DIR correctly or pass paths under BASE_DIR"
      exit 1
      ;;
  esac
done

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
RUN_BACKUP_DIR="${BACKUP_ROOT}/${TIMESTAMP}"

if [[ "${NO_BACKUP}" -eq 0 ]]; then
  mkdir -p "${RUN_BACKUP_DIR}"
  echo "[cleanup] backup root: ${RUN_BACKUP_DIR}"
else
  echo "[cleanup] backup skipped (--no-backup)"
fi

for APP_DIR in "$@"; do
  APP_NAME="$(basename "${APP_DIR}")"
  echo
  echo "[cleanup] target: ${APP_DIR}"

  if [[ ! -e "${APP_DIR}" ]]; then
    echo "[cleanup] skip: directory does not exist"
    mkdir -p "${APP_DIR}"
    echo "[cleanup] created empty directory"
    continue
  fi

  if [[ "${NO_BACKUP}" -eq 0 ]]; then
    APP_BACKUP_DIR="${RUN_BACKUP_DIR}/${APP_NAME}"
    mkdir -p "${APP_BACKUP_DIR}"

    for ENV_FILE in ".env" ".env.production" ".env.local" ".env.development"; do
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
  fi

  rm -rf "${APP_DIR}"
  mkdir -p "${APP_DIR}"
  echo "[cleanup] recreated empty directory"
done

echo
echo "[cleanup] verification:"
for APP_DIR in "$@"; do
  echo "  - ${APP_DIR}"
  ls -la "${APP_DIR}"
done

echo
echo "[cleanup] done"

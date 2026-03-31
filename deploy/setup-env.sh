#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${1:-/srv/app/findapp_backend}"
DATABASE_URL="${2:-}"

if [[ -z "${DATABASE_URL}" ]]; then
  echo "Usage: $0 <app_dir> <database_url>"
  exit 1
fi

cat > "${APP_DIR}/.env.production" <<EOF
DATABASE_URL=${DATABASE_URL}
PORT=3000
APP_NAME="찾아줘 API"
DEFAULT_PROFILE_IMAGE_PATH=assets/images/icon.png
EOF

echo ".env.production written to ${APP_DIR}"
